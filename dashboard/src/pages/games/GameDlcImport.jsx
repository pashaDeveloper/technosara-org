import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import DlcCards from './DlcCards';
import GameSectionSkeleton from './GameSectionSkeleton';
import { nabApi } from '../../services/nab';
import { runDlcBatch, consoleFormSource, dlcKey } from './dlcFormUtils';

const api = nabApi.enhanceEndpoints({ addTagTypes: ['Catalog'] }).injectEndpoints({ endpoints: builder => ({
  discoverDraftSteamDlc: builder.mutation({ query: body => ({ url: '/games/dlc/discover', method: 'POST', body }) }),
  previewSteamDlc: builder.mutation({ query: body => ({ url: '/games/dlc/preview', method: 'POST', body }) }),
  importSteamDlc: builder.mutation({ query: ({ id, ...body }) => ({ url: `/games/${id}/dlc/import`, method: 'POST', body }), invalidatesTags: ['Catalog'] }),
}) });
const { useDiscoverDraftSteamDlcMutation, usePreviewSteamDlcMutation, useImportSteamDlcMutation } = api;
const message = error => error?.data?.description || error?.data?.message || error?.message || 'دریافت ناموفق بود؛ دوباره تلاش کنید.';

const providerName = provider => provider === 'playstation' ? 'PlayStation' : provider === 'xbox' ? 'Xbox' : 'Steam';
export default forwardRef(function GameDlcImport({ gameId, title, officialStores, offers, disabled, onBusyChange, autoFetch = true, storedItems = [] }, ref) {
  const [discover] = useDiscoverDraftSteamDlcMutation(), [preview] = usePreviewSteamDlcMutation(), [importDlc] = useImportSteamDlcMutation();
  const [list, setList] = useState(null), [results, setResults] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [activeProvider, setActiveProvider] = useState('xbox');
  const generation = useRef(0), request = useRef(null), running = useRef(false);
  const formSource = consoleFormSource(title, officialStores, offers);
  const sourceKey = formSource ? JSON.stringify(formSource) : '[]';
  const input = formSource || {};
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  async function batch(items, targetId, version = generation.current) {
    return runDlcBatch(items, async item => {
      request.current = targetId ? importDlc({ id: targetId, provider: item.provider, app_id: item.app_id, parent_app_id: item.parent_app_id })
        : preview({ ...input, provider: item.provider, app_id: item.app_id, parent_app_id: item.parent_app_id });
      const response = await request.current.unwrap();
      return { ...response.data, state: targetId ? 'done' : 'ready' };
    }, (item, result) => setResults(previous => ({ ...previous, [dlcKey(item)]: { ...previous[dlcKey(item)], ...result } })), () => version === generation.current);
  }
  async function load(version = generation.current) {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setResults({});
    try {
      request.current = discover(input);
      const response = await request.current.unwrap();
      if (version !== generation.current) return;
      setList(response.data);
      await batch(response.data.items, gameId || null, version);
    } catch (error) { if (version === generation.current) setError(message(error)); }
    finally { if (version === generation.current) { running.current = false; setBusy(false); } }
  }
  useEffect(() => {
    const version = ++generation.current;
    request.current?.abort(); running.current = false;
    setList(null); setResults({}); setError(''); setBusy(sourceKey !== '[]');
    if (!autoFetch) {
      setList({ items: storedItems, errors: [] });
      setResults(Object.fromEntries(storedItems.map(item => [dlcKey(item), { ...item, state: 'done' }])));
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
      const pending = (list?.items || []).filter(item => results[dlcKey(item)]?.state !== 'done');
      const report = await run(pending, id);
      return { ...report, failed: report.failed + (list?.errors?.length || 0) + (error ? 1 : 0) };
    },
  }));
  const items = list?.items || [];
  const ready = items.filter(item => ['ready', 'done'].includes(results[dlcKey(item)]?.state)).length;
  const done = items.filter(item => results[dlcKey(item)]?.state === 'done').length;
  const visibleItems = items.filter(item => item.provider === activeProvider);
  return <section className="min-w-0 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">DLC</h2>
      {sourceKey !== '[]' && <button type="button" disabled={busy || disabled} onClick={() => load()} className="text-xs text-blue-600 disabled:opacity-50">به‌روزرسانی</button>}
    </div>
    <div role="tablist" aria-label="پلتفرم DLC" className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {['xbox', 'playstation'].map(provider => <button key={provider} id={`dlc-tab-${provider}`} aria-controls={`dlc-panel-${provider}`} role="tab" aria-selected={activeProvider === provider} tabIndex={activeProvider === provider ? 0 : -1} type="button" onClick={() => setActiveProvider(provider)} onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 'xbox' : event.key === 'End' ? 'playstation' : provider === 'xbox' ? 'playstation' : 'xbox';
          setActiveProvider(next); document.getElementById(`dlc-tab-${next}`)?.focus();
        }
      }} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeProvider === provider ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>
        {providerName(provider)}<span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-xs tabular-nums dark:bg-slate-600">{new Intl.NumberFormat('fa-IR').format(items.filter(item => item.provider === provider).length)}</span>
      </button>)}
    </div>
    {busy && <p role="status" className="text-xs text-slate-500">در حال دریافت و ترجمه… {ready > 0 ? `${new Intl.NumberFormat('fa-IR').format(ready)} / ${new Intl.NumberFormat('fa-IR').format(items.length)}` : ''}</p>}
    <div role="tabpanel" className="min-w-0" id={`dlc-panel-${activeProvider}`} aria-labelledby={`dlc-tab-${activeProvider}`}>
      <DlcCards items={visibleItems} results={results} />
      {!visibleItems.length && <GameSectionSkeleton label="DLC: هنوز اطلاعاتی نمایش داده نشده است" />}
      {!visibleItems.length && !busy && sourceKey !== '[]' && <p className="py-2 text-center text-sm text-slate-400">DLCای یافت نشد.</p>}
    </div>
    {list && <>
        {items.some(item => results[dlcKey(item)]?.state === 'error') && <button type="button" disabled={busy || disabled} onClick={() => run(items.filter(item => results[dlcKey(item)]?.state === 'error'), gameId)} className="text-sm text-blue-600">تلاش دوباره برای موارد ناموفق</button>}
        {gameId && ready > done && <button type="button" disabled={busy || disabled} onClick={() => run(items.filter(item => results[dlcKey(item)]?.state === 'ready'), gameId)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">اتصال محتواها به بازی ذخیره‌شده</button>}
        {list.errors.length > 0 && <details className="text-xs text-red-600"><summary className="cursor-pointer">خطاهای دریافت ({list.errors.length})</summary>{list.errors.map(row => <p key={`${row.provider}:${row.app_id}`} className="mt-2">{providerName(row.provider)}: {row.message}</p>)}</details>}
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
});
