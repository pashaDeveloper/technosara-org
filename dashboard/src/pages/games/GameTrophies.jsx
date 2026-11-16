import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import TrophyCard from './TrophyCard';
import GameSectionSkeleton from './GameSectionSkeleton';
import Trophy, { trophyColors } from '../../components/icons/Trophy';
import { nabApi } from '../../services/nab';

const api = nabApi.enhanceEndpoints({ addTagTypes: ['Catalog'] }).injectEndpoints({ endpoints: builder => ({
  trophyServiceStatus: builder.query({ query: () => '/games/trophies/status' }),
  findTrophyGames: builder.mutation({ query: body => ({ url: '/games/trophies/candidates', method: 'POST', body }) }),
  previewBaseTrophies: builder.mutation({ query: body => ({ url: '/games/trophies/preview', method: 'POST', body }) }),
  importBaseTrophies: builder.mutation({ query: ({ id, ...body }) => ({ url: `/games/${id}/trophies/import`, method: 'POST', body }), invalidatesTags: ['Catalog'] }),
}) });
const { useTrophyServiceStatusQuery, useFindTrophyGamesMutation, usePreviewBaseTrophiesMutation, useImportBaseTrophiesMutation } = api;
const message = error => error?.data?.description || (error?.data?.message !== 'Error' ? error?.data?.message : '') || 'دریافت تروفی‌ها ناموفق بود.';
function storeProviders(...values) {
  const providers = new Set();
  for (let rows of values) {
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch { continue; } }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      try {
        const url = new URL(row?.url);
        if (url.protocol !== 'https:') continue;
        if (['xbox.com', 'www.xbox.com'].includes(url.hostname)) providers.add('openxbl');
        if (['store.playstation.com', 'playstation.com', 'www.playstation.com'].includes(url.hostname)) { providers.add('psn'); providers.add('platprices'); }
      } catch { /* Incomplete form links are ignored. */ }
    }
  }
  return providers;
}
const grades = { bronze: 'برنز', silver: 'نقره', gold: 'طلا', platinum: 'پلاتین', standard: 'اچیومنت' };
export default forwardRef(function GameTrophies({ title, officialStores, offers, gameId, disabled, onBusyChange, autoFetch = true, storedLists = [], onPreviewChange }, ref) {
  const [find] = useFindTrophyGamesMutation(), [preview] = usePreviewBaseTrophiesMutation(), [importTrophies] = useImportBaseTrophiesMutation();
  const [lists, setLists] = useState([]), [busy, setBusy] = useState(false), [errors, setErrors] = useState([]), [saved, setSaved] = useState({});
  const [reload, setReload] = useState(0);
  const status = useTrophyServiceStatusQuery(undefined, { skip: !autoFetch && !reload, refetchOnMountOrArgChange: true });
  const [manualNpwr, setManualNpwr] = useState(''), [manualError, setManualError] = useState('');
  const manualAttempt = useRef('');
  const version = useRef(0), requests = useRef(new Set());
  const sourceKey = JSON.stringify([officialStores, offers]);
  const providersKey = JSON.stringify(status.data?.data?.providers || null);
  async function persistList(list, current) {
    if (!gameId || !list.total || current !== version.current) return;
    const request = importTrophies({ id: gameId, provider: list.provider, manual: list.manual, ppid: list.ppid, product_id: list.product_id, platform: list.platform, region: list.region });
    requests.current.add(request);
    try { await request.unwrap(); if (current === version.current) setSaved(previous => ({ ...previous, [list.key]: true })); }
    finally { requests.current.delete(request); }
  }
  useEffect(() => { setManualNpwr(''); setManualError(''); }, [title, gameId]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    const current = ++version.current;
    const abort = () => { for (const request of requests.current) request.abort(); requests.current.clear(); };
    abort(); setLists([]); setErrors([]); setSaved({});
    if (!autoFetch && !reload) {
      setLists(storedLists); setSaved(Object.fromEntries(storedLists.map(list => [list.key, true]))); setBusy(false); return;
    }
    const providers = JSON.parse(providersKey);
    if (!title?.trim() || !providers) { setBusy(false); return; }
    setBusy(true);
    const source = { official_stores: officialStores, offers };
    const available = storeProviders(officialStores, offers);
    const call = async request => {
      requests.current.add(request);
      try { return await request.unwrap(); } finally { requests.current.delete(request); }
    };
    const timer = setTimeout(async () => {
      try {
        if (!available.size && !providers.psn) {
          if (current === version.current) setErrors(['برای دریافت تروفی، لینک رسمی نسخهٔ بازی در PlayStation Store یا Xbox را در بخش فروشگاه‌ها وارد کنید.']);
          return;
        }
        for (const provider of ['openxbl', ...(providers.psn ? ['psn'] : ['platprices'])]) {
          if (!providers[provider] || (!available.has(provider) && provider !== 'psn') || current !== version.current) continue;
          try {
            const response = await call(find({ title, provider, game_id: gameId, ...source, linkedOnly: true }));
            if (current !== version.current) return;
            const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            const suggested = response.data.filter(choice => choice.requires_confirmation);
            const matching = suggested.filter(choice => normalize(choice.title) === normalize(title));
            const selected = new Set((matching.length ? matching : suggested.slice(0, 1)).map(choice => choice.ppid));
            const seen = new Set();
            for (const choice of response.data) for (const platform of choice.platforms) {
              if (choice.requires_confirmation && !selected.has(choice.ppid)) continue;
              if (current !== version.current) return;
              const key = provider + ':' + choice.ppid + ':' + platform;
              if (seen.has(key)) continue;
              seen.add(key);
              try {
                const result = await call(preview({ provider, manual: choice.manual || choice.requires_confirmation, ppid: choice.ppid, product_id: choice.product_id, platform, ...source }));
                if (current === version.current) {
                  const list = { ...result.data, provider, key };
                  setLists(previous => [...previous, list]);
                  await persistList(list, current);
                }
              } catch (error) {
                if (current === version.current) setErrors(previous => [...previous, choice.title + ': ' + message(error)]);
                if (Number(error.status) === 401) throw error;
              }
            }
          } catch (error) {
            if (current === version.current) setErrors(previous => [...previous, provider + ': ' + message(error)]);
          }
        }
      } finally { if (current === version.current) setBusy(false); }
    }, 700);
    return () => { clearTimeout(timer); ++version.current; abort(); };
  }, [title, sourceKey, providersKey, reload, gameId, find, preview, autoFetch]);
  async function loadManual() {
    const current = version.current;
    setBusy(true); setManualError('');
    const request = preview({ provider: 'psn', manual: true, ppid: `NPWR-${manualNpwr}` });
    requests.current.add(request);
    try {
      const response = await request.unwrap();
      if (current !== version.current) return;
      const incoming = (response.data.sets || [response.data]).map(list => ({ ...list, provider: 'psn', key: `psn:${list.ppid}:${list.platform}` }));
      const keys = new Set(incoming.map(list => list.key));
      setLists(previous => [...previous.filter(row => !keys.has(row.key)), ...incoming]);
      setSaved(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !keys.has(key))));
      setErrors(previous => previous.filter(error => !error.startsWith('psn:') && !error.startsWith('برای دریافت تروفی،')));
      for (const list of incoming) await persistList(list, current);
    } catch (error) { if (current === version.current) setManualError(message(error)); }
    finally { requests.current.delete(request); if (current === version.current) setBusy(false); }
  }
  useEffect(() => {
    if (busy || disabled || !/^\d{5,9}(?:_\d{2})?$/.test(manualNpwr) || manualAttempt.current === manualNpwr) return;
    const timer = setTimeout(() => { manualAttempt.current = manualNpwr; void loadManual(); }, 700);
    return () => clearTimeout(timer);
  }, [manualNpwr, busy, disabled]);
  async function save(id) {
    let count = 0, failed = errors.length;
    setBusy(true);
    try {
      for (const list of lists) {
        if (!list.total || saved[list.key]) continue;
        try {
          const response = await importTrophies({ id, provider: list.provider, manual: list.manual, ppid: list.ppid, product_id: list.product_id, platform: list.platform, region: list.region }).unwrap();
          count += response.data.saved;
          setSaved(previous => ({ ...previous, [list.key]: true }));
        } catch (error) { failed++; setErrors(previous => [...previous, message(error)]); }
      }
      return { saved: count, failed };
    } finally { setBusy(false); }
  }
  useImperativeHandle(ref, () => ({ save }));
  useEffect(() => { onPreviewChange?.(lists); }, [lists, onPreviewChange]);
  return <section className="min-w-0 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 shrink-0" />تروفی‌ها و اچیومنت‌ها</h2>
      <button type="button" disabled={disabled || busy} onClick={() => { status.refetch(); setReload(value => value + 1); }} className="text-sm text-blue-600 disabled:opacity-50">به‌روزرسانی</button>
    </div>
    <div className="space-y-2 text-sm">
      <label htmlFor="manual-trophy-number" className="block font-medium">شناسهٔ مجموعهٔ تروفی PS</label>
      <div dir="ltr" className="flex overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <span className="shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800">NPWR-</span>
        <input id="manual-trophy-number" dir="ltr" value={manualNpwr} onChange={event => {
          manualAttempt.current = '';
          setManualNpwr(event.target.value.trim().toUpperCase().replace(/^NPWR-?/, '').replace(/[^0-9_]/g, ''));
        }} placeholder="09988" maxLength={12} disabled={disabled || busy} className="min-w-0 w-full border-0 bg-transparent p-2 focus:ring-inset" />
      </div>
      {manualError && <p role="alert" className="text-xs text-red-600">{manualError}</p>}
    </div>
    {busy && <p role="status" className="text-sm text-slate-500">در حال دریافت خودکار نسخه‌ها و تروفی‌ها…</p>}
    {!lists.length && <GameSectionSkeleton kind="trophies" label="تروفی‌ها و اچیومنت‌ها: هنوز اطلاعاتی نمایش داده نشده است" />}
    {!busy && !lists.length && !errors.length && <p role="status" className="text-sm text-slate-500">نسخهٔ قابل‌تطبیقی دریافت نشد؛ لینک رسمی بازی و تنظیمات سرویس‌ها را بررسی کنید.</p>}
    {status.error && <p role="alert" className="text-sm text-red-600">بررسی سرویس تروفی ناموفق بود.</p>}
    {lists.map(list => <div key={list.key} className="min-w-0 space-y-3">
      <h3 dir="auto" className="text-sm font-semibold">{list.game.title} · {list.platform.toUpperCase()}</h3>
      {list.game.compatible_platforms?.length > 0 && <p className="text-xs text-slate-500">قابل اجرا روی: <bdi>{list.game.compatible_platforms.join(' / ')}</bdi></p>}
      <div className="flex flex-wrap gap-2 text-sm">{Object.entries(list.counts).map(([grade, count]) => <span key={grade} title={grades[grade]} aria-label={`${grades[grade]}: ${count}`} className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800 ${trophyColors[grade] || trophyColors.silver}`}><Trophy className="size-3 shrink-0" strokeWidth={1.75} /><span className="tabular-nums">{new Intl.NumberFormat('fa-IR').format(count)}</span></span>)}</div>
      {!list.total ? <p className="text-sm text-slate-500">برای این نسخه تروفی ثبت نشده است.</p> : <>
        <p role="status" className="text-xs text-slate-500">{saved[list.key] ? 'تروفی‌ها و تصاویرشان ثبت شدند.' : gameId ? 'ثبت و آپلود تصاویر تروفی‌ها به‌صورت خودکار انجام می‌شود.' : 'تروفی‌ها پس از ذخیره بازی خودکار ثبت می‌شوند.'}</p>
        {gameId && !saved[list.key] && !busy && <button type="button" disabled={disabled} onClick={() => save(gameId)} className="text-sm text-blue-600">تلاش مجدد برای تکمیل ثبت خودکار</button>}
        <ul tabIndex={0} aria-label="کارت‌های تروفی و اچیومنت؛ برای دیدن موارد بیشتر افقی اسکرول کنید" className="flex min-w-0 items-start gap-4 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{list.trophies.map(trophy => <TrophyCard allowTranslation={!list.stored} key={trophy.external_id} trophy={trophy} provider={list.provider} progress={list.account_progress?.find(row => row.external_id === trophy.external_id)} />)}</ul>
      </>}
      <a href={list.provider === 'openxbl' ? 'https://xbl.io' : list.provider === 'psn' ? 'https://www.playstation.com' : 'https://platprices.com'} target="_blank" rel="noreferrer" className="block text-xs text-slate-400">{list.provider === 'psn' ? 'PlayStation Network' : `Powered by ${list.provider === 'openxbl' ? 'OpenXBL' : 'PlatPrices'}`}</a>
    </div>)}
    {errors.map((error, index) => <p key={index} role="alert" className="text-sm text-red-600">{error}</p>)}
  </section>;
});
