export function steamFormLinks(...fields) {
  const links = new Set();
  for (let rows of fields) {
    try { if (typeof rows === 'string') rows = JSON.parse(rows || '[]'); } catch { continue; }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      try {
        const url = new URL(row?.url);
        const id = url.pathname.match(/^\/app\/([1-9]\d{0,9})(?:\/|$)/)?.[1];
        if (url.protocol === 'https:' && ['store.steampowered.com', 'www.store.steampowered.com'].includes(url.hostname) && id) links.add(`https://store.steampowered.com/app/${id}`);
      } catch { /* Ignore incomplete URLs while editing. */ }
    }
  }
  return [...links].sort();
}

export const dlcKey = item => item.key || `${item.provider || 'steam'}:${item.app_id}`;
export function consoleFormSource(title, ...fields) {
  const links = new Set();
  const preferred = new Set();
  for (let [index, rows] of fields.entries()) {
    try { if (typeof rows === 'string') rows = JSON.parse(rows || '[]'); } catch { continue; }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      try {
        const u = new URL(row?.url);
        if (u.protocol !== 'https:' || u.username || u.password || u.port) continue;
        const provider = ['xbox.com', 'www.xbox.com'].includes(u.hostname) ? 'xbox' : u.hostname === 'store.playstation.com' ? 'sony' : '';
        if (index > 0 && preferred.has(provider)) continue;
        const before = links.size;
        const xboxId = u.pathname.split('/').filter(Boolean).at(-1)?.toUpperCase();
        if (['xbox.com', 'www.xbox.com'].includes(u.hostname) && /^[A-Z0-9]{12}$/.test(xboxId)) links.add(`https://www.xbox.com/en-US/games/store/game/${xboxId}`);
        const sony = u.pathname.match(/^\/[a-z]{2}-[a-z]{2}\/(concept\/\d{1,15}|product\/[A-Z0-9_-]{10,80})\/?$/i);
        if (u.hostname === 'store.playstation.com' && sony) links.add(`https://store.playstation.com/${u.pathname.split('/')[1].toLowerCase()}/${sony[1]}`);
        if (index === 0 && provider && links.size > before) preferred.add(provider);
      } catch { /* URL is still being edited. */ }
    }
  }
  const name = typeof title === 'string' ? title.trim() : '';
  if (!links.size && name.length < 2) return null;
  return { title: name, official_stores: [...links].sort().map(url => ({ url })) };
}

export async function runDlcBatch(items, action, onResult, isCurrent = () => true) {
  const report = { saved: 0, failed: 0 };
  for (const item of items) {
    if (!isCurrent()) break;
    onResult(item, { state: 'loading' });
    try {
      const result = await action(item);
      if (!isCurrent()) break;
      report.saved++;
      onResult(item, result);
    } catch (error) {
      if (!isCurrent()) break;
      report.failed++;
      onResult(item, { state: 'error', message: error?.data?.description || error?.data?.message || error?.message || 'دریافت ناموفق بود؛ دوباره تلاش کنید.' });
    }
  }
  return report;
}
