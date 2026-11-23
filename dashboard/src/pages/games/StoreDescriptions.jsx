import React, { useEffect, useRef, useState } from 'react';
import { nabApi } from '../../services/nab';
import { useTranslateTextMutation } from '../../services/translation/translationApi';
import { FaXbox, FaSteam, FaPlaystation } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const api = nabApi.injectEndpoints({ endpoints: builder => ({
  fetchStoreDescriptions: builder.mutation({ query: body => ({ url: '/games/store-descriptions', method: 'POST', body }) }),
}) });
export const { useFetchStoreDescriptionsMutation } = api;

function links(value) { try { return JSON.parse(value || '[]').map(row => row.url).filter(Boolean); } catch { return []; } }
function sourceUrl(provider, urls) {
  const hosts = { sony: ['store.playstation.com', 'www.playstation.com'], xbox: ['xbox.com', 'www.xbox.com'], steam: ['store.steampowered.com', 'www.store.steampowered.com'] };
  return urls.find(value => { try { return hosts[provider]?.includes(new URL(value).hostname); } catch { return false; } }) || '';
}

export default function StoreDescriptions({ title, officialStores, offers, disabled, onApply, fieldKey }) {
  const [fetchDescription] = useFetchStoreDescriptionsMutation();
  const [translate] = useTranslateTextMutation();
  const [loading, setLoading] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    ++generation.current;
    setLoading('');
    return () => { ++generation.current; };
  }, [title, officialStores, offers]);
  const urls = [...links(officialStores), ...links(offers)];
  async function load(provider) {
    const url = sourceUrl(provider, urls);
    const version = ++generation.current;
    setLoading(provider);
    try {
      const response = await fetchDescription({ provider, url, title }).unwrap();
      if (version !== generation.current) return;
      const text = response.data?.[fieldKey];
      if (!text) { toast.error('این توضیح در منبع موجود نیست.'); return; }
      let translated;
      try {
        const result = await translate({ text, sourceLanguage: 'en', targetLanguage: 'fa' }).unwrap();
        translated = result.translation;
        if (typeof translated !== 'string' || !translated.trim()) throw new Error('Empty translation');
      } catch (failure) {
        if (version === generation.current) toast.error(failure.data?.description || failure.data?.message || 'ترجمهٔ فارسی ناموفق بود؛ متن فعلی حفظ شد.');
        return;
      }
      if (version === generation.current) onApply(fieldKey, translated);
    } catch (failure) {
      if (version === generation.current) toast.error(failure.data?.description || (failure.data?.message !== 'Error' ? failure.data?.message : '') || 'دریافت توضیحات ناموفق بود.');
    } finally { if (version === generation.current) setLoading(''); }
  }
  return <div className="flex shrink-0 justify-end" aria-busy={Boolean(loading)}><div dir="ltr" className="inline-flex overflow-hidden rounded-full">
    {[['xbox', 'Xbox', FaXbox], ['steam', 'Steam', FaSteam], ['sony', 'PlayStation', FaPlaystation]].map(([provider, label, Icon]) => <button
      key={provider} type="button" title={label} aria-label={`دریافت ${fieldKey === 'description' ? 'توضیحات کامل' : 'توضیح کوتاه'} از ${label}`}
      disabled={disabled || Boolean(loading)} onClick={() => load(provider)}
      className={`flex h-8 w-8 items-center justify-center text-white transition-colors disabled:opacity-50 ${provider === 'xbox' ? 'bg-green-600 hover:bg-green-700' : provider === 'steam' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'} ${loading === provider ? 'motion-safe:animate-pulse' : ''}`}>
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>)}
  </div></div>;
}
