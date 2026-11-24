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
    const [, locale, , id] = new URL(urls.source).pathname.split('/');
    const [language, market] = locale.split('-');
    const data = JSON.parse(await readStore(`https://store.playstation.com/store/api/chihiro/00_09_000/container/${market.toUpperCase()}/${language}/999/${id}`, provider, fetcher));
    if (!data.long_desc) throw error;
    const description = plain(data.long_desc);
    result = { title: plain(data.name), description, short_description: shortExcerpt(description), short_source: 'excerpt' };
  }
  return { ...result, provider, url: urls.source };
}
function searchTerms(value) {
  return String(value || '').replace(/[™®©]/g, ' ').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function normalizeTitle(value) {
  return searchTerms(value).replace(/^the /, '').replace(/\bpart (i|ii|iii|iv)\b/g, (_, roman) => `part ${{ i: 1, ii: 2, iii: 3, iv: 4 }[roman]}`);
}
function selectTitle(rows, title) {
  const key = normalizeTitle(title);
  const matches = rows.filter(row => normalizeTitle(row.title) === key);
  const unique = [...new Map(matches.map(row => [row.url, row])).values()];
  if (!unique.length) throw fail('این بازی با همین عنوان در فروشگاه پیدا نشد؛ نام کامل بازی را بررسی کنید.', 404);
  if (unique.length > 1) throw Object.assign(fail('چند نسخه با این نام پیدا شد؛ نسخهٔ دقیق بازی را انتخاب کنید.', 409), { candidates: unique });
  return unique[0];
}
async function sonyTitleRows(title, fetcher, market = 'US') {
  const query = encodeURIComponent(title);
  const data = JSON.parse(await readStore(`https://store.playstation.com/store/api/chihiro/00_09_000/tumbler/${market}/en/999/${query}?size=30&suggested_size=0`, 'sony', fetcher));
  return (data.links || []).filter(row => /^[A-Za-z0-9_-]+$/.test(row.id)).map(row => ({ title: row.name, url: `https://store.playstation.com/en-${market.toLowerCase()}/product/${row.id}` }));
}
async function xboxTitleRows(title, fetcher) {
  const query = encodeURIComponent(title.trim());
  const catalog = 'https://displaycatalog.mp.microsoft.com/v7.0';
  const data = JSON.parse(await readStore(`${catalog}/productFamilies/games/products?query=${query}&market=US&languages=en-US&fieldsTemplate=details`, 'xbox', fetcher));
  const validId = id => /^[A-Za-z0-9]{12}$/.test(id);
  const name = row => (row.LocalizedProperties?.find(locale => locale.Language === 'en-US') || row.LocalizedProperties?.[0])?.ProductTitle;
  const toRow = row => ({ title: name(row), url: `https://www.xbox.com/en-US/games/store/game/${row.ProductId}` });
  const products = (data.Products || []).filter(row => validId(row.ProductId));
  const rows = products.map(toRow);
  const key = normalizeTitle(title);
  if (rows.some(row => normalizeTitle(row.title) === key)) return rows;

  // The search page can list a bundle while omitting the base game it references.
  const existingIds = new Set(products.map(row => row.ProductId));
  const relatedIds = new Set(products.filter(row => normalizeTitle(name(row)).startsWith(key + ' '))
    .flatMap(row => (row.MarketProperties || []).flatMap(market => market.RelatedProducts || []))
    .filter(row => row.RelationshipType === 'Parent' && validId(row.RelatedProductId) && !existingIds.has(row.RelatedProductId))
    .map(row => row.RelatedProductId));
  const ids = [...relatedIds].slice(0, 10).join(',');
  if (!ids) return rows;
  try {
    const related = JSON.parse(await readStore(`${catalog}/products?bigIds=${ids}&market=US&languages=en-US&fieldsTemplate=details`, 'xbox', fetcher));
    return [...rows, ...(related.Products || []).filter(row => relatedIds.has(row.ProductId) && normalizeTitle(name(row)) === key).map(toRow)];
  } catch {
    return rows;
  }
}

async function suggestTitles(title, fetcher = fetch) {
  if (typeof title !== 'string' || title.trim().length < 2 || title.length > 200 || !normalizeTitle(title)) {
    throw fail('حداقل دو حرف از نام بازی را وارد کنید.');
  }
  const query = title.trim();
  const results = await Promise.allSettled([
    xboxTitleRows(query, fetcher),
    sonyTitleRows(query, fetcher),
    sonyTitleRows(query, fetcher, 'HK'),
  ]);
  if (results.every(result => result.status === 'rejected')) throw fail('جست‌وجوی فروشگاه‌ها ناموفق بود.', 502);
  const groups = results.map((result, index) => result.status === 'fulfilled'
    ? result.value.map(row => ({ ...row, provider: index === 0 ? 'xbox' : 'sony' })) : []);
  const key = normalizeTitle(query);
  const rank = row => {
    const name = normalizeTitle(row.title);
    return name === key ? 0 : name.startsWith(key) ? 1 : name.includes(key) ? 2 : 3;
  };
  const unique = rows => [...new Map(rows.filter(row => typeof row.title === 'string' && row.title.trim())
    .map(row => [row.url, row])).values()].sort((a, b) => rank(a) - rank(b)).slice(0, 8);
  return [...unique(groups[0]), ...unique([...groups[1], ...groups[2]])].sort((a, b) => rank(a) - rank(b));
}

async function byTitle(provider, title, fetcher = fetch) {
  if (!['sony', 'xbox', 'steam'].includes(provider) || typeof title !== 'string' || title.trim().length < 2 || title.length > 200 || !normalizeTitle(title)) throw fail('Invalid game title or provider');
  const query = encodeURIComponent(title.trim());
  let rows;
  if (provider === 'steam') {
    const data = await require('./steamDlc.service').read(`storesearch/?term=${query}`, fetcher);
    rows = (data.items || []).filter(row => /^[1-9]\d{0,9}$/.test(String(row.id))).map(row => ({ title: row.name, url: `https://store.steampowered.com/app/${row.id}/` }));
  } else if (provider === 'sony') {
    return sonyByTitle(title.trim(), fetcher);
  } else {
    rows = await xboxTitleRows(title, fetcher);
  }
  let match;
  try { match = selectTitle(rows, title); }
  catch (error) {
    if (provider === 'steam' && error.status === 404) throw fail('برای این بازی صفحهٔ مطابقی در Steam پیدا نشد؛ ممکن است در Steam عرضه نشده باشد. از Gamebrain یا منبع دیگری استفاده کنید.', 404);
    throw error;
  }
  return descriptions(provider, match.url, fetcher);
}
async function sonyByTitle(title, fetcher) {
  const id = title.match(/\b(?:PPSA|CUSA)\d{5}(?:_\d{2})?\b/i)?.[0];
  const name = id ? title.replace(id, '').trim() : title;
  const eligible = rows => id ? rows.filter(row => {
    const product = new URL(row.url).pathname.split('/').at(-1);
    return product.toUpperCase().split('-').includes(id.toUpperCase().includes('_') ? id.toUpperCase() : id.toUpperCase() + '_00');
  }) : rows;
  for (const market of ['US', 'HK', 'SG', 'GB']) {
    const query = name || id;
    let rows;
    try {
      rows = eligible(await sonyTitleRows(query, fetcher, market));
      const terms = searchTerms(query);
      if (terms !== query.toLowerCase() && !rows.some(row => normalizeTitle(row.title) === normalizeTitle(name))) {
        rows = eligible(await sonyTitleRows(terms, fetcher, market));
      }
    } catch (error) {
      if (error.status === 404) continue;
      throw error;
    }
    if (name) {
      const exact = rows.filter(row => normalizeTitle(row.title) === normalizeTitle(name));
      if (exact.length) return descriptions('sony', selectTitle(exact, name).url, fetcher);
    }
    if (id && rows.length) {
      const candidates = [...new Map(rows.map(row => [row.url, row])).values()];
      if (candidates.length === 1) return descriptions('sony', candidates[0].url, fetcher);
      throw Object.assign(fail('نسخهٔ PlayStation را انتخاب کنید.', 409), { candidates });
    }
  }
  throw fail(id && !name ? 'نام بازی را کنار شناسه بنویسید یا لینک کامل فروشگاه را وارد کنید.' : 'بازی در منطقه‌های بررسی‌شدهٔ PlayStation پیدا نشد.', 404);
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
const sonyContentId = /^[A-Z]{2}\d{4}-(?:PPSA|CUSA)\d{5}_\d{2}-[A-Z0-9]{16}$/i;
function sonyProductLink(id) {
  const locale = { HP: 'en-hk', EP: 'en-gb', UP: 'en-us', JP: 'ja-jp' }[id.slice(0, 2)] || 'en-us';
  return `https://store.playstation.com/${locale}/product/${id}`;
}

async function byProductId(provider, value, title, fetcher) {
  if (typeof value !== 'string' || value.length > 60) throw fail('شناسهٔ محصول معتبر نیست.');
  const id = value.trim().toUpperCase();
  if (provider === 'xbox' && /^[A-Z0-9]{12}$/.test(id)) {
    return descriptions(provider, `https://www.xbox.com/en-US/games/store/game/${id}`, fetcher);
  }
  if (provider !== 'sony') throw fail('شناسهٔ محصول Xbox معتبر نیست.');
  if (sonyContentId.test(id)) return descriptions(provider, sonyProductLink(id), fetcher);
  if (!/^(?:PPSA|CUSA)\d{5}(?:_\d{2})?$/.test(id)) throw fail('شناسهٔ محصول PlayStation معتبر نیست.');

  const serial = id.split('_')[0];
  if (serial.startsWith('PPSA')) {
    let page = '';
    try { page = await readStore(`https://prosperopatches.com/${serial}`, 'sony', fetcher); } catch {}
    const contentIds = [...new Set(page.match(/[A-Z]{2}\d{4}-PPSA\d{5}_\d{2}-[A-Z0-9]{16}/g) || [])]
      .filter(code => code.split('-')[1] === (id.includes('_') ? id : `${id}_00`));
    const name = plain(page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
    if (contentIds.length > 1) {
      const candidates = contentIds.map(code => ({ title: `${name || serial} · ${code}`, url: sonyProductLink(code) }));
      throw Object.assign(fail('نسخهٔ PlayStation را انتخاب کنید.', 409), { candidates });
    }
    if (contentIds.length === 1) {
      try { return await descriptions(provider, sonyProductLink(contentIds[0]), fetcher); }
      catch (error) { if (![404, 502].includes(error.status)) throw error; }
    }
    if (name && contentIds.length) title = name;
  }
  const hint = typeof title === 'string' && title.length <= 180 && !/^https?:\/\//i.test(title) ? title.trim() : '';
  return sonyByTitle([hint, id].filter(Boolean).join(' '), fetcher);
}

async function resolveDescription({ provider, url, title, product_id }, fetcher = fetch) {
  if (product_id !== undefined) return byProductId(provider, product_id, title, fetcher);
  if (url) {
    try { return await descriptions(provider, url, fetcher); }
    catch (error) {
      if (!title || ![400, 404, 502].includes(error.status)) throw error;
    }
  }
  const key = String(title || '').trim();
  if (provider === 'xbox' && /^9[A-Z0-9]{11}$/i.test(key)) {
    return descriptions(provider, `https://www.xbox.com/en-US/games/store/game/${key.toUpperCase()}`, fetcher);
  }
  if (provider === 'sony' && sonyContentId.test(key)) return descriptions(provider, sonyProductLink(key.toUpperCase()), fetcher);
  return byTitle(provider, title, fetcher);
}
module.exports = { descriptions, byTitle, suggestTitles, resolveDescription, selectTitle, productUrl, parseXbox, parseSony, xboxTitleRows };
