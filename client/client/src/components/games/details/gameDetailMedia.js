export function asArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function imageUrl(value) {
  const source = typeof value === "string" ? value : value?.url || value?.image || value?.src;
  if (typeof source !== "string") return "";
  try {
    const url = new URL(source, "https://example.invalid");
    if (url.origin === "https://example.invalid" && source.startsWith("/")) return url.pathname + url.search;
    return /^https?:\/\//i.test(source) ? url.href : "";
  } catch {
    return "";
  }
}

export function gameImage(value, fallback) {
  const src = imageUrl(value);
  const embedded = value?.blurDataURL;
  const preview = typeof embedded === "string" && /^data:image\/(?:webp|jpe?g|png);base64,/i.test(embedded)
    ? embedded
    : [value?.thumbnail, value?.thumbnail_url, value?.preview, value?.preview_url, value?.low_res, fallback]
      .map(imageUrl).find((url) => url && url !== src);
  if (preview || !src) return { src, preview };

  const url = new URL(src, "https://example.invalid");
  if (url.hostname === "res.cloudinary.com" && url.pathname.includes("/image/upload/")) {
    url.pathname = url.pathname.replace("/image/upload/", "/image/upload/w_48,q_auto:low/");
    return { src, preview: url.href };
  }
  if (src.startsWith("/") || (url.protocol === "https:" && (
    (url.hostname === "img.gamebrain.co" && url.pathname.startsWith("/games/")) ||
    (url.hostname === "image.api.playstation.com" && url.pathname.startsWith("/vulcan/")) ||
    (url.hostname === "store-images.s-microsoft.com" && url.pathname.startsWith("/image/")) ||
    (url.hostname === "cdn.akamai.steamstatic.com" && url.pathname.startsWith("/steam/apps/"))
  ))) {
    return { src, preview: `/_next/image?url=${encodeURIComponent(src)}&w=48&q=75` };
  }
  return { src };
}

export const formatNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
