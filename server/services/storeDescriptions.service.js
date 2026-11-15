const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function productUrl(provider, value) {
  let url;
  try { url = new URL(value); } catch { throw fail('نشانی صفحهٔ بازی را وارد کنید.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw fail('نشانی فروشگاه معتبر نیست.');
  if (provider === 'steam') {
    if (!['store.steampowered.com', 'www.store.steampowered.com'].includes(url.hostname)) throw fail('لینک رسمی Steam لازم است.');
    const id = url.pathname.match(/^\/app\/([1-9]\d{0,9})(?:\/|$)/)?.[1];
    if (!id) throw fail('شناسه بازی Steam در لینک پیدا نشد.');
    return { source: `https://store.steampowered.com/app/${id}/`, request: `https://store.steampowered.com/api/appdetails?appids=${id}&l=english&cc=us`, id };
  }
  if (provider === 'xbox') {
    if (!['www.xbox.com', 'xbox.com'].includes(url.hostname)) throw fail('لینک رسمی Xbox لازم است.');
    const id = url.pathname.split('/').filter(Boolean).at(-1);
    if (!/^[A-Za-z0-9]{12}$/.test(id)) throw fail('شناسهٔ محصول Xbox در لینک پیدا نشد.');
    return { source: url.origin + url.pathname, request: `https://displaycatalog.mp.microsoft.com/v7.0/products/${id}?market=US&languages=en-US` };
  }
  if (provider === 'sony') {
    if (url.hostname === 'www.playstation.com' && /^\/[a-z]{2}-[a-z]{2}\/games\/[a-z0-9-]+\/?$/.test(url.pathname)) return { source: url.origin + url.pathname, request: url.origin + url.pathname };
    if (url.hostname !== 'store.playstation.com' || !/^\/[a-z]{2}-[a-z]{2}\/(concept\/\d+|product\/[A-Za-z0-9_-]+)\/?$/.test(url.pathname)) throw fail('لینک رسمی محصول یا کانسپت PlayStation لازم است.');
    return { source: url.origin + url.pathname, request: url.origin + url.pathname };
  }
  throw fail('منبع معتبر نیست.');
}
function plain(value) {
  return String(value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function parseXbox(body) {
  const data = typeof body === 'string' ? JSON.parse(body) : body;
  const row = data.Product?.LocalizedProperties?.find(row => row.Language === 'en-US') || data.Product?.LocalizedProperties?.[0];
  if (!row?.ProductDescription) throw fail('توضیحات Xbox برای این محصول موجود نیست.', 404);
  return { title: plain(row.ProductTitle), description: plain(row.ProductDescription), short_description: plain(row.ShortDescription), short_source: 'provider' };
}
function shortExcerpt(description) {
  const first = description.split(/\n\s*\n/)[0].trim();
  const sentence = first.match(/^.+?[.!?](?=\s|$)/)?.[0] || first;
  return sentence.length <= 240 ? sentence : sentence.slice(0, 237).replace(/\s+\S*$/, '') + '…';
}
function parseSony(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const find = value => {
    if (Array.isArray(value)) return value.map(find).find(Boolean);
    if (!value || typeof value !== 'object') return null;
    if ([value['@type']].flat().includes('Product') && value.description) return value;
    return find(value['@graph']);
  };
  for (const match of scripts) {
    let row;
    try { row = find(JSON.parse(match[1])); } catch { continue; }
    if (!row) continue;
    const description = plain(row.description);
    // Sony does not provide an independent short description here.
    const short = shortExcerpt(description);
    return { title: plain(row.name), description, short_description: short, short_source: 'excerpt' };
  }
  throw fail('توضیحات در صفحهٔ Sony پیدا نشد؛ ممکن است ساختار صفحه تغییر کرده باشد.', 502);
}
async function readStore(url, provider, fetcher) {
  let response;
  try { response = await fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error', headers: { Accept: provider === 'xbox' || url.includes('/chihiro/') ? 'application/json' : 'text/html' } }); }
  catch { throw fail('اتصال به فروشگاه ناموفق بود یا زمان آن تمام شد.', 502); }
  if (!response.ok) throw fail(`فروشگاه پاسخ ${response.status} داد.`, response.status === 404 ? 404 : 502);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) throw fail('پاسخ فروشگاه بیش از حد بزرگ است.', 502);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function descriptions(provider, value, fetcher = fetch) {
  const urls = productUrl(provider, value);
  if (provider === 'steam') return steamDescription(urls, fetcher);
  if (provider === 'sony' && new URL(urls.source).hostname === 'www.playstation.com') {
    const html = await readStore(urls.request, provider, fetcher);
    const storeLinks = [...html.matchAll(/https:\/\/store\.playstation\.com\/[a-z]{2}-[a-z]{2}\/(?:concept\/\d+|product\/[A-Za-z0-9_-]+)/g)];
    if (!storeLinks.length) throw fail('لینک محصول در صفحهٔ رسمی PlayStation پیدا نشد.', 404);
    return descriptions(provider, storeLinks[0][0], fetcher);
  }
  let result;
  try {
    const body = await readStore(urls.request, provider, fetcher);
    result = provider === 'xbox' ? parseXbox(body) : parseSony(body);
  }
  catch (error) {
    if (provider !== 'sony' || !urls.source.includes('/product/')) throw error;
    const id = new URL(urls.source).pathname.split('/').at(-1);
    const data = JSON.parse(await readStore(`https://store.playstation.com/store/api/chihiro/00_09_000/container/US/en/999/${id}`, provider, fetcher));
    if (!data.long_desc) throw error;
    const description = plain(data.long_desc);
    result = { title: plain(data.name), description, short_description: shortExcerpt(description), short_source: 'excerpt' };
  }
  return { ...result, provider, url: urls.source };
}
function normalizeTitle(value) {
  return String(value || '').replace(/[™®©]/g, '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '').replace(/\bpart (i|ii|iii|iv)\b/g, (_, roman) => `part ${{ i: 1, ii: 2, iii: 3, iv: 4 }[roman]}`);
}
function selectTitle(rows, title) {
  const key = normalizeTitle(title);
  const matches = rows.filter(row => normalizeTitle(row.title) === key);
  const unique = [...new Map(matches.map(row => [row.url, row])).values()];
  if (!unique.length) throw fail('این بازی با همین عنوان در فروشگاه پیدا نشد؛ نام کامل بازی را بررسی کنید.', 404);
  if (unique.length > 1) throw fail('چند نسخه با این نام پیدا شد؛ نسخهٔ دقیق بازی را انتخاب کنید.', 409);
  return unique[0];
}
async function byTitle(provider, title, fetcher = fetch) {
  if (!['sony', 'xbox', 'steam'].includes(provider) || typeof title !== 'string' || title.trim().length < 2 || title.length > 200 || !normalizeTitle(title)) throw fail('Invalid game title or provider');
  const query = encodeURIComponent(title.trim());
  let rows;
  if (provider === 'steam') {
    const data = await require('./steamDlc.service').read(`storesearch/?term=${query}`, fetcher);
    rows = (data.items || []).filter(row => /^[1-9]\d{0,9}$/.test(String(row.id))).map(row => ({ title: row.name, url: `https://store.steampowered.com/app/${row.id}/` }));
  } else if (provider === 'sony') {
    const data = JSON.parse(await readStore(`https://store.playstation.com/store/api/chihiro/00_09_000/tumbler/US/en/999/${query}?size=30&suggested_size=0`, provider, fetcher));
    rows = (data.links || []).filter(row => /^[A-Za-z0-9_-]+$/.test(row.id)).map(row => ({ title: row.name, url: `https://store.playstation.com/en-us/product/${row.id}` }));
  } else {
    const data = JSON.parse(await readStore(`https://displaycatalog.mp.microsoft.com/v7.0/productFamilies/games/products?query=${query}&market=US&languages=en-US&fieldsTemplate=details`, provider, fetcher));
    rows = (data.Products || []).filter(row => /^[A-Za-z0-9]{12}$/.test(row.ProductId)).map(row => ({ title: row.LocalizedProperties?.[0]?.ProductTitle, url: `https://www.xbox.com/en-US/games/store/game/${row.ProductId}` }));
  }
  let match;
  try { match = selectTitle(rows, title); }
  catch (error) {
    if (provider === 'steam' && error.status === 404) throw fail('برای این بازی صفحهٔ مطابقی در Steam پیدا نشد؛ ممکن است در Steam عرضه نشده باشد. از Gamebrain یا منبع دیگری استفاده کنید.', 404);
    throw error;
  }
  return descriptions(provider, match.url, fetcher);
}
const steamCache = new Map();
let steamQueue = Promise.resolve(), steamLastRequest = 0;
async function steamDescription(urls, fetcher) {
  if (fetcher === fetch) {
    const hit = steamCache.get(urls.id);
    if (hit?.expires > Date.now()) return hit.value;
  }
  const run = async () => {
    if (fetcher === fetch) {
      const delay = Math.max(0, 1000 - (Date.now() - steamLastRequest));
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      steamLastRequest = Date.now();
    }
    const data = await require('./steamDlc.service').details(urls.id, fetcher);
    if (data.type !== 'game') throw fail('این محصول بازی اصلی نیست؛ لینک خود بازی را انتخاب کنید.', 409);
    const description = plain(data.about_the_game || data.detailed_description);
    if (!description) throw fail('توضیحات بازی در Steam موجود نیست.', 404);
    const result = { provider: 'steam', url: urls.source, title: plain(data.name), description, short_description: plain(data.short_description) || shortExcerpt(description), short_source: data.short_description ? 'provider' : 'excerpt' };
    if (fetcher === fetch) { if (steamCache.size >= 200) steamCache.delete(steamCache.keys().next().value); steamCache.set(urls.id, { expires: Date.now() + 86400000, value: result }); }
    return result;
  };
  const task = steamQueue.then(run); steamQueue = task.catch(() => {}); return task;
}
async function resolveDescription({ provider, url, title }, fetcher = fetch) {
  if (url) {
    try { return await descriptions(provider, url, fetcher); }
    catch (error) {
      if (!title || ![400, 404, 502].includes(error.status)) throw error;
    }
  }
  return byTitle(provider, title, fetcher);
}
module.exports = { descriptions, byTitle, resolveDescription, selectTitle, productUrl, parseXbox, parseSony };
