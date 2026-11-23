import React, { useEffect, useRef, useState } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { nabApi } from '../../services/nab';
import { toast } from 'react-hot-toast';

const api = nabApi.injectEndpoints({ endpoints: builder => ({
  fetchCardCoverSource: builder.mutation({ query: body => ({ url: '/games/media/source', method: 'POST', body }) }),
  resolveCardCoverStore: builder.mutation({ query: body => ({ url: '/games/store-descriptions', method: 'POST', body }) }),
}) });
function links(value) { try { return JSON.parse(value || '[]').map(row => row.url).filter(Boolean); } catch { return []; } }

function coverSize(url, kind) {
  return new Promise(resolve => {
    const image = new Image();
    const finish = value => { clearTimeout(timer); image.onload = null; image.onerror = null; resolve(value); };
    const timer = setTimeout(() => finish(0), 10000);
    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;
      if (kind === 'portrait') {
        finish(width >= 300 && height >= 450 && height / width >= 1.3 && height / width <= 2 ? width * height : 0);
      } else if (kind === 'detail') {
        finish(width * height);
      } else {
        finish(width === height && width > 0 ? 1 : 0);
      }
    };
    image.onerror = () => finish(0);
    image.src = url;
  });
}

export default function StoreCoverPicker({ title, officialStores, offers, disabled, onSelect, onEditionSelect, kind = 'card', auto = false, compact = false }) {
  const [fetchImages] = api.useFetchCardCoverSourceMutation();
  const [resolveStore] = api.useResolveCardCoverStoreMutation();
  const [loading, setLoading] = useState('');
  const [selection, setSelection] = useState(null);
  const dialog = useRef(null);
  const detailOptions = useRef({});
  useEffect(() => { if (selection) dialog.current?.showModal(); }, [selection]);
  useEffect(() => { setSelection(null); }, [title, officialStores, offers]);
  const generation = useRef(0);
  const attempted = useRef('');
  useEffect(() => { ++generation.current; setLoading(''); return () => { ++generation.current; }; }, [title, officialStores, offers]);
  useEffect(() => {
    if (!auto || disabled || !title?.trim() || title.trim().length < 2) return;
    const key = JSON.stringify([title, officialStores, offers]);
    if (attempted.current === key) return;
    let cancelled = false;
    const scheduledGeneration = generation.current;
    const timer = setTimeout(async () => {
      if (kind === 'detail' && scheduledGeneration !== generation.current) return;
      attempted.current = key;
      const found = await load('sony', true);
      if (!found && !cancelled) await load('xbox', true);
    }, 1000);
    return () => { cancelled = true; clearTimeout(timer); ++generation.current; setLoading(''); };
  }, [auto, disabled, kind, title, officialStores, offers]);
  async function load(provider, silent = false, selectedUrl = '') {
    if (!title?.trim() || title.trim().length < 2) {
      toast.error('ابتدا نام بازی را انتخاب یا وارد کنید.');
      return;
    }
    const version = ++generation.current;
    setLoading(provider);
    try {
      let url = selectedUrl || [...links(officialStores), ...links(offers)].find(value => {
        try { return (provider === 'sony' ? ['store.playstation.com', 'www.playstation.com'] : ['xbox.com', 'www.xbox.com']).includes(new URL(value).hostname); } catch { return false; }
      });
      const sourceKey = JSON.stringify([title, url || '']);
      const previous = detailOptions.current[provider];
      if (kind === 'detail' && previous?.sourceKey === sourceKey) {
        if (!silent && previous.urls.length === 1) toast('فقط یک تصویر مناسب برای جزئیات بازی در این فروشگاه پیدا شد.');
        if (!silent) previous.index = (previous.index + 1) % previous.urls.length;
        onSelect(previous.urls[previous.index]);
        return true;
      }
      const usesSavedProduct = Boolean(url && !selectedUrl && new URL(url).hostname !== 'www.playstation.com');
      if (!url || new URL(url).hostname === 'www.playstation.com') {
        const result = await resolveStore({ provider, url: url || '', title }).unwrap();
        url = result.data?.url;
      }
      if (version !== generation.current) return;
      let result;
      try {
        result = await fetchImages({ provider, url }).unwrap();
      } catch (error) {
        if (kind !== 'detail' || !usesSavedProduct || ![400, 404, 502].includes(error.status) || version !== generation.current) throw error;
        const resolved = await resolveStore({ provider, title }).unwrap();
        const replacement = resolved.data?.url;
        if (!replacement || replacement === url || version !== generation.current) throw error;
        result = await fetchImages({ provider, url: replacement }).unwrap();
      }
      if (version !== generation.current) return;
      const cardImages = result.data?.card_images || [];
      const rows = [...new Set(kind === 'detail' ? [...(result.data?.banner_images || []), ...cardImages] : cardImages)];
      const sizes = await Promise.all(rows.map(url => coverSize(url, kind)));
      if (version !== generation.current) return;
      if (kind === 'detail') {
        const urls = rows.map((url, index) => ({ url, size: sizes[index] }))
          .filter(row => row.size > 0).sort((a, b) => b.size - a.size).map(row => row.url);
        if (urls.length) {
          detailOptions.current[provider] = { sourceKey, urls, index: 0 };
          onSelect(urls[0]);
          return true;
        }
      }
      const best = Math.max(0, ...sizes.map(Number));
      const selected = best ? rows[sizes.findIndex(size => Number(size) === best)] : null;
      if (selected) { onSelect(selected); return true; }
      if (!silent) toast.error(kind === 'portrait' ? 'کاور عمودی با کیفیت مناسب در این منبع پیدا نشد.' : kind === 'detail' ? 'هیچ تصویر قابل‌نمایشی برای جزئیات بازی در این فروشگاه پیدا نشد.' : 'کاور مربعی در این منبع پیدا نشد.');
    } catch (failure) {
      if (version === generation.current && !silent && failure.data?.candidates?.length) {
        setSelection({ provider, rows: failure.data.candidates });
        return;
      }
      if (version === generation.current && !silent) {
        const message = failure.data?.description || failure.data?.message;
        toast.error(message === 'Invalid game title or provider' ? 'نام بازی معتبر نیست؛ نام کامل بازی را وارد کنید.' : message && message !== 'Error' ? message : 'دریافت کاور ناموفق بود.');
      }
    } finally {
      if (version === generation.current) {
        setLoading('');
        if (selectedUrl) onEditionSelect?.(provider, selectedUrl);
      }
    }
  }
  return <>
    {selection && <dialog ref={dialog} dir="rtl" aria-labelledby="cover-edition-title" onCancel={() => setSelection(null)} className="w-full max-w-xl rounded-xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/50 dark:bg-slate-800 dark:text-white">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="cover-edition-title" className="font-bold">انتخاب نسخهٔ بازی از {selection.provider === 'sony' ? 'PlayStation' : 'Xbox'}</h2>
        <button type="button" onClick={() => setSelection(null)} aria-label="بستن">✕</button>
      </div>
      <p className="mb-3 text-sm">نسخهٔ موردنظر را برای دریافت عکس انتخاب کنید.</p>
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {selection.rows.map(row => <button key={row.url} type="button" className="block w-full rounded-lg border border-slate-300 p-3 text-start hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { const provider = selection.provider; setSelection(null); load(provider, false, row.url); }}>
          <span dir="auto" className="block font-semibold">{row.title}</span>
          <span dir="ltr" className="mt-1 block break-all text-left text-xs text-slate-500">{row.url}</span>
        </button>)}
      </div>
    </dialog>}
    {!compact && kind === 'portrait' && <span className="text-xs text-slate-500">{loading ? 'در حال دریافت کاور عمودی از API…' : 'کاور عمودی از PlayStation یا Xbox'}</span>}
    <div dir="ltr" aria-busy={Boolean(loading)} className="inline-flex overflow-hidden rounded-full">
      {[['sony', 'PlayStation', FaPlaystation], ['xbox', 'Xbox', FaXbox]].map(([provider, label, Icon]) => <button key={provider} type="button" aria-label={`انتخاب ${kind === 'portrait' ? 'کاور عمودی' : kind === 'detail' ? 'تصویر اصلی جزئیات' : 'کاور کارت'} از ${label}`} title={label} disabled={disabled || Boolean(loading)} onClick={() => load(provider)} className={`flex h-8 w-8 items-center justify-center text-white disabled:opacity-50 ${provider === 'sony' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}><Icon aria-hidden="true" className="h-4 w-4" /></button>)}
    </div>
  </>;
}
