import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import GameImageAsset, { UploadIcon } from './GameImageAsset';
export default function ScreenshotGallery({ value, onChange, gameTitle, disabled, onBusyChange, onPendingChange }) {
  const rows = useRef([]), counter = useRef(0), assets = useRef(new Map()), batch = useRef(false), active = useRef(new Set());
  const latest = useRef(); latest.current = { onChange, onBusyChange };
  const [batching, setBatching] = useState(false), [completed, setCompleted] = useState(0);
  let input; try { input = JSON.parse(value || '[]'); } catch { input = []; }
  if (!Array.isArray(input)) input = [];
  if (JSON.stringify(rows.current.map(row => row.url)) !== JSON.stringify(input)) rows.current = input.map(url => rows.current.find(row => row.url === url) || { id: ++counter.current, url });
  function update(next) { rows.current = next; latest.current.onChange(JSON.stringify(next.map(row => row.url))); }
  function uploadState(id, busy) { if (busy) active.current.add(id); else active.current.delete(id); latest.current.onBusyChange?.(batch.current || active.current.size > 0); }
  async function uploadAll() {
    if (batch.current || disabled) return;
    batch.current = true; setBatching(true); setCompleted(0); latest.current.onBusyChange?.(true);
    let failed = 0, uploaded = 0;
    const ids = rows.current.map(row => row.id);
    try {
      for (const id of ids) {
        try { const result = await assets.current.get(id)?.upload({ ignoreDisabled: true }); if (result) uploaded++; }
        catch { failed++; }
        setCompleted(count => count + 1);
      }
      if (failed) toast.error(`${failed} تصویر آپلود نشد؛ تصاویر موفق حفظ شدند. دوباره تلاش کنید.`);
      else toast.success(uploaded ? `${uploaded} تصویر آپلود شد.` : 'همه تصاویر قبلاً آپلود شده‌اند.');
    } finally { batch.current = false; setBatching(false); latest.current.onBusyChange?.(active.current.size > 0); }
  }
  return <section className="min-w-0 space-y-3">
    <div className="flex items-center justify-between gap-2"><h3 className="font-medium">اسکرین‌شات‌ها ({rows.current.length})</h3><button type="button" disabled={disabled || batching || !rows.current.length} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-50" onClick={uploadAll}><UploadIcon />{batching ? `${completed} / ${rows.current.length}` : 'آپلود همه تصاویر'}</button></div>
    <div tabIndex={0} aria-label="گالری اسکرین‌شات‌ها؛ برای دیدن تصاویر بیشتر افقی اسکرول کنید" className="flex min-w-0 flex-nowrap items-start gap-4 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{rows.current.map((row, index) => <div key={row.id} className="w-72 max-w-[85vw] shrink-0 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:w-96">
      <GameImageAsset onRemove={() => update(rows.current.filter(item => item.id !== row.id))} wide ref={asset => { if (asset) assets.current.set(row.id, asset); else assets.current.delete(row.id); }} value={row.url} onChange={url => update(rows.current.map(item => item.id === row.id ? { ...item, url } : item))} label={`اسکرین‌شات ${index + 1}`} fieldName="screenshot" gameTitle={gameTitle} disabled={disabled || batching} onUploading={busy => uploadState(row.id, busy)} onPendingChange={pending => onPendingChange?.(`screenshot-${row.id}`, pending)} />
    </div>)}</div>
    <button type="button" disabled={disabled || batching} className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-600 disabled:opacity-50" onClick={() => update([...rows.current, { id: ++counter.current, url: '' }])}>+ افزودن تصویر</button>
  </section>;
}
