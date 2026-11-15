import React, { useEffect, useId, useRef, useState } from 'react';
import { useLazySuggestGamebrainQuery, useLazyGetGamebrainDetailsQuery } from '../../services/games/gamebrainApi';
import { toast } from 'react-hot-toast';

export function useGamebrainLookup(title, onSelect, savedTitle) {
  const [suggest] = useLazySuggestGamebrainQuery();
  const [details] = useLazyGetGamebrainDetailsQuery();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [game, setGame] = useState(null);
  const [local, setLocal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const generation = useRef(0);
  const detailGeneration = useRef(0);
  const detailRequest = useRef(null);
  const listId = useId();
  const query = String(title || '').trim();

  useEffect(() => {
    const version = ++generation.current;
    setItems([]); setActive(-1); setError(''); setLoading(false);
    if (savedTitle && query === savedTitle.trim()) { setOpen(false); return; }
    if (selected && query === selected.name.trim()) return undefined;
    ++detailGeneration.current;
    detailRequest.current?.abort();
    setSelected(null); setGame(null); setLocal(null); setDetailError(''); setLoadingDetails(false);
    if (query.length < 2) { setOpen(false); return undefined; }
    setLoading(true); setOpen(true);
    let request;
    const timer = setTimeout(async () => {
      request = suggest(query, true);
      try {
        const response = await request.unwrap();
        if (version === generation.current) setItems(response.data?.results || []);
      } catch (failure) {
        if (version === generation.current && failure.name !== 'AbortError') setError(failure.status === 402
          ? 'سهمیهٔ جست‌وجوی GameBrain تمام شده است؛ پس از تمدید سهمیه دوباره تلاش کنید.'
          : failure.status === 429 ? 'جست‌وجوها بیش از حد سریع هستند؛ چند لحظه بعد دوباره تلاش کنید.'
            : failure.data?.description || failure.data?.message || 'دریافت پیشنهادها ناموفق بود؛ اتصال یا محدودیت API را بررسی کنید.');
      } finally { if (version === generation.current) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); request?.abort(); ++generation.current; };
  }, [query, selected, suggest, savedTitle]);

  useEffect(() => () => { ++detailGeneration.current; detailRequest.current?.abort(); }, []);

  async function select(item) {
    ++generation.current;
    const version = ++detailGeneration.current;
    detailRequest.current?.abort();
    setSelected(item); setGame(null); setLocal(null); setItems([]); setOpen(false); setActive(-1);
    setLoading(false); setDetailError(''); setLoadingDetails(true);
    onSelect(item.name);
    const request = details(item.id, false);
    detailRequest.current = request;
    try {
      const response = await request.unwrap();
      if (version === detailGeneration.current) {
        setLocal(response.local || null); setGame(response.data);
        if (response.saveError) toast.error(response.saveError);
        else if (response.local?.record?.draft_completion_errors?.length) toast.error('بازی ذخیره شد، اما ترجمه یا تطبیق بعضی دسته‌بندی‌ها کامل نشد.');
        else if (response.local) toast.success(response.local.created ? 'اطلاعات بازی بدون آپلود تصاویر، خودکار ذخیره شد.' : 'اطلاعات ذخیره‌شده بازی برای ویرایش باز شد.');
      }
    } catch (failure) {
      if (version === detailGeneration.current && failure.name !== 'AbortError') { setDetailError('دریافت مشخصات بازی ناموفق بود.'); toast.error('دریافت یا ذخیره خودکار بازی ناموفق بود؛ دوباره تلاش کنید.'); }
    } finally { if (version === detailGeneration.current) setLoadingDetails(false); }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' && items.length) { event.preventDefault(); setOpen(true); setActive(index => (index + 1) % items.length); }
    if (event.key === 'ArrowUp' && items.length) { event.preventDefault(); setOpen(true); setActive(index => index <= 0 ? items.length - 1 : index - 1); }
    if (event.key === 'Enter' && open && active >= 0 && items[active]) { event.preventDefault(); void select(items[active]); }
  }
  return { items, selected, game, local, loading, loadingDetails, error, detailError, open, active, listId, select, setOpen, onKeyDown };
}

export function GamebrainSuggestions({ lookup }) {
  if (!lookup.open) return null;
  return <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
    <p role="status" className="px-3 py-2 text-xs text-slate-500">{lookup.loading ? 'در حال جست‌وجو در GameBrain…' : lookup.error || (lookup.items.length ? 'بازی موردنظر را انتخاب کنید' : 'بازی‌ای با این نام پیدا نشد.')}</p>
    <ul id={lookup.listId} role="listbox" aria-label="پیشنهادهای نام بازی" className="max-h-72 overflow-y-auto">
      {lookup.items.map((item, index) => <li key={item.id} id={`${lookup.listId}-${index}`} role="option" aria-selected={lookup.active === index}>
        <button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => lookup.select(item)} className={`flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-indigo-50 dark:hover:bg-slate-800 ${lookup.active === index ? 'bg-indigo-50 dark:bg-slate-800' : ''}`}>
          {item.image && <img src={item.image} alt="" className="h-12 w-16 rounded object-cover" loading="lazy" />}
          <span className="min-w-0"><span dir="ltr" className="block truncate">{item.name}</span><span className="text-xs text-slate-500">{[item.year, item.genre].filter(Boolean).join(' · ')}</span></span>
          {item.saved && <span className="ms-auto flex shrink-0 items-center gap-1 text-[10px] text-emerald-600" title="اطلاعات این بازی در دیتابیس ذخیره شده"><span className="h-2 w-2 rounded-full bg-emerald-500" />ذخیره‌شده</span>}
        </button>
      </li>)}
    </ul>
  </div>;
}

function GamebrainDetailsSkeleton({ loading }) {
  return <div role="status" aria-live="polite" className="space-y-5">
    <p className="text-sm leading-7 text-slate-500">{loading ? 'در حال دریافت جزئیات بازی…' : 'برای نمایش جزئیات، یک بازی را از پیشنهادهای نام بازی انتخاب کنید.'}</p>
    <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
      <div className="h-56 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-6 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-2 gap-3">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-4 rounded bg-slate-200 dark:bg-slate-700" />)}</div>
      <div className="space-y-2"><div className="h-4 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-4 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" /></div>
      <div className="flex gap-2">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-7 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />)}</div>
      <div className="grid grid-cols-2 gap-3"><div className="h-28 rounded-lg bg-slate-200 dark:bg-slate-700" /><div className="h-28 rounded-lg bg-slate-200 dark:bg-slate-700" /></div>
    </div>
  </div>;
}

export function GamebrainDetails({ lookup }) {
  const game = lookup.game;
  const labels = { genres: 'ژانرها', themes: 'تم‌ها', play_modes: 'حالت‌های بازی', platforms: 'پلتفرم‌ها', tags: 'تگ‌ها' };
  return <aside dir="rtl" tabIndex={0} aria-label="مشخصات بازی انتخاب‌شده از GameBrain" className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8 dark:border-slate-700 dark:bg-gray-900 md:col-start-1 md:row-start-1 md:sticky md:top-5 md:self-start md:max-h-[calc(100dvh-2.5rem)] md:overflow-y-auto md:overscroll-contain">
    {lookup.detailError ? <div role="alert"><p className="text-red-500">{lookup.detailError}</p><button type="button" className="mt-2 text-indigo-600" onClick={() => lookup.select(lookup.selected)}>تلاش دوباره</button></div> : !game || lookup.loadingDetails ? <GamebrainDetailsSkeleton loading={lookup.loadingDetails} /> : <div className="space-y-4">
      {game.image && <img src={game.image} alt={game.name} className="max-h-64 w-full rounded-lg object-contain" />}
      <h3 dir="ltr" className="text-lg font-semibold">{game.name}</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {game.release_date && <><dt>تاریخ انتشار</dt><dd dir="ltr">{game.release_date}</dd></>}
        {game.developer && <><dt>سازنده</dt><dd>{game.developer}</dd></>}
        {typeof game.rating?.mean === 'number' && <><dt>امتیاز</dt><dd>{Math.round(game.rating.mean * 100)} / 100</dd></>}
        {typeof game.playtime?.median === 'number' && <><dt>میانهٔ زمان بازی</dt><dd>{game.playtime.median} ساعت</dd></>}
      </dl>
      {(game.short_description || game.description) && <p dir="auto" className="text-sm leading-7">{game.short_description || game.description}</p>}
      {Object.entries(labels).map(([key, label]) => game[key]?.length ? <div key={key}><h4 className="mb-1 text-sm font-medium">{label}</h4><div className="flex flex-wrap gap-1">{game[key].map((item, index) => <span key={`${typeof item === 'string' ? item : item.value}-${index}`} className="rounded bg-white px-2 py-1 text-xs dark:bg-slate-700">{typeof item === 'string' ? item : item.name}</span>)}</div></div> : null)}
      {!!game.screenshots?.length && <div className="grid grid-cols-2 gap-2">{game.screenshots.slice(0, 4).map(url => <img key={url} src={url} alt="تصویر بازی" loading="lazy" className="rounded-lg" />)}</div>}
      <details><summary className="cursor-pointer text-sm text-indigo-600">نمایش تمام اطلاعات دریافتی</summary><pre dir="ltr" className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(game, null, 2)}</pre></details>
      <p className="text-xs leading-6 text-slate-500">با انتخاب بازی، ورودی‌ها تکمیل و توضیحات ترجمه می‌شوند. پس از بررسی، دکمه ثبت را بزنید.</p>
    </div>}
  </aside>;
}
