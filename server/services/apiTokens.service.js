const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const definitions = [
  { key: 'THEGAMESDB_API_KEY', name: 'TheGamesDB', description: 'کاور جعبهٔ بازی‌ها', token_url: 'https://api.thegamesdb.net/key.php', token_hint: 'پس از ثبت‌نام و ورود، درخواست دسترسی API بدهید.' },
  { key: 'GAMEBRAIN_API_KEY', name: 'GameBrain', description: 'جست‌وجو و اطلاعات بازی‌ها', token_url: 'https://gamebrain.co/api/console', token_hint: 'در کنسول API وارد حساب شوید و Get API Key را انتخاب کنید.' },
  { key: 'PSN_NPSSO', name: 'PlayStation NPSSO', description: 'تروفی‌های PlayStation', token_url: 'https://ca.account.sony.com/api/v1/ssocookie', login_url: 'https://store.playstation.com/', token_hint: 'ابتدا وارد حساب PlayStation شوید؛ سپس در همان مرورگر لینک دریافت توکن را باز و مقدار npsso را کپی کنید.' },
  { key: 'PLATPRICES_API_KEY', name: 'PlatPrices', description: 'اطلاعات و تروفی‌های PlayStation', token_url: 'https://platprices.com/api-request', token_hint: 'فرم درخواست دسترسی API را با مشخصات پروژه تکمیل کنید.' },
  { key: 'OPENXBL_API_KEY', name: 'OpenXBL', description: 'اچیومنت‌های Xbox', token_url: 'https://xbl.io/', token_hint: 'ثبت‌نام کنید؛ کلید API در داشبورد حساب قرار دارد.' },
];
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const arvanFields = {
  ARVAN_S3_ENDPOINT: 'آدرس S3',
  ARVAN_S3_BUCKET: 'نام باکت',
  ARVAN_PUBLIC_BASE_URL: 'آدرس عمومی فایل‌ها',
  ARVAN_S3_REGION: 'منطقه S3',
  ARVAN_S3_ACCESS_KEY: 'Access Key ID',
  ARVAN_S3_SECRET_KEY: 'Secret Access Key',
};
const isSecret = key => key.endsWith('_KEY');
function createService(file = path.join(__dirname, '../.env'), env = process.env, probe = require('./apiTokenHealth.service').probe) {
  let queue = Promise.resolve();
  const checks = new Map(), pending = new Map();
  const fingerprint = value => crypto.createHash('sha256').update(value).digest('hex');
  const status = () => definitions.map(row => {
    const value = env[row.key]?.trim() || '';
    const entry = checks.get(row.key);
    const current = value && entry?.fingerprint === fingerprint(value) ? entry : null;
    return { ...row, configured: Boolean(value), health: value ? current?.health || 'unverified' : 'missing', checked_at: current?.checked_at || null };
  });
  async function check() {
    await Promise.all(definitions.map(async ({ key }) => {
      const value = env[key]?.trim(); if (!value) return;
      const hash = fingerprint(value), cacheKey = `${key}:${hash}`;
      const entry = checks.get(key);
      if (entry?.fingerprint === hash && entry.expires > Date.now()) return;
      if (pending.has(cacheKey)) return pending.get(cacheKey);
      const promise = (async () => {
        let health; try { health = await probe(key, value); } catch { health = 'unavailable'; }
        if ((env[key]?.trim() || '') === value) checks.set(key, { fingerprint: hash, health, checked_at: new Date().toISOString(), expires: Date.now() + (health === 'unavailable' ? 60000 : 5 * 60000) });
      })();
      pending.set(cacheKey, promise);
      try { await promise; } finally { pending.delete(cacheKey); }
    }));
    return status();
  }
  function update(input) {
    if (!input || !definitions.some(row => row.key === input.key)) return Promise.reject(fail('سرویس انتخاب‌شده معتبر نیست.'));
    const { key } = input;
    if (typeof input.value !== 'string' || !/^[a-zA-Z0-9._~+/:=-]{1,8192}$/.test(input.value.trim())) return Promise.reject(fail('توکن معتبر وارد کنید؛ فاصله یا خط جدید مجاز نیست.'));
    return write({ [key]: input.value.trim() }).then(status);
  }
  const arvanStatus = () => Object.keys(arvanFields).map(key => ({
    key, label: arvanFields[key], secret: isSecret(key), configured: Boolean(env[key]?.trim()),
    ...(!isSecret(key) && { value: env[key]?.trim() || (key === 'ARVAN_S3_REGION' ? 'us-east-1' : '') }),
  }));
  function updateArvan(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('تنظیمات آروان معتبر نیست.');
    const values = {};
    for (const [key, label] of Object.entries(arvanFields)) {
      const submitted = input[key];
      if (submitted !== undefined && typeof submitted !== 'string') throw fail(`${label} معتبر نیست.`);
      if (isSecret(key) && !submitted?.trim() && env[key]?.trim()) continue;
      const value = submitted?.trim() || '';
      let valid = /^[a-zA-Z0-9._~+/:=-]{1,512}$/.test(value);
      if (key === 'ARVAN_S3_BUCKET') valid = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value);
      if (key === 'ARVAN_S3_REGION') valid = /^[a-z0-9-]{1,64}$/.test(value);
      if (key === 'ARVAN_S3_ENDPOINT' || key === 'ARVAN_PUBLIC_BASE_URL') {
        try {
          const url = new URL(value);
          valid &&= url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
          if (key === 'ARVAN_S3_ENDPOINT') valid &&= /\.arvanstorage\.(ir|com)$/.test(url.hostname) && !url.port && url.pathname === '/';
        } catch { valid = false; }
      }
      if (!valid) throw fail(`${label} را به‌درستی وارد کنید.`);
      values[key] = value;
    }
    return write(values).then(arvanStatus);
  }
  function write(values) {
    const operation = queue.then(async () => {
      let original;
      try { original = await fs.readFile(file, 'utf8'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; original = ''; }
      const newline = original.includes('\r\n') ? '\r\n' : '\n';
      let lines = original.split(/\r?\n/);
      for (const [key, value] of Object.entries(values)) {
        const pattern = new RegExp(`^(?:export\\s+)?${key}\\s*=`);
        let found = false;
        lines = lines.flatMap(line => {
          if (!pattern.test(line.trimStart())) return [line];
          if (found) return [];
          found = true; return [`${key}=${value}`];
        });
        if (!found) { if (lines.at(-1) === '') lines.pop(); lines.push(`${key}=${value}`, ''); }
      }
      const temporary = `${file}.${crypto.randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, lines.join(newline), { mode: 0o600, flag: 'wx' });
        await fs.rename(temporary, file);
      } finally { await fs.unlink(temporary).catch(() => {}); }
      Object.assign(env, values);
      for (const key of Object.keys(values)) checks.delete(key);
    }).catch(error => { if (error.status) throw error; throw fail('ذخیرهٔ توکن در تنظیمات سرور ناموفق بود.', 500); });
    queue = operation.catch(() => {});
    return operation;
  }
  return { status, update, check, arvanStatus, updateArvan };
}
module.exports = { ...createService(), createService };
