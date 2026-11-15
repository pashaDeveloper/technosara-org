const MAX_BYTES = 500;

async function translatePersian(text, fetcher = fetch, { sourceLanguage = 'fa', targetLanguage = 'en', longText = false } = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw Object.assign(new Error('متن فارسی را وارد کنید.'), { status: 400 });
  }
  if (!['fa','en'].includes(sourceLanguage) || !['fa','en'].includes(targetLanguage) || sourceLanguage === targetLanguage) throw Object.assign(new Error('Invalid translation languages'), {status:400});
  text = text.trim();
  if(longText && text.length>10000) throw Object.assign(new Error('Text too long'),{status:400});
  if(longText && Buffer.byteLength(text,'utf8')>MAX_BYTES) {
    const chunks=[]; let chunk='';
    for(const character of text) { if(Buffer.byteLength(chunk+character,'utf8')>MAX_BYTES) {chunks.push(chunk);chunk='';} chunk+=character; }
    if(chunk) chunks.push(chunk);
    const translations=[];
    for(const part of chunks) translations.push((await translatePersian(part,fetcher,{sourceLanguage,targetLanguage})).translation);
    return {translation:translations.join(' '),sourceLanguage,targetLanguage,provider:'Microsoft Translator'};
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) {
    throw Object.assign(new Error('متن باید حداکثر ۵۰۰ بایت باشد.'), { status: 400 });
  }
  // Public Edge translation endpoint; no Azure subscription or API key required.
  const url = new URL('https://edge.microsoft.com/translate/translatetext');
  url.searchParams.set('from', sourceLanguage);
  url.searchParams.set('to', targetLanguage);
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
    const translation = Array.isArray(translations) ? translations.find(item => item?.to === targetLanguage)?.text : null;
    if (typeof translation !== 'string' || !translation.trim()) {
      throw new Error('Invalid translation response');
    }
    return { translation, sourceLanguage, targetLanguage, provider: 'Microsoft Translator' };
  } catch (error) {
    if (error.status === 429) throw error;
    throw Object.assign(new Error('سرویس ترجمه در دسترس نیست. دوباره تلاش کنید.'), { status: 502 });
  }
}

module.exports = { translatePersian };
