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
function xboxImages(data, media) {
  const product = data.Product;
  const local = product?.LocalizedProperties?.find(row => row.Language === 'en-US') || product?.LocalizedProperties?.[0];
  if (!local) throw fail('تصاویر این محصول در Xbox موجود نیست.', 404);
  const images = local.Images || [];
  const byRole = roles => roles.flatMap(role => images.filter(row => row.ImagePurpose === role).map(row => row.Uri));
  if (media === 'screenshots') return { title: local.ProductTitle, screenshots: unique(byRole(['Screenshot'])) };
  if (media === 'box') {
    const boxes = images.filter(row => ['BoxArt', 'Poster'].includes(row.ImagePurpose) &&
      (!row.Width || !row.Height || row.Height > row.Width));
    return { title: local.ProductTitle, box_images: unique(boxes.map(row => row.Uri)) };
  }
  const videos = (local.Videos || []).map(row => ({
    url: imageUrl(row.Uri), title: row.Title || row.Name, role: row.VideoPurpose,
    thumbnail: imageUrl(row.ThumbnailUri),
  })).filter(row => row.url);
  return { title: local.ProductTitle, videos, card_images: unique(byRole(['Tile', 'SquareTitle', 'BoxArt', 'Poster'])), banner_images: unique(byRole(['SuperHeroArt', 'TitledHeroArt', 'Hero', 'BrandedKeyArt', 'FeaturePromotionalArt'])) };
}
function sonyImages(html, source) {
  const cache = sonyCache(html);
  const productId = new URL(source).pathname.match(/\/product\/([^/]+)/)?.[1];
  const products = Object.values(cache).filter(row => row.__typename === 'Product');
  const product = productId ? products.find(row => row.id === productId) : products.find(row => row.type === 'GAME');
  const concept = Object.values(cache).find(row => row.__typename === 'Concept' && (!product?.concept?.__ref || cache[product.concept.__ref] === row));
  const dereference = row => row?.__ref ? cache[row.__ref] || {} : row || {};
  const media = [...(product?.media || []), ...(concept?.media || [])].map(dereference);
  const images = media.filter(row => row.type === 'IMAGE' || !row.type);
  const videos = media.filter(row => row.type === 'VIDEO').map(row => ({
    url: imageUrl(row.url), title: row.name || row.title, role: row.role,
    thumbnail: imageUrl(row.thumbnailUrl),
  })).filter(row => row.url);
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
  return { title, videos, card_images: unique(card), banner_images: unique(banner) };
}
async function read({ provider, url, media }, fetcher = fetch) {
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
  try { result = provider === 'xbox' ? xboxImages(JSON.parse(text), media) : sonyImages(text, source.source); }
  catch (error) { if (error.status) throw error; throw fail('ساختار تصاویر فروشگاه معتبر نیست.', 502); }
  if (provider === 'xbox' && media === 'box') return { ...result, source_url: source.source };
  if (provider === 'xbox' && media === 'screenshots') return { ...result, provider, source_url: source.source };
  if (media === 'video') return { videos: result.videos, provider, source_url: source.source };
  if (!result.card_images.length && !result.banner_images.length) throw fail('تصویر قابل‌دریافتی برای این نسخه پیدا نشد.', 404);
  return { ...result, provider, source_url: source.source };
}
module.exports = { read, xboxImages, sonyImages };
