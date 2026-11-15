const { productUrl } = require('./storeDescriptions.service');
const { sonyCache } = require('./consoleDlc.service');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function imageUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
const unique = rows => [...new Set(rows.map(imageUrl).filter(Boolean))];
function xboxImages(data) {
  const product = data.Product;
  const local = product?.LocalizedProperties?.find(row => row.Language === 'en-US') || product?.LocalizedProperties?.[0];
  if (!local) throw fail('تصاویر این محصول در Xbox موجود نیست.', 404);
  const images = local.Images || [];
  const byRole = roles => roles.flatMap(role => images.filter(row => row.ImagePurpose === role).map(row => row.Uri));
  return { title: local.ProductTitle, card_images: unique(byRole(['Tile', 'SquareTitle', 'BoxArt', 'Poster'])), banner_images: unique(byRole(['SuperHeroArt', 'TitledHeroArt', 'Hero', 'BrandedKeyArt', 'FeaturePromotionalArt'])) };
}
function sonyImages(html, source) {
  const cache = sonyCache(html);
  const productId = new URL(source).pathname.match(/\/product\/([^/]+)/)?.[1];
  const products = Object.values(cache).filter(row => row.__typename === 'Product');
  const product = productId ? products.find(row => row.id === productId) : products.find(row => row.type === 'GAME');
  const concept = Object.values(cache).find(row => row.__typename === 'Concept' && (!product?.concept?.__ref || cache[product.concept.__ref] === row));
  const dereference = row => row?.__ref ? cache[row.__ref] || {} : row || {};
  const images = [...(product?.media || []), ...(concept?.media || [])].map(dereference).filter(row => row.type === 'IMAGE' || !row.type);
  const card = images.filter(row => ['MASTER', 'BOX_ART', 'PORTRAIT_BANNER'].includes(row.role)).map(row => row.url);
  const banner = images.filter(row => ['BACKGROUND', 'HERO', 'GAMEHUB_COVER_ART', 'BANNER', 'KEY_ART'].includes(row.role)).map(row => row.url);
  let title = product?.name || concept?.name || '';
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data; try { data = JSON.parse(match[1]); } catch { continue; }
    const rows = Array.isArray(data) ? data : data['@graph'] || [data];
    for (const row of rows) if ([row['@type']].flat().includes('Product')) {
      title ||= row.name || '';
      card.push(...[row.image || []].flat().map(value => typeof value === 'string' ? value : value?.url));
    }
  }
  return { title, card_images: unique(card), banner_images: unique(banner) };
}
async function read({ provider, url }, fetcher = fetch) {
  const source = productUrl(provider, url);
  let response;
  try { response = await fetcher(source.request, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: provider === 'xbox' ? 'application/json' : 'text/html' } }); }
  catch { throw fail('دریافت تصاویر فروشگاه ناموفق بود.', 502); }
  if (!response.ok) throw fail('تصاویر از فروشگاه دریافت نشد.', response.status === 429 ? 429 : response.status === 404 ? 404 : 502);
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 12 * 1024 * 1024) throw fail('پاسخ فروشگاه بیش از حد بزرگ است.', 502);
    chunks.push(Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  let result;
  try { result = provider === 'xbox' ? xboxImages(JSON.parse(text)) : sonyImages(text, source.source); }
  catch (error) { if (error.status) throw error; throw fail('ساختار تصاویر فروشگاه معتبر نیست.', 502); }
  if (!result.card_images.length && !result.banner_images.length) throw fail('تصویر قابل‌دریافتی برای این نسخه پیدا نشد.', 404);
  return { ...result, provider, source_url: source.source };
}
module.exports = { read, xboxImages, sonyImages };
