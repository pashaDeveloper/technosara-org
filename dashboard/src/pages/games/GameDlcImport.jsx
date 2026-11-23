import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { FaPlaystation, FaSteam, FaXbox } from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';
import SendButton from '../../components/shared/button/SendButton';
import DlcCards, { dlcCover } from './DlcCards';
import GameSectionSkeleton from './GameSectionSkeleton';
import { nabApi } from '../../services/nab';
import { runDlcBatch, consoleFormSource, dlcKey } from './dlcFormUtils';
import { useSavedResourceStatusQuery } from './resourceStatusApi';

const api = nabApi.enhanceEndpoints({ addTagTypes: ['Catalog'] }).injectEndpoints({ endpoints: builder => ({
  discoverDraftSteamDlc: builder.mutation({ query: body => ({ url: '/games/dlc/discover', method: 'POST', body }) }),
  previewSteamDlc: builder.mutation({ query: body => ({ url: '/games/dlc/preview', method: 'POST', body }) }),
  importSteamDlc: builder.mutation({ query: ({ id, ...body }) => ({ url: `/games/${id}/dlc/import`, method: 'POST', body }), invalidatesTags: ['Catalog'] }),
}) });
const { useDiscoverDraftSteamDlcMutation, usePreviewSteamDlcMutation, useImportSteamDlcMutation } = api;
const message = error => error?.data?.description || error?.data?.message || error?.message || 'دریافت ناموفق بود؛ دوباره تلاش کنید.';

const providerName = provider => provider === 'playstation' ? 'PlayStation' : provider === 'xbox' ? 'Xbox' : 'Steam';
const providerIcons = { playstation: FaPlaystation, xbox: FaXbox, steam: FaSteam };
export default forwardRef(function GameDlcImport({ gameId, title, officialStores, offers, disabled, onBusyChange, autoFetch = true, storedItems = [], onPreviewChange }, ref) {
  const [discover] = useDiscoverDraftSteamDlcMutation(), [preview] = usePreviewSteamDlcMutation(), [importDlc] = useImportSteamDlcMutation();
  const [list, setList] = useState(null), [results, setResults] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('playstation');
  const [coverChecks, setCoverChecks] = useState({});
  const [coverRepairs, setCoverRepairs] = useState({});
  const tabId = useId();
  const generation = useRef(0), request = useRef(null), running = useRef(false);
  const resourceStatus = useSavedResourceStatusQuery(gameId, { skip: !gameId, pollingInterval: busy ? 2000 : 0, refetchOnMountOrArgChange: true });
  useEffect(() => { if (gameId && !busy) resourceStatus.refetch(); }, [busy, gameId]);
  const persisted = resourceStatus.data?.data?.dlc || storedItems;
  const displayResults = { ...results };
  for (const item of persisted) {
    const key = dlcKey(item);
    if (item.complete || !displayResults[key] || displayResults[key].state === 'error') displayResults[key] = { ...displayResults[key], ...item };
  }
  for (const [key, repair] of Object.entries(coverRepairs)) {
    if (repair.result) displayResults[key] = { ...displayResults[key], ...repair.result };
  }
  const formSource = consoleFormSource(title, officialStores, offers);
  const sourceKey = formSource ? JSON.stringify(formSource) : '[]';
  const previousSource = useRef(sourceKey);
  const input = formSource || {};
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  async function batch(items, targetId, version = generation.current) {
    return runDlcBatch(items, async item => {
      const completed = persisted.find(row => dlcKey(row) === dlcKey(item) && row.complete);
      if (targetId && (completed || results[dlcKey(item)]?.state === 'done')) return completed || results[dlcKey(item)];
      request.current = targetId ? importDlc({ ...input, id: targetId, provider: item.provider, app_id: item.app_id, parent_app_id: item.parent_app_id })
        : preview({ ...input, provider: item.provider, app_id: item.app_id, parent_app_id: item.parent_app_id });
      const response = await request.current.unwrap();
      return { ...response.data, registered: Boolean(targetId), translated: Boolean(targetId), uploaded: Boolean(targetId), complete: Boolean(targetId), state: targetId ? 'done' : 'ready' };
    }, (item, result) => setResults(previous => ({ ...previous, [dlcKey(item)]: { ...previous[dlcKey(item)], ...result } })), () => version === generation.current);
  }
  async function load(version = generation.current) {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setResults({}); setCoverChecks({}); setCoverRepairs({});
    try {
      request.current = discover(input);
      const response = await request.current.unwrap();
      if (version !== generation.current) return;
      const merged = [...new Map([...storedItems, ...response.data.items].map(item => [dlcKey(item), item])).values()];
      setList({ ...response.data, items: merged });
      await batch(response.data.items, gameId || null, version);
    } catch (error) { if (version === generation.current) setError(message(error)); }
    finally { if (version === generation.current) { running.current = false; setBusy(false); } }
  }
  useEffect(() => {
    const version = ++generation.current;
    request.current?.abort(); running.current = false;
    setList(null); setResults({}); setCoverChecks({}); setCoverRepairs({}); setError(''); setBusy(sourceKey !== '[]');
    const sourceChanged = previousSource.current !== sourceKey;
    previousSource.current = sourceKey;
    if (!autoFetch && !sourceChanged) {
      setList({ items: storedItems, errors: [] });
      setResults(Object.fromEntries(storedItems.map(item => [dlcKey(item), { ...item, state: item.complete ? 'done' : 'error' }])));
      setBusy(false); return;
    }
    const timer = sourceKey === '[]' ? null : setTimeout(() => load(version), 1000);
    return () => { clearTimeout(timer); ++generation.current; request.current?.abort(); };
  }, [sourceKey, gameId, autoFetch]);

  async function run(items, targetId) {
    if (running.current) return { saved: 0, failed: items.length };
    const version = generation.current;
    running.current = true; setBusy(true); setError('');
    try { return await batch(items, targetId, version); }
    finally { if (version === generation.current) { running.current = false; setBusy(false); } }
  }
  useImperativeHandle(ref, () => ({
    async save(id) {
      const pending = (list?.items || []).filter(item => displayResults[dlcKey(item)]?.state !== 'done');
      const report = await run(pending, id);
      return { ...report, failed: report.failed + (list?.errors?.length || 0) + (error ? 1 : 0) };
    },
  }));
  const items = list?.items || [];
  const repairingCover = Object.values(coverRepairs).some(repair => repair.pending);
  async function refreshCover(item) {
    const key = dlcKey(item);
    if (!gameId || busy || disabled || repairingCover) return;
    const version = generation.current;
    setCoverRepairs(previous => ({ ...previous, [key]: { ...previous[key], pending: true, error: '' } }));
    try {
      const { data } = await importDlc({
        ...input, id: gameId, provider: item.provider, app_id: item.app_id,
        parent_app_id: item.parent_app_id || displayResults[key]?.content?.source_data?.parent_app_id,
        refresh_cover: true,
      }).unwrap();
      if (version === generation.current) setCoverRepairs(previous => ({
        ...previous, [key]: { result: { ...data, state: data.complete ? 'done' : 'error' } },
      }));
    } catch (error) {
      if (version === generation.current) setCoverRepairs(previous => ({
        ...previous, [key]: { ...previous[key], pending: false, error: message(error) },
      }));
    }
  }
  const coverEntries = items.map(item => {
    const key = dlcKey(item);
    return { key, url: dlcCover(item, displayResults[key]) };
  }).filter(entry => entry.url);
  const pendingCovers = coverEntries.flatMap(({ key, url }) => {
    const check = coverChecks[key];
    return check?.url === url && check.state === 'loading' ? [{ key, ...check }] : [];
  });
  function reloadAllCovers() {
    const attempt = String(Date.now());
    const checks = coverEntries.map(({ key, url }) => {
      try {
        const retryUrl = new URL(url, window.location.href);
        retryUrl.searchParams.set('_cover_retry', attempt);
        return [key, { url, retryUrl: retryUrl.href, state: 'loading' }];
      } catch {
        return [key, { url, state: 'error' }];
      }
    });
    setCoverChecks(Object.fromEntries(checks));
  }
  function recordCoverCheck(key, url, src, state) {
    setCoverChecks(previous => {
      const check = previous[key]?.url === url ? previous[key] : undefined;
      if (src !== (check?.retryUrl || url) || check?.state === state) return previous;
      return { ...previous, [key]: { ...check, url, state } };
    });
  }
  const ready = items.filter(item => ['ready', 'done'].includes(displayResults[dlcKey(item)]?.state)).length;
  const done = items.filter(item => displayResults[dlcKey(item)]?.state === 'done').length;
  const providers = ['playstation', 'xbox', ...(items.some(item => item.provider === 'steam' || !item.provider) ? ['steam'] : [])];
  const visibleItems = items.filter(item => (item.provider || 'steam') === selectedProvider);
  const visibleDone = visibleItems.filter(item => {
    const key = dlcKey(item);
    const result = displayResults[key];
    return result?.state === 'done' && result.uploaded && coverChecks[key]?.state === 'loaded' && coverChecks[key].url === dlcCover(item, result);
  }).length;
  useEffect(() => { if (list) onPreviewChange?.(items.map(item => ({ ...item, ...results[dlcKey(item)] }))); }, [list, results, onPreviewChange]);
  return <section className="min-w-0 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-base font-semibold">DLC</h2>
      {sourceKey !== '[]' && <SendButton type="button" label="به‌روزرسانی" icon={FiRefreshCw} disabled={busy || disabled || repairingCover} onClick={() => load()} />}
    </div>
    {pendingCovers.map(({ key, url, retryUrl }) => <img key={key} hidden alt="" src={retryUrl} onLoad={event => recordCoverCheck(key, url, retryUrl, event.currentTarget.naturalWidth > 0 ? 'loaded' : 'error')} onError={() => recordCoverCheck(key, url, retryUrl, 'error')} />)}
    {busy && <p role="status" className="text-xs text-slate-500">در حال دریافت و ترجمه… {ready > 0 ? `${new Intl.NumberFormat('fa-IR').format(ready)} / ${new Intl.NumberFormat('fa-IR').format(items.length)}` : ''}</p>}
    <div role="tablist" aria-label="فروشگاه DLC" dir="ltr" className="mx-auto flex w-full max-w-3xl justify-center gap-2 sm:gap-3">
      {providers.map((provider, index) => {
        const Icon = providerIcons[provider] || FaSteam;
        const selected = selectedProvider === provider;
        return <button key={provider} id={`${tabId}-${provider}`} type="button" role="tab" aria-selected={selected} aria-controls={`${tabId}-panel`} tabIndex={selected ? 0 : -1} onClick={() => setSelectedProvider(provider)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? providers.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + providers.length) % providers.length;
          setSelectedProvider(providers[next]);
          event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
        }} className={`inline-flex min-h-12 min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-t-md border border-green-300 px-2 py-3 text-sm text-green-500 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-blue-600 dark:text-blue-500 dark:hover:bg-gray-900 dark:focus-visible:ring-blue-500 sm:px-4 ${selected ? 'border-b-4 border-b-green-500 bg-green-50 font-semibold dark:border-b-blue-500 dark:bg-gray-900' : ''}`}>
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          <span>{providerName(provider)}</span>
          <span className="rounded bg-green-100 px-1.5 tabular-nums text-green-700 dark:bg-blue-950 dark:text-blue-300">{new Intl.NumberFormat('fa-IR').format(items.filter(item => (item.provider || 'steam') === provider).length)}</span>
        </button>;
      })}
    </div>
    <div id={`${tabId}-panel`} role="tabpanel" tabIndex={0} className="min-w-0 border-t border-slate-200 pt-3 dark:border-slate-700" aria-labelledby={`${tabId}-${selectedProvider}`}>
      {coverEntries.length > 0 && <div dir="rtl" className="mb-3 flex justify-start">
        <SendButton type="button" label={pendingCovers.length ? 'در حال بارگیری کاورها…' : 'بارگیری دوبارهٔ همهٔ کاورها'} icon={FiRefreshCw} disabled={busy || disabled || repairingCover || pendingCovers.length > 0} onClick={reloadAllCovers} />
      </div>}
      <p role="status" dir="ltr" aria-label="تعداد DLCهای کامل‌شده از کل" className="mb-3 text-right text-sm text-green-700">{new Intl.NumberFormat('fa-IR').format(visibleDone)} / {new Intl.NumberFormat('fa-IR').format(visibleItems.length)}</p>
      <DlcCards items={visibleItems} results={displayResults} coverChecks={coverChecks} onCoverCheck={recordCoverCheck} coverRepairs={coverRepairs} onRefreshCover={gameId ? refreshCover : undefined} refreshDisabled={busy || disabled || repairingCover || pendingCovers.length > 0} />
      {!visibleItems.length && busy && <GameSectionSkeleton label="DLC: هنوز اطلاعاتی نمایش داده نشده است" />}
      {!visibleItems.length && !busy && sourceKey !== '[]' && <p className="py-2 text-center text-sm text-slate-400">DLCای یافت نشد.</p>}
    </div>
    {list && <>
        {items.some(item => displayResults[dlcKey(item)]?.state === 'error') && <button type="button" disabled={busy || disabled} onClick={() => run(items.filter(item => displayResults[dlcKey(item)]?.state === 'error'), gameId)} className="text-sm text-blue-600">تلاش دوباره فقط برای موارد ناقص</button>}
        {gameId && ready > done && <button type="button" disabled={busy || disabled} onClick={() => run(items.filter(item => results[dlcKey(item)]?.state === 'ready'), gameId)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">اتصال محتواها به بازی ذخیره‌شده</button>}
        {list.errors.length > 0 && <details className="text-xs text-red-600"><summary className="cursor-pointer">خطاهای دریافت ({list.errors.length})</summary>{list.errors.map(row => <p key={`${row.provider}:${row.app_id}`} className="mt-2">{providerName(row.provider)}: {row.message}</p>)}</details>}
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
});
