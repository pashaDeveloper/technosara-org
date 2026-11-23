const { execFile } = require('node:child_process');
const { mkdtemp, readFile, rm, stat, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { promisify } = require('node:util');

const maxBytes = 100 * 1024 * 1024;
const fail = (message, status = 422) => Object.assign(new Error(message), { status });
const steamHosts = new Set(['video.akamai.steamstatic.com', 'video.fastly.steamstatic.com', 'video.cloudflare.steamstatic.com']);

function steamStreamUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.port && !url.username && !url.password &&
        steamHosts.has(url.hostname) &&
        /^\/store_trailers\/\d+\/\d+\/[a-f0-9]+\/\d+\/hls_264_master\.m3u8$/i.test(url.pathname)) return url;
  } catch {}
  return null;
}

async function downloadSteamVideo(value, fetcher = fetch) {
  const masterUrl = steamStreamUrl(value);
  if (!masterUrl) throw fail('Unsupported Steam video URL', 400);
  const signal = AbortSignal.timeout(90000);
  let total = 0;
  async function read(url, limit) {
    const response = await fetcher(url, { redirect: 'error', signal });
    if (!response.ok || !response.body) throw fail('Steam video download failed', 502);
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      total += chunk.length;
      if (size > limit || total > maxBytes) throw fail('Video exceeds 100 MB');
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  const master = (await read(masterUrl, 128 * 1024)).toString('utf8');
  const audio = master.match(/^#EXT-X-MEDIA:TYPE=AUDIO,.*URI="(hls_264_\d+_audio\.m3u8)"/m)?.[1];
  const variants = [...master.matchAll(/^#EXT-X-STREAM-INF:.*RESOLUTION=\d+x(\d+)[^\r\n]*\r?\n(hls_264_\d+_video\.m3u8)$/gm)];
  const video = variants.sort((a, b) => Math.abs(+a[1] - 480) - Math.abs(+b[1] - 480))[0]?.[2];
  if (!master.startsWith('#EXTM3U') || !video || !audio) throw fail('Unsupported Steam playlist');

  async function track(name) {
    const playlist = (await read(new URL(name, masterUrl), 128 * 1024)).toString('utf8');
    const init = playlist.match(/^#EXT-X-MAP:URI="(dash_h264\/init-stream\d+\.m4s)"\s*$/m)?.[1];
    const segments = playlist.split(/\r?\n/).filter(line => line && !line.startsWith('#'));
    if (!playlist.includes('#EXT-X-ENDLIST') || !init || !segments.length || segments.length > 300 ||
        segments.some(segment => !/^dash_h264\/chunk-stream\d+-\d+\.m4s$/.test(segment))) {
      throw fail('Unsupported Steam video segments');
    }
    return [init, ...segments];
  }

  const tracks = await Promise.all([track(video), track(audio)]);
  const parts = new Map();
  const segments = [...new Set(tracks.flat())];
  let next = 0;
  let error;
  await Promise.all(Array.from({ length: Math.min(6, segments.length) }, async () => {
    while (!error && next < segments.length) {
      const path = segments[next++];
      try { parts.set(path, await read(new URL(path, masterUrl), 8 * 1024 * 1024)); }
      catch (failure) { error ||= failure; }
    }
  }));
  if (error) throw error;

  const folder = await mkdtemp(join(tmpdir(), 'nab-steam-video-'));
  try {
    const videoFile = join(folder, 'video.mp4');
    const audioFile = join(folder, 'audio.mp4');
    const output = join(folder, 'output.mp4');
    await writeFile(videoFile, tracks[0].map(path => parts.get(path)));
    await writeFile(audioFile, tracks[1].map(path => parts.get(path)));
    const { path: ffmpeg } = require('@ffmpeg-installer/ffmpeg');
    await promisify(execFile)(ffmpeg, ['-nostdin', '-loglevel', 'error',
      '-protocol_whitelist', 'file', '-i', videoFile, '-protocol_whitelist', 'file', '-i', audioFile,
      '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', output],
      { timeout: 30000, windowsHide: true });
    if ((await stat(output)).size > maxBytes) throw fail('Video exceeds 100 MB');
    return { buffer: await readFile(output), mimetype: 'video/mp4' };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

module.exports = { steamStreamUrl, downloadSteamVideo };
