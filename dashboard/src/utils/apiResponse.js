export async function readApiResponse(response) {
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); }
  catch {
    throw new Error(response.status === 404
      ? 'مسیر سرویس پیدا نشد. سرور را به‌روزرسانی و دوباره راه‌اندازی کنید.'
      : 'پاسخ معتبر از سرور دریافت نشد. اتصال به سرویس API را بررسی کنید.');
  }
  if (!response.ok) throw new Error(result?.description || result?.message || `خطای سرور (${response.status})`);
  if (!result || typeof result !== 'object' || Array.isArray(result) || !Object.hasOwn(result, 'data')) throw new Error('ساختار پاسخ سرور معتبر نیست.');
  return result.data;
}
