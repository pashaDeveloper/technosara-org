import React, { useEffect, useRef, useState } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { useFetchStoreDescriptionsMutation } from './StoreDescriptions';

const stores = [
  { id: 'sony', name: 'PlayStation', example: 'PPSA15304', Icon: FaPlaystation },
  { id: 'xbox', name: 'Xbox', example: '9NNX1VVR3KNQ', Icon: FaXbox },
];

export function storeProductId(provider, value) {
  try {
    const url = new URL(value);
    if (provider === 'sony' && url.hostname === 'store.playstation.com') {
      return url.pathname.match(/\/(?:product)\/[A-Z]{2}\d{4}-((?:PPSA|CUSA)\d{5})_\d{2}-/i)?.[1].toUpperCase() || '';
    }
    if (provider === 'xbox' && ['xbox.com', 'www.xbox.com'].includes(url.hostname)) {
      return url.pathname.match(/\/([A-Z0-9]{12})\/?$/i)?.[1].toUpperCase() || '';
    }
  } catch {}
  return '';
}

export default function StoreGameLookup({ query, disabled, onApply, savedIds }) {
  const [fetchGame] = useFetchStoreDescriptionsMutation();
  const [activeStore, setActiveStore] = useState(null);
  const [nameQuery, setNameQuery] = useState('');
  const [draftIds, setDraftIds] = useState({});
  const productId = provider => draftIds[provider] ?? savedIds?.[provider] ?? '';
  const sonyId = productId('sony');
  const xboxId = productId('xbox');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState('');
  const request = useRef(null);

  useEffect(() => {
    setLoading(false);
    setResult(null);
    setCandidates([]);
    setError('');
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [query, sonyId, xboxId, activeStore, nameQuery]);

  async function search(provider, url) {
    request.current?.abort();
    setLoading(true);
    setError('');
    setResult(null);
    setCandidates([]);
    const title = query?.trim() || '';
    const id = productId(provider).trim();
    const link = url || (!id && /^https:\/\//i.test(title) ? title : '');
    const pending = fetchGame({ provider, ...(link ? { url: link } : { title, ...(id ? { product_id: id } : {}) }) });
    request.current = pending;
    try {
      const response = await pending.unwrap();
      if (request.current === pending) setResult(response.data);
    } catch (failure) {
      if (request.current !== pending) return;
      const choices = failure.data?.candidates || [];
      setCandidates(choices.map(choice => ({ ...choice, provider })));
      if (!choices.length) setError(failure.data?.description || failure.data?.message || 'جست‌وجوی فروشگاه ناموفق بود.');
    } finally {
      if (request.current === pending) setLoading(false);
    }
  }

  async function searchNames() {
    if (nameQuery.trim().length < 2 || loading) return;
    request.current?.abort();
    setLoading(true);
    setError('');
    setCandidates([]);
    const pending = fetchGame({ title: nameQuery.trim(), suggest: true });
    request.current = pending;
    try {
      const { data } = await pending.unwrap();
      if (request.current !== pending) return;
      setCandidates(data);
      if (!data.length) setError('بازی‌ای با این نام در فروشگاه‌ها پیدا نشد.');
    } catch (failure) {
      if (request.current === pending) setError(failure.data?.description || failure.data?.message || 'جست‌وجو ناموفق بود.');
    } finally {
      if (request.current === pending) setLoading(false);
    }
  }

  return <div className="flex items-center gap-1">
    <Popover open={activeStore === 'name'} onOpenChange={open => {
      setActiveStore(previous => open ? 'name' : previous === 'name' ? null : previous);
      if (open) setNameQuery(query || '');
    }}>
      <PopoverTrigger asChild>
        <button type="button" title="جست‌وجوی نام دقیق بازی" aria-label="جست‌وجوی نام دقیق بازی" disabled={disabled}
          className="grid h-7 w-7 place-items-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          <FiSearch aria-hidden="true" size={15} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" dir="rtl" aria-label="جست‌وجوی نام دقیق بازی" className="w-80 max-w-[calc(100vw-1rem)] space-y-2 p-3 text-sm">
        <label htmlFor="store-name-search" className="block font-medium">نام بازی</label>
        <div className="flex gap-2">
          <input id="store-name-search" value={nameQuery} dir="auto" maxLength={200} placeholder="بخشی از نام بازی" autoComplete="off"
            onChange={event => setNameQuery(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border-slate-300 px-2 text-xs dark:bg-slate-800"
            onKeyDown={event => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
              event.preventDefault();
              searchNames();
            }} />
          <button type="button" onClick={searchNames} disabled={loading || nameQuery.trim().length < 2}
            className="rounded-md border px-2 text-xs disabled:opacity-50">جست‌وجو</button>
        </div>
        {loading && <p role="status">در حال جست‌وجو…</p>}
        {error && <p role="alert" className="text-red-600">{error}</p>}
        {candidates.length > 0 && <ul className="max-h-56 space-y-1 overflow-y-auto">
          {candidates.map(item => <li key={item.url}>
            <button type="button" disabled={disabled} onClick={() => { onApply(item); setActiveStore(null); }}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-start hover:bg-slate-100 dark:hover:bg-slate-700">
              <span dir="auto">{item.title}</span>
              <span className="shrink-0 text-xs text-slate-500">{item.provider === 'xbox' ? 'Xbox' : 'PlayStation'}</span>
            </button>
          </li>)}
        </ul>}
      </PopoverContent>
    </Popover>
    {stores.map(({ id, name, example, Icon }) => {
      const code = productId(id);
      const canSearch = Boolean(code.trim() || query?.trim());
      return <Popover key={id} open={activeStore === id}
        onOpenChange={open => setActiveStore(previous => open ? id : previous === id ? null : previous)}>
        <PopoverTrigger asChild>
          <button type="button" title={`جست‌وجو در ${name}`} aria-label={`جست‌وجو در ${name}`} disabled={disabled}
            className="grid h-7 w-7 place-items-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            <Icon aria-hidden="true" size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" dir="rtl" aria-label={`جست‌وجو در ${name}`} className="w-64 max-w-[calc(100vw-1rem)] space-y-2 p-3 text-sm">
          <label className="block font-medium" htmlFor={`store-product-id-${id}`}>{`شناسهٔ محصول ${name}`}</label>
          <div className="flex gap-2">
            <input id={`store-product-id-${id}`} type="text" dir="ltr" value={code} maxLength={60} autoComplete="off"
              spellCheck={false} placeholder={example} disabled={disabled}
              onChange={event => setDraftIds(previous => ({ ...previous, [id]: event.target.value.toUpperCase() }))}
              onKeyDown={event => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                event.preventDefault();
                if (!disabled && !loading && canSearch) search(id);
              }}
              className="h-8 min-w-0 flex-1 rounded-md border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-800" />
            <button type="button" className="rounded-md border px-2 text-xs disabled:opacity-50"
              disabled={disabled || loading || !canSearch} onClick={() => search(id)}>جست‌وجو</button>
          </div>
          {loading && <p role="status">در حال جست‌وجو…</p>}
          {error && <p role="alert" className="text-red-600">{error}</p>}
          {candidates.map(item => <button key={item.url} type="button" disabled={disabled}
            className="block w-full rounded px-2 py-1 text-start hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => search(id, item.url)}><span dir="auto">{item.title}</span></button>)}
          {result && <button type="button" disabled={disabled} onClick={() => {
            onApply(result, code.trim());
            setDraftIds(previous => ({ ...previous, [id]: undefined }));
            setActiveStore(null);
          }} className="block w-full rounded px-2 py-1 text-start hover:bg-slate-100 dark:hover:bg-slate-700">
            انتخاب <span dir="auto">{result.title}</span>
          </button>}
        </PopoverContent>
      </Popover>;
    })}
  </div>;
}
