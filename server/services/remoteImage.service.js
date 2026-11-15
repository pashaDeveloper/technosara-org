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
async function download(value, redirects = 0) {
  let url;
  try { url = new URL(value); } catch { throw fail('نشانی تصویر معتبر نیست.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw fail('نشانی تصویر باید HTTPS عمومی باشد.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await dns.lookup(host, { all: true });
  if (!addresses.length || addresses.some(row => !publicAddress(row.address))) throw fail('دسترسی به این منبع تصویر مجاز نیست.');
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const request = https.get(url, { agent: false, lookup: (_host, options, callback) => options.all ? callback(null, [address]) : callback(null, address.address, address.family), headers: { Accept: 'image/*', 'User-Agent': 'Technosara-Media' } }, response => {
      if ([301,302,303,307,308].includes(response.statusCode)) {
        response.resume();
        if (redirects >= 3 || !response.headers.location) return reject(fail('تغییر مسیر منبع تصویر معتبر نیست.'));
        return download(new URL(response.headers.location, url).href, redirects + 1).then(resolve, reject);
      }
      const mimetype = String(response.headers['content-type'] || '').split(';')[0];
      if (response.statusCode !== 200 || !mimetype.startsWith('image/')) { response.resume(); return reject(fail('فایل تصویر از منبع دریافت نشد.')); }
      const chunks = []; let length = 0;
      response.on('data', chunk => { length += chunk.length; if (length > 5 * 1024 * 1024) { request.destroy(fail('حجم تصویر بیشتر از ۵ مگابایت است.')); return; } chunks.push(chunk); });
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), mimetype }));
      response.on('error', reject);
    });
    const timer = setTimeout(() => request.destroy(fail('دریافت تصویر بیش از حد طول کشید.')), 25000);
    request.on('close', () => clearTimeout(timer));
    request.on('error', reject);
  });
}
module.exports = { download, publicAddress };
