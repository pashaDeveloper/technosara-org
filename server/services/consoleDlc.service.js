const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Game = require('../models/game.model');
const Content = require('../models/gameContent.model');
const Product = require('../models/storeProduct.model');
const Store = require('../models/store.model');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
// Current persisted operation shipped by Sony's WCA addOns component, sorted
// with its sortAST/print pipeline. An upstream operation change fails explicitly.
const SONY_ADDONS_HASH = '92b4a31c2c82c44168ec1dbebaab6b811a5407e34700f78220c3e1240a4f16a6';
const cache = new Map();
async function cached(key, action) {
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  if (cache.size >= 200) cache.delete(cache.keys().next().value);
  const entry = { expires: Date.now() + 5 * 60000, promise: Promise.resolve().then(action) };
  cache.set(key, entry);
  try { return await entry.promise; } catch (error) { if (cache.get(key) === entry) cache.delete(key); throw error; }
}
async function request(url, options = {}, fetcher = fetch, json = true) {
  let response;
  try { response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(25000) }); }
  catch { throw fail('اتصال به فروشگاه ناموفق بود یا زمان آن تمام شد.', 502); }
  if (!response.ok) throw fail(`فروشگاه پاسخ ${response.status} داد.`, response.status === 429 ? 429 : response.status === 404 ? 404 : 502);
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 12 * 1024 * 1024) throw fail('پاسخ فروشگاه بیش از حد بزرگ است.', 502);
    chunks.push(Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!json) return text;
  try { return JSON.parse(text); } catch { throw fail('ساختار پاسخ فروشگاه معتبر نیست.', 502); }
}
function sourceLink(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    if (['www.xbox.com', 'xbox.com'].includes(u.hostname)) {
      const id = u.pathname.split('/').filter(Boolean).at(-1)?.toUpperCase();
      if (/^[A-Z0-9]{12}$/.test(id)) return { provider: 'xbox', id, url: `https://www.xbox.com/en-US/games/store/game/${id}` };
    }
    if (u.hostname === 'store.playstation.com') {
      const match = u.pathname.match(/^\/[a-z]{2}-[a-z]{2}\/(concept\/\d{1,15}|product\/[A-Z0-9_-]{10,80})\/?$/i);
      if (match) return { provider: 'playstation', id: match[1], url: `https://store.playstation.com/en-us/${match[1]}` };
    }
  } catch { /* Incomplete or unsupported form URL. */ }
  return null;
}
function inputLinks(input = {}) {
  const map = new Map();
  for (const key of ['official_stores', 'offers']) {
    let rows = input[key] || [];
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch { throw fail('فهرست فروشگاه‌ها معتبر نیست.'); } }
    if (!Array.isArray(rows) || rows.length > 100) throw fail('فهرست فروشگاه‌ها معتبر نیست.');
    for (const row of rows) {
      const source = sourceLink(row?.url);
      if (source) map.set(`${source.provider}:${source.id}`, source);
    }
  }
  if (map.size > 20) throw fail('تعداد لینک‌های نسخهٔ اصلی بیش از حد مجاز است.');
  return [...map.values()];
}
function sonyCache(html) {
  const merged = {};
  const collect = text => {
    for (const script of text.matchAll(/<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/g)) {
      let data;
      try { data = JSON.parse(script[1]); } catch { continue; }
      for (const [key, row] of Object.entries(data.cache || data.props?.apolloState || {})) merged[key] = { ...merged[key], ...row };
      for (const row of Object.values(data.props?.pageProps?.batarangs || {})) if (row.text) collect(row.text);
    }
  };
  collect(html);
  return merged;
}
async function sonyPage(source, fetcher) {
  const html = await request(source.url, {}, fetcher, false);
  const data = sonyCache(html);
  const concept = Object.values(data).find(row => row.__typename === 'Concept' && row.id);
  const productId = source.id.startsWith('product/') ? source.id.slice(8) : null;
  const product = Object.values(data).find(row => row.__typename === 'Product' && (!productId || row.id === productId) && row.name);
  if (!product || !concept) throw fail('شناسه و جزئیات محصول در پاسخ فعلی سونی پیدا نشد.', 502);
  return { data, product, concept };
}
async function sonyList(source, fetcher) {
  const page = await sonyPage(source, fetcher);
  const conceptId = page.concept.id;
  const items = new Map(); const seenPages = new Set();
  for (let offset = 0; offset < 10000; offset += 48) {
    const u = new URL('https://web.np.playstation.com/api/graphql/v1/op');
    u.searchParams.set('operationName', 'getAddOnProductsByConcept');
    u.searchParams.set('variables', JSON.stringify({ conceptId, pageArgs: { size: 48, offset } }));
    u.searchParams.set('extensions', JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SONY_ADDONS_HASH } }));
    const body = await request(u.href, { headers: { 'Content-Type': 'application/json', 'X-Psn-Store-Locale-Override': 'en-us' } }, fetcher);
    if (body.errors?.length) throw fail('API سونی فهرست کامل را برنگرداند: ' + body.errors[0].message, 502);
    const rows = body.data?.addOnProductsRetrieve?.addOnProducts;
    if (!Array.isArray(rows)) throw fail('ساختار فهرست افزونه‌های سونی تغییر کرده است.', 502);
    if (!rows.length) return { title: page.concept.name || page.product.name, rows: [...items.values()], parent: `concept/${conceptId}` };
    const fingerprint = rows.map(row => row.id).join(',');
    if (seenPages.has(fingerprint)) throw fail('API سونی صفحهٔ تکراری برگرداند؛ کامل بودن فهرست تأیید نشد.', 502);
    seenPages.add(fingerprint);
    for (const row of rows) {
      if (!/^[A-Z0-9_-]{10,80}$/.test(row.id || '') || String(row.concept?.id) !== String(conceptId)) throw fail('ارتباط افزونه با بازی در پاسخ سونی معتبر نیست.', 502);
      items.set(row.id, row);
    }
    if (rows.length < 48) return { title: page.concept.name || page.product.name, rows: [...items.values()], parent: `concept/${conceptId}` };
  }
  throw fail('فهرست سونی از سقف دریافت عبور کرد؛ فهرست ناقص ثبت نشد.', 502);
}
function xboxHeaders() { return { 'Content-Type': 'application/json', 'X-MS-API-Version': '1.1', 'MS-CV': crypto.randomBytes(12).toString('base64') + '.0' }; }
async function xboxList(source, fetcher) {
  const key = `ProductAddOns_${source.id}`, rows = new Map(), seenTokens = new Set(); let token;
  for (let page = 0; page < 500; page++) {
    const data = await request('https://emerald.xboxservices.com/xboxcomfd/browse?locale=en-US', { method: 'POST', headers: xboxHeaders(), body: JSON.stringify({ ChannelId: key, ChannelKeyToBeUsedInResponse: key, ReturnFilters: false, Filters: '', ...(token ? { EncodedCT: token } : {}) }) }, fetcher);
    const channel = data.channels?.[key];
    if (!channel || !Array.isArray(channel.products) || /failed/i.test(channel.title || '')) throw fail(`فهرست افزونه‌های نسخهٔ Xbox ${source.id} در دسترس نیست.`, 502);
    const summaries = new Map((data.productSummaries || []).map(row => [row.productId, row]));
    for (const item of channel.products) {
      if (!/^[A-Z0-9]{12}$/.test(item.productId || '')) throw fail('شناسهٔ افزونه در پاسخ Xbox معتبر نیست.', 502);
      rows.set(item.productId, summaries.get(item.productId) || { productId: item.productId });
    }
    token = channel.encodedCT;
    if (!token) {
      if (!Number.isSafeInteger(channel.totalItems) || rows.size < channel.totalItems) throw fail('صفحه‌بندی Xbox کامل نشد؛ تعداد نتایج با منبع برابر نیست.', 502);
      return { rows: [...rows.values()], parent: source.id, title: source.id };
    }
    if (seenTokens.has(token)) throw fail('Xbox توکن صفحه‌بندی تکراری برگرداند.', 502);
    seenTokens.add(token);
  }
  throw fail('فهرست Xbox از سقف دریافت عبور کرد.', 502);
}
async function listFor(source, fetcher = fetch) {
  const action = () => source.provider === 'xbox' ? xboxList(source, fetcher) : sonyList(source, fetcher);
  return fetcher === fetch ? cached(`list:${source.provider}:${source.id}`, action) : action();
}
function titleSlug(title) {
  if (typeof title !== 'string' || title.length > 200) return '';
  return title.replace(/[™®©]/g, '').replace(/\s+(Legacy|Enhanced)$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
async function inferredSony(title, fetcher) {
  const slug = titleSlug(title);
  if (!slug) return null;
  const html = await request(`https://www.playstation.com/en-us/games/${slug}/`, {}, fetcher, false);
  const urls = [...new Set(html.match(/https:\/\/store\.playstation\.com\/en-us\/(?:concept\/\d+|product\/[A-Z0-9_-]+)/g))];
  if (!urls.length) throw fail('در صفحهٔ رسمی این بازی لینک فروشگاه سونی پیدا نشد.', 404);
  // The official game's own page supplies the product relationship; never use a fuzzy search result.
  return sourceLink(urls[0]);
}
async function discoverDraft(input = {}, fetcher = fetch) {
  const sources = inputLinks(input), errors = [], parents = [], found = new Map();
  if (!sources.some(row => row.provider === 'playstation') && input.title) {
    try {
      const action = () => inferredSony(input.title, fetcher);
      const sony = fetcher === fetch ? await cached(`sony-title:${titleSlug(input.title)}`, action) : await action();
      if (sony) sources.push(sony);
    } catch (error) { errors.push({ provider: 'playstation', app_id: '', message: error.message }); }
  }
  if (!sources.length && !errors.length) throw fail('لینک Xbox یا PlayStation بازی را در بخش فروشگاه‌ها وارد کنید.');
  for (const source of sources) {
    try {
      const list = await listFor(source, fetcher);
      parents.push({ provider: source.provider, app_id: list.parent, title: list.title, count: list.rows.length });
      for (const row of list.rows) {
        const id = source.provider === 'xbox' ? row.productId : row.id;
        const item = { provider: source.provider, key: `${source.provider}:${id}`, app_id: id, parent_app_id: list.parent, parent_url: source.url,
          title: row.title || row.name || id, image: row.boxArt?.url || row.images?.boxArt?.url || '',
          url: source.provider === 'xbox' ? `https://www.xbox.com/en-US/games/store/addon/${id}` : `https://store.playstation.com/en-us/product/${id}` };
        found.set(item.key, item);
      }
    } catch (error) { errors.push({ provider: source.provider, app_id: source.id, message: error.message }); }
  }
  return { source: 'console-stores', market: 'US', items: [...found.values()], parents, errors, list_complete: errors.length === 0,
    notice: 'منابع: کاتالوگ Xbox و API فروشگاه PlayStation، بازار آمریکا. افزونه‌ها، بسته‌ها و ارز داخل بازی با شناسهٔ جداگانه دریافت می‌شوند. خطای هر نسخه جدا گزارش می‌شود.' };
}
function normalizeXbox(data) {
  const local = data.LocalizedProperties?.find(row => row.Language === 'en-US') || data.LocalizedProperties?.[0];
  if (!local?.ProductTitle || !local.ProductDescription) throw fail('عنوان یا توضیحات کامل افزونه در Xbox موجود نیست.', 422);
  const images = local.Images || [], videos = local.Videos || [];
  const url = value => value?.startsWith('//') ? `https:${value}` : value;
  const date = data.MarketProperties?.[0]?.OriginalReleaseDate;
  return { type: 'addon', title: local.ProductTitle, slug: `xbox-${data.ProductId.toLowerCase()}`, description: local.ProductDescription,
    short_description: local.ShortDescription || '', image: url(images.find(row => ['BoxArt', 'Poster'].includes(row.ImagePurpose))?.Uri) || '',
    screenshots: images.filter(row => row.ImagePurpose === 'Screenshot').map(row => url(row.Uri)).filter(Boolean),
    videos: videos.map(row => url(row.Uri)).filter(Boolean), developers: [local.DeveloperName].filter(Boolean), publishers: [local.PublisherName].filter(Boolean),
    supported_languages: (data.Properties?.SupportedLanguages || []).join?.(', ') || '', platforms: data.Properties?.XboxConsoleGenCompatible,
    release_date: date && Number.isFinite(Date.parse(date)) ? new Date(date) : null, release_date_text: date || '',
    requirements: { hardware: data.DisplaySkuAvailabilities?.[0]?.Sku?.Properties?.HardwareRequirements || [] } };
}
function normalizeSony(product, listRow) {
  const description = product.descriptions?.find(row => row.type === 'LONG')?.value;
  if (!product.name || !description) throw fail('عنوان یا توضیحات کامل افزونه در سونی موجود نیست.', 422);
  const media = product.media || [], date = product.releaseDate;
  const types = { VIRTUAL_CURRENCY: 'currency', SEASON_PASS: 'season_pass', SOUNDTRACK: 'soundtrack', LEVEL: 'map_pack', CHARACTER: 'character_pack', EXPANSION: 'expansion' };
  return { type: types[product.storeDisplayClassification] || 'addon', title: product.name, slug: `playstation-${product.id.toLowerCase()}`,
    description, short_description: product.descriptions?.find(row => row.type === 'SHORT')?.value || '', image: listRow.boxArt?.url || media.find(row => row.role === 'MASTER')?.url || '',
    screenshots: media.filter(row => row.type === 'IMAGE' && row.role === 'SCREENSHOT').map(row => row.url), videos: media.filter(row => row.type === 'VIDEO').map(row => row.url),
    developers: [], publishers: [product.publisherName].filter(Boolean), supported_languages: [...new Set([...(product.spokenLanguages || []), ...(product.screenLanguages || [])])].join(', '),
    platforms: product.platforms, release_date: date && Number.isFinite(Date.parse(date)) ? new Date(date) : null, release_date_text: date || '',
    requirements: { compatibility: product.compatibilityNoticesByPlatform }, is_free: listRow.price?.isFree && !listRow.price?.isTiedToSubscription };
}
async function previewOne(input = {}, fetcher = fetch) {
  if (!['xbox', 'playstation'].includes(input.provider)) throw fail('منبع افزونه معتبر نیست.');
  const id = String(input.app_id || ''), parent = String(input.parent_app_id || '');
  if (!(input.provider === 'xbox' ? /^[A-Z0-9]{12}$/ : /^[A-Z0-9_-]{10,80}$/).test(id)) throw fail('شناسهٔ افزونه معتبر نیست.');
  const links = inputLinks(input).filter(row => row.provider === input.provider && (input.provider === 'playstation' || row.id === parent));
  if (input.provider === 'xbox' && !links.length) throw fail('نسخهٔ اصلی Xbox در لینک‌های بازی نیست.', 409);
  const discovered = await discoverDraft({ official_stores: links.map(row => ({ url: row.url })), ...(input.provider === 'playstation' ? { title: input.title } : {}) }, fetcher);
  const match = discovered.items.find(row => row.provider === input.provider && row.app_id === id && row.parent_app_id === parent);
  if (!match) throw fail('وابستگی این افزونه به بازی از فروشگاه تأیید نشد.', 409);
  const source = sourceLink(match.parent_url), list = await listFor(source, fetcher);
  const listRow = list.rows.find(row => (row.productId || row.id) === id);
  let content, raw, price;
  if (input.provider === 'xbox') {
    const body = await request(`https://displaycatalog.mp.microsoft.com/v7.0/products/${id}?market=US&languages=en-US`, {}, fetcher);
    const data = body.Product;
    if (!data || data.ProductId !== id) throw fail('جزئیات Xbox با شناسهٔ افزونه برابر نیست.', 502);
    content = normalizeXbox(data); raw = { data, listing: listRow };
    const p = data.DisplaySkuAvailabilities?.flatMap(row => row.Availabilities || []).find(row => row.OrderManagementData?.Price)?.OrderManagementData.Price;
    if (p) price = { value: p.ListPrice, initial: p.MSRP, currency: p.CurrencyCode };
  } else {
    const page = await sonyPage({ id: `product/${id}`, url: match.url }, fetcher);
    content = normalizeSony(page.product, listRow); raw = { data: page.data, listing: listRow };
    const p = listRow.price;
    const amount = value => /^\$[\d,.]+$/.test(value || '') ? Number(value.slice(1).replace(/,/g, '')) : undefined;
    if (amount(p?.discountedPrice) !== undefined) price = { value: amount(p.discountedPrice), initial: amount(p.basePrice), currency: 'USD' };
  }
  return { ...match, content, price, raw, warnings: [!content.release_date && 'تاریخ انتشار دقیق در منبع موجود نیست.'].filter(Boolean) };
}
const active = new Set();
async function importOne(gameId, input, admin, fetcher = fetch) {
  if (!mongoose.isObjectIdOrHexString(gameId)) throw fail('شناسهٔ بازی معتبر نیست.');
  const game = await Game.findById(gameId).lean();
  if (!game) throw fail('بازی پیدا نشد.', 404);
  const lock = `${input.provider}:${input.app_id}`;
  if (active.has(lock)) throw fail('این محتوا در حال دریافت است.', 409);
  active.add(lock);
  try {
    // Use saved links/title, never trust a client-supplied parent relationship.
    const preview = await previewOne({ ...game, title: game.title || game.name, provider: input.provider, app_id: input.app_id, parent_app_id: input.parent_app_id }, fetcher);
    const store = await Store.findOne({ code: input.provider === 'xbox' ? 'xbox-store' : 'playstation-store' });
    if (!store) throw fail('فروشگاه این منبع در سیستم ثبت نشده است.', 409);
    const filter = { store_id: store._id, provider: input.provider, external_product_id: preview.app_id, external_sku_id: '' };
    let product = await Product.findOne(filter).setOptions({ withDeleted: true });
    if (product && (product.isDeleted || !product.content_id || product.game_id || product.edition_id)) throw fail('این محصول قبلاً متصل یا حذف شده است.', 409);
    let content = product ? await Content.findById(product.content_id).setOptions({ withDeleted: true }) : await Content.findOne({ game_id: gameId, slug: preview.content.slug }).setOptions({ withDeleted: true });
    if (product && !content || content && (content.isDeleted || String(content.game_id) !== String(gameId))) throw fail('محتوای موجود حذف شده یا متعلق به بازی دیگری است.', 409);
    const created = !content;
    if (!content) {
      content = new Content({ ...preview.content, game_id: gameId, publication_status: 'draft', creator: admin });
    }
    content.source_data = { provider: input.provider, market: 'US', parent_app_id: preview.parent_app_id, ...preview.raw }; content.last_synced_at = new Date();
    await content.save();
    if (!product) {
      product = await Product.findOneAndUpdate(filter, { $setOnInsert: { ...filter, content_id: content._id, creator: admin } }, { upsert: true, new: true, runValidators: true });
      if (String(product.content_id) !== String(content._id)) throw fail('این محصول هم‌زمان به محتوای دیگری متصل شد.', 409);
    }
    product.store_title = preview.title; product.store_url = preview.url; product.source = input.provider; product.is_official = true; product.price = preview.price;
    await product.save();
    await require('./automaticMedia.service').enrich(content, game, 'dlc', preview.content);
    return { key: preview.key, provider: preview.provider, app_id: preview.app_id, parent_app_id: preview.parent_app_id, content_id: content._id, content: content.toObject(), title: content.title, created, warnings: preview.warnings };
  } finally { active.delete(lock); }
}
module.exports = { SONY_ADDONS_HASH, sourceLink, inputLinks, sonyCache, sonyList, xboxList, normalizeXbox, normalizeSony, discoverDraft, previewOne, importOne };
