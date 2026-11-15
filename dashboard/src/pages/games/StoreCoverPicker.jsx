import React, { useEffect, useRef, useState } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { nabApi } from '../../services/nab';
import { toast } from 'react-hot-toast';

const api = nabApi.injectEndpoints({ endpoints: builder => ({
  fetchCardCoverSource: builder.mutation({ query: body => ({ url: '/games/media/source', method: 'POST', body }) }),
  resolveCardCoverStore: builder.mutation({ query: body => ({ url: '/games/store-descriptions', method: 'POST', body }) }),
}) });
function links(value) { try { return JSON.parse(value || '[]').map(row => row.url).filter(Boolean); } catch { return []; } }

function isSquare(url) {
  return new Promise(resolve => {
    const image = new Image();
    const finish = value => { clearTimeout(timer); image.onload = null; image.onerror = null; resolve(value); };
    const timer = setTimeout(() => finish(false), 10000);
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalWidth === image.naturalHeight);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

function bannerSize(url, portrait = false) {
  return new Promise(resolve => {
    const image = new Image();
    const finish = value => { clearTimeout(timer); image.onload = null; image.onerror = null; resolve(value); };
    const timer = setTimeout(() => finish(0), 10000);
    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;
      const valid = portrait ? width >= 300 && height >= 450 && height / width >= 1.3 && height / width <= 2 : width >= 1280 && height >= 500 && width / height >= 1.6;
      finish(valid ? width * height : 0);
    };
    image.onerror = () => finish(0);
    image.src = url;
  });
}

export default function StoreCoverPicker({ title, officialStores, offers, disabled, onSelect, kind = 'card', auto = false, compact = false }) {
  const [fetchImages] = api.useFetchCardCoverSourceMutation();
  const [resolveStore] = api.useResolveCardCoverStoreMutation();
  const [loading, setLoading] = useState('');
  const generation = useRef(0);
  const attempted = useRef('');
  useEffect(() => { ++generation.current; setLoading(''); return () => { ++generation.current; }; }, [title, officialStores, offers]);
  useEffect(() => {
    if (!auto || disabled || !title?.trim() || title.trim().length < 2) return;
    const key = JSON.stringify([title, officialStores, offers]);
    if (attempted.current === key) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      attempted.current = key;
      const found = await load('sony', true);
      if (!found && !cancelled) await load('xbox', true);
    }, 1000);
    return () => { cancelled = true; clearTimeout(timer); ++generation.current; setLoading(''); };
  }, [auto, disabled, title, officialStores, offers]);
  async function load(provider, silent = false) {
    if (!title?.trim() || title.trim().length < 2) {
      toast.error('ابتدا نام بازی را انتخاب یا وارد کنید.');
      return;
    }
    const version = ++generation.current;
    setLoading(provider);
    try {
      let url = [...links(officialStores), ...links(offers)].find(value => {
        try { return (provider === 'sony' ? ['store.playstation.com', 'www.playstation.com'] : ['xbox.com', 'www.xbox.com']).includes(new URL(value).hostname); } catch { return false; }
      });
      if (!url || new URL(url).hostname === 'www.playstation.com') {
        const result = await resolveStore({ provider, url: url || '', title }).unwrap();
        url = result.data?.url;
      }
      if (version !== generation.current) return;
      const result = await fetchImages({ provider, url }).unwrap();
      if (version !== generation.current) return;
      const rows = [...new Set(result.data?.[kind === 'banner' ? 'banner_images' : 'card_images'] || [])];
      const sizes = await Promise.all(rows.map(url => kind === 'card' ? isSquare(url) : bannerSize(url, kind === 'portrait')));
      if (version !== generation.current) return;
      const best = Math.max(0, ...sizes.map(Number));
      const selected = best ? rows[sizes.findIndex(size => Number(size) === best)] : null;
      if (selected) { onSelect(selected); return true; }
      if (!silent) toast.error(kind === 'portrait' ? 'کاور عمودی با کیفیت مناسب در این منبع پیدا نشد.' : kind === 'banner' ? 'بنر عریض با کیفیت مناسب در این منبع پیدا نشد.' : 'کاور مربعی در این منبع پیدا نشد.');
    } catch (failure) {
      if (version === generation.current && !silent) {
        const message = failure.data?.description || failure.data?.message;
        toast.error(message === 'Invalid game title or provider' ? 'نام بازی معتبر نیست؛ نام کامل بازی را وارد کنید.' : message && message !== 'Error' ? message : 'دریافت کاور ناموفق بود.');
      }
    } finally { if (version === generation.current) setLoading(''); }
  }
  return <>
    {!compact && kind === 'portrait' && <span className="text-xs text-slate-500">{loading ? 'در حال دریافت کاور عمودی از API…' : 'کاور عمودی از PlayStation یا Xbox'}</span>}
    {!compact && kind === 'banner' && <span className="text-xs text-slate-500">{loading ? 'در حال دریافت بنر باکیفیت از API…' : 'بنر عریض از PlayStation یا Xbox'}</span>}
    <div dir="ltr" aria-busy={Boolean(loading)} className="inline-flex overflow-hidden rounded-full">
      {[['sony', 'PlayStation', FaPlaystation], ['xbox', 'Xbox', FaXbox]].map(([provider, label, Icon]) => <button key={provider} type="button" aria-label={`انتخاب ${kind === 'portrait' ? 'کاور عمودی' : kind === 'banner' ? 'بنر جزئیات' : 'کاور کارت'} از ${label}`} title={label} disabled={disabled || Boolean(loading)} onClick={() => load(provider)} className={`flex h-8 w-8 items-center justify-center text-white disabled:opacity-50 ${provider === 'sony' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}><Icon aria-hidden="true" className="h-4 w-4" /></button>)}
    </div>
  </>;
}
