const https = require('https');
const dns = require('dns/promises');
const net = require('net');
const fail = message => Object.assign(new Error(message), { status: 400 });
const blocked = new net.BlockList();
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['198.18.0.0',15],['224.0.0.0',3]]) blocked.addSubnet(ip, prefix, 'ipv4');
function publicAddress(address) {
  const family = net.isIP(address);
  return family === 4 ? !blocked.check(address, 'ipv4') : family === 6 && /^[23][a-f0-9]{3}:/i.test(address) && !/^2001:db8:/i.test(address);
}
const videoTypes = new Map([
  ['mp4', 'video/mp4'], ['m4v', 'video/mp4'], ['webm', 'video/webm'],
  ['ogg', 'video/ogg'], ['ogv', 'video/ogg'], ['mov', 'video/quicktime'],
]);
const videoMimeTypes = new Set(videoTypes.values());
const videoPageHost = /(?:^|\.)(?:youtube\.com|youtu\.be|youtube-nocookie\.com|twitch\.tv)$/i;

async function downloadMedia(value, redirects, maxBytes, video) {
  const label = video ? 'ویدئو' : 'تصویر';
  let url;
  try { url = new URL(value); } catch { throw fail(`نشانی ${label} معتبر نیست.`); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw fail(`نشانی ${label} باید HTTPS عمومی باشد.`);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (video && videoPageHost.test(host.replace(/\.$/, ''))) throw fail('نشانی مستقیم فایل ویدئو لازم است.');
  const addresses = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await dns.lookup(host, { all: true });
  if (!addresses.length || addresses.some(row => !publicAddress(row.address))) throw fail(`دسترسی به این منبع ${label} مجاز نیست.`);
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const request = https.get(url, { agent: false, lookup: (_host, options, callback) => options.all ? callback(null, [address]) : callback(null, address.address, address.family), headers: { Accept: video ? 'video/*, application/octet-stream' : 'image/*', 'User-Agent': 'Technosara-Media' } }, response => {
      response.on('error', reject);
      if ([301,302,303,307,308].includes(response.statusCode)) {
        response.resume();
        if (redirects >= 3 || !response.headers.location) return reject(fail(`تغییر مسیر منبع ${label} معتبر نیست.`));
        let next;
        try { next = new URL(response.headers.location, url); } catch { return reject(fail(`تغییر مسیر منبع ${label} معتبر نیست.`)); }
        return downloadMedia(next, redirects + 1, maxBytes, video).then(resolve, reject);
      }
      let mimetype = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (video && ['application/octet-stream', 'video/x-m4v'].includes(mimetype)) {
        mimetype = videoTypes.get(url.pathname.split('.').at(-1).toLowerCase());
      }
      const supported = video ? videoMimeTypes.has(mimetype) : mimetype?.startsWith('image/');
      if (response.statusCode !== 200 || !supported) { response.resume(); return reject(fail(`فایل ${label} از منبع دریافت نشد.`)); }
      const sizeError = () => fail(`حجم ${label} بیشتر از ${(maxBytes / (1024 * 1024)).toLocaleString('fa-IR')} مگابایت است.`);
      if (Number(response.headers['content-length']) > maxBytes) { request.destroy(sizeError()); return; }
      const chunks = []; let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > maxBytes) {
          request.destroy(sizeError());
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), mimetype }));
    });
    const timer = setTimeout(() => request.destroy(fail(`دریافت ${label} بیش از حد طول کشید.`)), video ? 90000 : 25000);
    request.on('close', () => clearTimeout(timer));
    request.on('error', reject);
  });
}
const download = (value, redirects = 0, maxBytes = 5 * 1024 * 1024) => downloadMedia(value, redirects, maxBytes, false);
const downloadVideo = value => downloadMedia(value, 0, 100 * 1024 * 1024, true);
module.exports = { download, downloadVideo, publicAddress };
