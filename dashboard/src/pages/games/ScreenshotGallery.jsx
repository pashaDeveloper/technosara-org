import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiImage, FiUpload } from 'react-icons/fi';
import SendButton from '../../components/shared/button/SendButton';
import GameImageAsset from './GameImageAsset';
import { isStoredMedia } from './mediaUploadUtils';
import { useFetchCardCoverSourceMutation } from './StoreCoverPicker';

export default function ScreenshotGallery({ value, onChange, gameTitle, selectedXboxUrl, disabled, onBusyChange, onPendingChange }) {
  const [fetchMedia, { isLoading: fetchingXbox }] = useFetchCardCoverSourceMutation();
  const xboxRequest = useRef(null);
  useEffect(() => () => {
    xboxRequest.current?.abort();
    xboxRequest.current = null;
  }, [selectedXboxUrl]);
  const rows = useRef([]), counter = useRef(0), assets = useRef(new Map()), batch = useRef(false), active = useRef(new Set());
  const latest = useRef(); latest.current = { onChange, onBusyChange };
  const [batching, setBatching] = useState(false), [completed, setCompleted] = useState(0);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  let input; try { input = JSON.parse(value || '[]'); } catch { input = []; }
  if (!Array.isArray(input)) input = [];
  if (JSON.stringify(rows.current.map(row => row.url)) !== JSON.stringify(input)) rows.current = input.map(url => rows.current.find(row => row.url === url) || { id: ++counter.current, url });
  function update(next) { rows.current = next; latest.current.onChange(JSON.stringify(next.map(row => row.url))); }
  async function loadXboxScreenshots() {
    if (!selectedXboxUrl || xboxRequest.current) return;
    const request = fetchMedia({ provider: 'xbox', url: selectedXboxUrl, media: 'screenshots' });
    xboxRequest.current = request;
    try {
      const { data } = await request.unwrap();
      if (xboxRequest.current !== request) return;
      const urls = data?.screenshots || [];
      if (!urls.length) { toast.error('برای این نسخهٔ Xbox اسکرین‌شاتی پیدا نشد.'); return; }
      const existing = new Set(rows.current.map(row => row.url));
      const additions = urls.filter(url => !existing.has(url)).map(url => ({ id: ++counter.current, url }));
      if (additions.length) update([...rows.current, ...additions]);
    } catch (error) {
      if (xboxRequest.current === request) toast.error(error.data?.description || 'دریافت اسکرین‌شات از Xbox ناموفق بود.');
    } finally {
      if (xboxRequest.current === request) xboxRequest.current = null;
    }
  }
  function uploadState(id, busy) { if (busy) active.current.add(id); else active.current.delete(id); latest.current.onBusyChange?.(batch.current || active.current.size > 0); }
  async function uploadAll() {
    if (batch.current || disabled) return;
    batch.current = true; setBatching(true); setCompleted(0); latest.current.onBusyChange?.(true);
    let failed = 0, uploaded = 0;
    const ids = rows.current.map(row => row.id);
    try {
      for (const id of ids) {
        try { const result = await assets.current.get(id)?.upload({ ignoreDisabled: true, silent: true }); if (result) uploaded++; }
        catch { failed++; }
        setCompleted(count => count + 1);
      }
      if (failed) toast.error(`${failed} تصویر آپلود نشد؛ تصاویر موفق حفظ شدند. دوباره تلاش کنید.`);
      else toast.success(uploaded ? `${uploaded} تصویر آپلود شد.` : 'همه تصاویر قبلاً آپلود شده‌اند.');
    } finally { batch.current = false; setBatching(false); latest.current.onBusyChange?.(active.current.size > 0); }
  }
  return <section className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">اسکرین‌شات‌ها ({rows.current.length})</h3>{(batching || pendingIds.size > 0 || rows.current.some(row => row.url && !isStoredMedia(row.url))) && <SendButton type="button" label={batching ? `${completed} / ${rows.current.length}` : 'آپلود همه تصاویر'} icon={FiUpload} disabled={disabled || batching || !rows.current.length} onClick={uploadAll} />}</div>
    <div tabIndex={0} aria-label="گالری اسکرین‌شات‌ها؛ برای دیدن تصاویر بیشتر افقی اسکرول کنید" className="flex min-w-0 flex-nowrap items-start gap-4 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{rows.current.map((row, index) => <div key={row.id} className="w-72 max-w-[85vw] shrink-0 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:w-96">
      <GameImageAsset onRemove={() => update(rows.current.filter(item => item.id !== row.id))} wide ref={asset => { if (asset) assets.current.set(row.id, asset); else assets.current.delete(row.id); }} value={row.url} onChange={url => update(rows.current.map(item => item.id === row.id ? { ...item, url } : item))} label={`اسکرین‌شات ${index + 1}`} fieldName="screenshot" gameTitle={gameTitle} disabled={disabled || batching} onUploading={busy => uploadState(row.id, busy)} onPendingChange={pending => { setPendingIds(current => { if (current.has(row.id) === pending) return current; const next = new Set(current); pending ? next.add(row.id) : next.delete(row.id); return next; }); onPendingChange?.(`screenshot-${row.id}`, pending); }} />
    </div>)}</div>
    <div className="flex flex-wrap gap-2">
      <SendButton type="button" label="افزودن تصویر" icon={FiImage} disabled={disabled || batching} onClick={() => update([...rows.current, { id: ++counter.current, url: '' }])} />
      {selectedXboxUrl && <SendButton type="button" label="دریافت تصاویر از Xbox" icon={FiImage} disabled={disabled || batching || fetchingXbox} onClick={loadXboxScreenshots} />}
    </div>
  </section>;
}
