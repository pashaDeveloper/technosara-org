import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { FaPlaystation, FaXbox } from 'react-icons/fa';
import { FiAlertCircle, FiRefreshCw, FiRotateCw } from 'react-icons/fi';
import SendButton from '../../components/shared/button/SendButton';
import TrophyCard from './TrophyCard';
import GameSectionSkeleton from './GameSectionSkeleton';
import Trophy, { trophyColors } from '../../components/icons/Trophy';
import { nabApi } from '../../services/nab';
import { useSavedResourceStatusQuery } from './resourceStatusApi';

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
const trophyPlatforms = [['playstation', 'PlayStation', FaPlaystation], ['xbox', 'Xbox', FaXbox]];
export default forwardRef(function GameTrophies({ title, officialStores, offers, apiStores = [], gameId, disabled, onBusyChange, autoFetch = true, storedLists = [], onPreviewChange }, ref) {
  const [find] = useFindTrophyGamesMutation(), [preview] = usePreviewBaseTrophiesMutation(), [importTrophies] = useImportBaseTrophiesMutation();
  const [lists, setLists] = useState([]), [busy, setBusy] = useState(false), [errors, setErrors] = useState([]), [saved, setSaved] = useState({});
  const [reload, setReload] = useState(0);
  const [importing, setImporting] = useState({});
  const [failedLists, setFailedLists] = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const tabId = useId();
  const platformLists = {
    playstation: lists.filter(list => list.provider !== 'openxbl'),
    xbox: lists.filter(list => list.provider === 'openxbl'),
  };
  const activePlatform = selectedPlatform || (platformLists.xbox.length && !platformLists.playstation.length ? 'xbox' : 'playstation');
  const resourceStatus = useSavedResourceStatusQuery(gameId, { skip: !gameId, pollingInterval: busy ? 2000 : 0, refetchOnMountOrArgChange: true });
  useEffect(() => { if (gameId && !busy) resourceStatus.refetch(); }, [busy, gameId]);
  function storedTrophy(list, trophy) {
    const rows = resourceStatus.data?.data?.trophies?.filter(row => row.provider === list.provider && row.ppid === list.ppid && row.platform === list.platform).flatMap(row => row.trophies);
    return rows?.find(row => row.external_id === trophy.external_id) || (list.stored ? trophy : null);
  }
  function trophyStatus(list, trophy) {
    const stored = storedTrophy(list, trophy);
    return saved[list.key] ? { registered: true, translated: true, uploaded: true, complete: true } : stored || { registered: false, translated: false, uploaded: false, complete: false };
  }
  const isImporting = Object.values(importing).some(Boolean);
  const listComplete = list => Boolean(list.total && list.trophies.every(trophy => trophyStatus(list, trophy).complete));
  const status = useTrophyServiceStatusQuery(undefined, { skip: !autoFetch && !reload, refetchOnMountOrArgChange: true });
  const [manualNpwr, setManualNpwr] = useState(''), [manualError, setManualError] = useState('');
  const manualAttempt = useRef('');
  const version = useRef(0), requests = useRef(new Set());
  const sourceKey = JSON.stringify([officialStores, offers, apiStores]);
  const providersKey = JSON.stringify(status.data?.data?.providers || null);
  async function persistList(list, current) {
    if (!gameId || !list.total || current !== version.current) return;
    const request = importTrophies({ id: gameId, provider: list.provider, manual: list.manual, ppid: list.ppid, product_id: list.product_id, platform: list.platform, region: list.region, console_api_stores: apiStores });
    requests.current.add(request);
    setImporting(previous => ({ ...previous, [list.key]: true }));
    try { await request.unwrap(); if (current === version.current) setSaved(previous => ({ ...previous, [list.key]: true })); }
    catch (error) { if (current === version.current) setFailedLists(previous => ({ ...previous, [list.key]: true })); throw error; }
    finally { requests.current.delete(request); if (current === version.current) setImporting(previous => ({ ...previous, [list.key]: false })); }
  }
  useEffect(() => { setManualNpwr(''); setManualError(''); }, [title, gameId]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    const current = ++version.current;
    const abort = () => { for (const request of requests.current) request.abort(); requests.current.clear(); };
    abort(); setLists([]); setErrors([]); setSaved({}); setImporting({}); setFailedLists({});
    if (!autoFetch && !reload) {
      setLists(storedLists); setSaved(Object.fromEntries(storedLists.map(list => [list.key, list.complete === true]))); setFailedLists(Object.fromEntries(storedLists.map(list => [list.key, list.complete !== true]))); setBusy(false); return;
    }
    const providers = JSON.parse(providersKey);
    const available = storeProviders(officialStores, offers);
    if ((!title?.trim() && !available.size) || !providers) { setBusy(false); return; }
    setBusy(true);
    const source = { official_stores: officialStores, offers, console_api_stores: apiStores };
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
            const storeTitle = apiStores.find(row => row.provider === (provider === 'openxbl' ? 'xbox' : 'sony'))?.title || title || '';
            const response = await call(find({ title: storeTitle, provider, game_id: gameId, ...source, linkedOnly: true }));
            if (current !== version.current) return;
            const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            const suggested = response.data.filter(choice => choice.requires_confirmation);
            const matching = suggested.filter(choice => normalize(choice.title) === normalize(storeTitle));
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
  async function save(id, onlyKey) {
    let count = 0, failed = errors.length;
    setBusy(true);
    try {
      for (const list of lists) {
        if (!list.total || listComplete(list) || (onlyKey && list.key !== onlyKey)) continue;
        setImporting(previous => ({ ...previous, [list.key]: true }));
        try {
          const response = await importTrophies({ id, provider: list.provider, manual: list.manual, ppid: list.ppid, product_id: list.product_id, platform: list.platform, region: list.region }).unwrap();
          count += response.data.saved;
          setSaved(previous => ({ ...previous, [list.key]: true }));
          setErrors(previous => previous.filter(error => !error.startsWith(list.game.title + ': ')));
        } catch (error) { failed++; setFailedLists(previous => ({ ...previous, [list.key]: true })); setErrors(previous => [...new Set([...previous, list.game.title + ': ' + message(error)])]); }
        finally { setImporting(previous => ({ ...previous, [list.key]: false })); }
      }
      return { saved: count, failed };
    } finally { setBusy(false); }
  }
  useImperativeHandle(ref, () => ({ save }));
  useEffect(() => { onPreviewChange?.(lists); }, [lists, onPreviewChange]);
  return <section className="min-w-0 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 shrink-0" />تروفی‌ها و اچیومنت‌ها</h2>
      <SendButton type="button" label="به‌روزرسانی" icon={FiRefreshCw} disabled={disabled || busy || isImporting} onClick={() => { status.refetch(); setReload(value => value + 1); }} />
    </div>
    <div className="space-y-2 text-sm">
      <label htmlFor="manual-trophy-number" className="block font-medium">شناسهٔ مجموعهٔ تروفی PS</label>
      <div dir="ltr" className="flex overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <span className="shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800">NPWR-</span>
        <input id="manual-trophy-number" dir="ltr" value={manualNpwr} onChange={event => {
          manualAttempt.current = '';
          setManualNpwr(event.target.value.trim().toUpperCase().replace(/^NPWR-?/, '').replace(/[^0-9_]/g, ''));
        }} placeholder="09988" maxLength={12} disabled={disabled || busy || isImporting} className="min-w-0 w-full border-0 bg-transparent p-2 focus:ring-inset" />
      </div>
      {manualError && <p role="alert" className="text-xs text-red-600">{manualError}</p>}
    </div>
    {busy && <p role="status" className="text-sm text-slate-500">در حال دریافت خودکار نسخه‌ها و تروفی‌ها…</p>}
    {!lists.length && <GameSectionSkeleton kind="trophies" label="تروفی‌ها و اچیومنت‌ها: هنوز اطلاعاتی نمایش داده نشده است" />}
    {!busy && !lists.length && !errors.length && <p role="status" className="text-sm text-slate-500">نسخهٔ قابل‌تطبیقی دریافت نشد؛ لینک رسمی بازی و تنظیمات سرویس‌ها را بررسی کنید.</p>}
    {status.error && <p role="alert" className="text-sm text-red-600">بررسی سرویس تروفی ناموفق بود.</p>}
    <div role="tablist" aria-label="پلتفرم تروفی‌ها" dir="ltr" className="mx-auto flex w-full max-w-3xl justify-center gap-2 sm:gap-3">
      {trophyPlatforms.map(([platform, label, Icon], index) => {
        const selected = activePlatform === platform;
        const total = platformLists[platform].reduce((sum, list) => sum + list.total, 0);
        return <button key={platform} id={`${tabId}-${platform}`} type="button" role="tab" aria-selected={selected} aria-controls={`${tabId}-panel`} tabIndex={selected ? 0 : -1} onClick={() => setSelectedPlatform(platform)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? trophyPlatforms.length - 1 : (index + 1) % trophyPlatforms.length;
          setSelectedPlatform(trophyPlatforms[next][0]);
          event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
        }} className={`inline-flex min-h-12 min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-t-md border border-green-300 px-2 py-3 text-sm text-green-500 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-blue-600 dark:text-blue-500 dark:hover:bg-gray-900 dark:focus-visible:ring-blue-500 sm:px-4 ${selected ? 'border-b-4 border-b-green-500 bg-green-50 font-semibold dark:border-b-blue-500 dark:bg-gray-900' : ''}`}>
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          <span>{label}</span>
          <span className="rounded bg-green-100 px-1.5 tabular-nums text-green-700 dark:bg-blue-950 dark:text-blue-300">{new Intl.NumberFormat('fa-IR').format(total)}</span>
        </button>;
      })}
    </div>
    {errors.some(error => /^(openxbl|psn|platprices):/.test(error)) && (
      <div className="flex justify-start" dir="rtl">
        <SendButton type="button" label="تلاش مجدد" icon={FiRotateCw} disabled={disabled || busy || isImporting} onClick={() => setReload(value => value + 1)} />
      </div>
    )}
    <div id={`${tabId}-panel`} role="tabpanel" tabIndex={0} aria-labelledby={`${tabId}-${activePlatform}`} className="min-w-0 space-y-4 pt-3">
    {!busy && lists.length > 0 && !platformLists[activePlatform].length && <p className="text-center text-sm text-slate-500">برای این پلتفرم تروفی یا اچیومنتی یافت نشد.</p>}
    {platformLists[activePlatform].map(list => <div key={list.key} className="min-w-0 space-y-3">
      <h3 dir="auto" className="text-sm font-semibold">{list.game.title} · {list.platform.toUpperCase()}</h3>
      <p role="status" className="text-sm text-green-700">{new Intl.NumberFormat('fa-IR').format(list.trophies.filter(trophy => trophyStatus(list, trophy).complete).length)} از {new Intl.NumberFormat('fa-IR').format(list.total)} تروفی: ثبت، ترجمه و آپلود کامل</p>
      {list.game.compatible_platforms?.length > 0 && <p className="text-xs text-slate-500">قابل اجرا روی: <bdi>{list.game.compatible_platforms.join(' / ')}</bdi></p>}
      <div className="flex flex-wrap gap-2 text-sm">{Object.entries(list.counts).map(([grade, count]) => <span key={grade} title={grades[grade]} aria-label={`${grades[grade]}: ${count}`} className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800 ${trophyColors[grade] || trophyColors.silver}`}><Trophy className="size-3 shrink-0" strokeWidth={1.75} /><span className="tabular-nums">{new Intl.NumberFormat('fa-IR').format(count)}</span></span>)}</div>
      {!list.total ? <p className="text-sm text-slate-500">برای این نسخه تروفی ثبت نشده است.</p> : <>
        <p role="status" className={`text-xs ${listComplete(list) ? 'text-green-600' : failedLists[list.key] ? 'text-amber-600' : 'text-slate-500'}`}>{listComplete(list) ? '✓ ثبت تروفی‌ها، ترجمه و آپلود همهٔ تصاویر کامل شد.' : importing[list.key] ? 'در حال تکمیل ترجمه و آپلود تصاویر؛ لطفاً صبر کنید…' : failedLists[list.key] ? 'ترجمه یا آپلود بعضی موارد کامل نشده است؛ تلاش مجدد لازم است.' : gameId ? 'در انتظار شروع ترجمه و آپلود تصاویر…' : 'ترجمه و آپلود پس از ذخیرهٔ بازی انجام می‌شود.'}</p>
        {gameId && !listComplete(list) && failedLists[list.key] && <SendButton type="button" label="تلاش مجدد" icon={FiRotateCw} disabled={disabled || busy || isImporting} onClick={() => save(gameId, list.key)} />}
        <ul tabIndex={0} aria-label="کارت‌های تروفی و اچیومنت؛ برای دیدن موارد بیشتر افقی اسکرول کنید" className="flex min-w-0 items-start gap-4 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{list.trophies.map(trophy => <TrophyCard importing={Boolean(importing[list.key])} retryDisabled={disabled || busy || isImporting} importStatus={trophyStatus(list, trophy)} allowTranslation={!gameId && !list.stored} key={trophy.external_id} trophy={storedTrophy(list, trophy) || trophy} provider={list.provider} progress={list.account_progress?.find(row => row.external_id === trophy.external_id)} />)}</ul>
      </>}
      <a href={list.provider === 'openxbl' ? 'https://xbl.io' : list.provider === 'psn' ? 'https://www.playstation.com' : 'https://platprices.com'} target="_blank" rel="noreferrer" className="block text-xs text-slate-400">{list.provider === 'psn' ? 'PlayStation Network' : `Powered by ${list.provider === 'openxbl' ? 'OpenXBL' : 'PlatPrices'}`}</a>
    </div>)}
    </div>
    {[...new Set(errors)].map(error => <div key={error} className="space-y-2">
      <p role="alert" className="inline-flex max-w-full items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <FiAlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0 break-words">{error}</span>
      </p>
    </div>)}
  </section>;
});
