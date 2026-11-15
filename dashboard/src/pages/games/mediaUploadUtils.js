import { readApiResponse } from '../../utils/apiResponse';
export const isCloudinaryMedia = value => { try { return new URL(value).hostname === 'res.cloudinary.com'; } catch { return false; } };
export const mediaBytes = value => value >= 1048576 ? `${(value / 1048576).toLocaleString('fa-IR', { maximumFractionDigits: 2 })} مگابایت` : `${(value / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلوبایت`;
export async function importGameImage(url, gameTitle, fieldName, options = {}) {
  const response = await fetch('/api/games/media/import', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` }, body: JSON.stringify({ ...options, url, gameTitle, fieldName }) });
  const files = await readApiResponse(response);
  if (!files?.[fieldName]?.[0]?.url) throw new Error('نشانی تصویر آپلودشده دریافت نشد.');
  return files[fieldName][0];
}
