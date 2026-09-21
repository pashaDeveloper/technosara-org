const MAX_BYTES = 500;

async function translatePersian(text, fetcher = fetch) {
  if (typeof text !== 'string' || !text.trim()) {
    throw Object.assign(new Error('متن فارسی را وارد کنید.'), { status: 400 });
  }
  text = text.trim();
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) {
    throw Object.assign(new Error('متن باید حداکثر ۵۰۰ بایت باشد.'), { status: 400 });
  }
  // Public Edge translation endpoint; no Azure subscription or API key required.
  const url = new URL('https://edge.microsoft.com/translate/translatetext');
  url.searchParams.set('from', 'fa');
  url.searchParams.set('to', 'en');
  url.searchParams.set('isEnterpriseClient', 'false');
  try {
    const response = await fetcher(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([text]), signal: AbortSignal.timeout(15000),
    });
    if (response.status === 429) {
      throw Object.assign(new Error('تعداد درخواست‌های ترجمه بیش از حد مجاز است. بعداً دوباره تلاش کنید.'), { status: 429 });
    }
    if (!response.ok) throw new Error('Upstream HTTP error');
    const data = await response.json();
    const translations = Array.isArray(data) && data.length === 1 ? data[0]?.translations : null;
    const translation = Array.isArray(translations) ? translations.find(item => item?.to === 'en')?.text : null;
    if (typeof translation !== 'string' || !translation.trim()) {
      throw new Error('Invalid translation response');
    }
    return { translation, sourceLanguage: 'fa', targetLanguage: 'en', provider: 'Microsoft Translator' };
  } catch (error) {
    if (error.status === 429) throw error;
    throw Object.assign(new Error('سرویس ترجمه در دسترس نیست. دوباره تلاش کنید.'), { status: 502 });
  }
}

module.exports = { translatePersian };
