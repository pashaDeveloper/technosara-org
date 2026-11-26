import { apiUrl } from '../../utils/apiUrl.js';
import { readApiResponse } from '../../utils/apiResponse';
export function isStoredMedia(value) {
  try {
    const url = new URL(value);
    return url.hostname === 'res.cloudinary.com'
      || /\.arvanstorage\.(?:ir|com)$/.test(url.hostname)
      || (url.protocol === 'https:' && /\/game\/[^/]+\/(?:screenshot\/)?[^/]+-[\w-]{12}\.(?:webp|mp4)$/.test(url.pathname));
  } catch { return false; }
}
export const mediaBytes = value => value >= 1048576 ? `${(value / 1048576).toLocaleString('fa-IR', { maximumFractionDigits: 2 })} مگابایت` : `${(value / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلوبایت`;
export async function importGameMedia(url, gameTitle, fieldName, options = {}, signal) {
  const response = await fetch(apiUrl('/games/media/import'), { method: 'POST', credentials: 'include', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` }, body: JSON.stringify({ ...options, url, gameTitle, fieldName }) });
  const files = await readApiResponse(response);
  if (!files?.[fieldName]?.[0]?.url) throw new Error('نشانی فایل آپلودشده دریافت نشد.');
  return files[fieldName][0];
}
export const importGameImage = importGameMedia;
