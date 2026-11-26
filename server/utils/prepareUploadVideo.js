const { execFile } = require('node:child_process');
const { mkdtemp, readFile, rmdir, unlink, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { promisify } = require('node:util');
const { path: ffmpeg } = require('@ffmpeg-installer/ffmpeg');
const sharp = require('sharp');

const run = promisify(execFile);

module.exports = async function prepareUploadVideo(buffer, settings) {
  const folder = await mkdtemp(join(tmpdir(), 'technosara-video-'));
  const input = join(folder, 'input');
  const output = join(folder, 'video.mp4');
  const frame = join(folder, 'frame.png');
  const options = { timeout: 180000, windowsHide: true };
  const base = ['-nostdin', '-loglevel', 'error', '-protocol_whitelist', 'file'];
  try {
    await writeFile(input, buffer);
    const max = settings.maxDimension;
    const crf = Math.round(40 - settings.videoQuality * 0.25);
    await run(ffmpeg, [...base, '-i', input, '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', `scale=w='min(${max},iw)':h='min(${max},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', String(crf),
      '-c:a', 'aac', '-movflags', '+faststart', output], options);
    await run(ffmpeg, [...base, '-i', output, '-frames:v', '1', frame], options);
    let preview = sharp(frame).resize(settings.previewSize, settings.previewSize, { fit: 'cover' });
    if (settings.blur) preview = preview.blur(settings.blur);
    return { video: await readFile(output), preview: await preview.webp({ quality: settings.previewQuality }).toBuffer() };
  } catch {
    throw Object.assign(new Error('فشرده‌سازی ویدئو یا ساخت پیش‌نمایش ناموفق بود.'), { status: 422 });
  } finally {
    await Promise.allSettled([input, output, frame].map(file => unlink(file)));
    await rmdir(folder).catch(() => {});
  }
};
