import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import ProfileImageSelector from '../../components/shared/gallery/ProfileImageSelector';
import ZoomableImage from '../../components/shared/gallery/ZoomableImage';
import { uploadFilesToArvan, getUploadErrorMessage } from '../../utils/directUpload';
import { importGameImage, isCloudinaryMedia, mediaBytes } from './mediaUploadUtils';
export function UploadIcon() { return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg>; }
function DeviceIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M8 21h8m-4-5v5" /></svg>; }
function DeleteIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>; }
function MirrorIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v18" strokeDasharray="2 2" />
    <path d="M8 6 3 18h5V6ZM16 6l5 12h-5V6Z" />
  </svg>;
}
export default forwardRef(function GameImageAsset({ value, onChange, onRemove, onUploading, disabled, gameTitle, fieldName = 'thumbnail', label = 'تصویر بازی', wide, portrait, animated, sourcePicker, options = {}, onPendingChange, mirrored, onToggleMirror }, ref) {
  const [pending, setPending] = useState(null), [uploaded, setUploaded] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0);
  const objectUrl = useRef(null), lock = useRef(false), mounted = useRef(true), inputId = React.useId();
  const deviceTrigger = useRef(null), selection = useRef(0);
  const latest = useRef(); latest.current = { onChange, onUploading, onPendingChange };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); latest.current.onPendingChange?.(false); if (lock.current) latest.current.onUploading?.(false); }; }, []);
  useEffect(() => { if (value && pending) { setPending(null); latest.current.onPendingChange?.(false); } }, [value]);
  async function stage(file) {
    if (!file || lock.current || disabled) return;
    const formats = animated ? ['image/gif', 'image/webp'] : ['image/png', 'image/jpeg', 'image/webp'];
    if (!formats.includes(file.type) || file.size > 5 * 1024 * 1024) { setError('تصویر معتبر تا ۵ مگابایت انتخاب کنید.'); return; }
    const version = ++selection.current;
    const url = URL.createObjectURL(file);
    if (fieldName === 'screenshot') {
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
        if (!mounted.current || selection.current !== version) {
          URL.revokeObjectURL(url);
          return;
        }
        if (image.naturalHeight > image.naturalWidth) {
          URL.revokeObjectURL(url);
          setError('برای گالری تصویر عمودی انتخاب نکنید.');
          return;
        }
      } catch {
        URL.revokeObjectURL(url);
        if (mounted.current && selection.current === version) setError('فایل تصویر معتبر نیست.');
        return;
      }
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = url;
    setPending({ file, url }); setUploaded(null); setError('');
    latest.current.onChange(''); latest.current.onPendingChange?.(true, objectUrl.current);
  }
  function stageSource(url) {
    if (!url || lock.current || disabled) return;
    ++selection.current;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setPending({ url });
    setError('');
    latest.current.onPendingChange?.(true, url);
  }
  async function upload({ ignoreDisabled = false, silent = false } = {}) {
    if (!pending && (isCloudinaryMedia(value) || uploaded?.url === value)) return null;
    if (lock.current || (!ignoreDisabled && disabled) || (!pending && !value)) return null;
    if (!gameTitle?.trim()) { setError('ابتدا نام بازی را انتخاب کنید.'); throw new Error('نام بازی موجود نیست.'); }
    lock.current = true; setBusy(true); setError(''); setProgress(0); latest.current.onUploading?.(true);
    try {
      const result = pending?.file ? (await uploadFilesToArvan({ files: pending.file, fieldName, endpoint: '/games/media/upload', options: { ...options, gameTitle }, onProgress: setProgress, showProgressToast: false }))[0] : await importGameImage(pending?.url || value, gameTitle, fieldName, options);
      if (!result?.url) throw new Error('نشانی فایل دریافت نشد.');
      if (mounted.current) { setUploaded(result); setPending(null); latest.current.onPendingChange?.(false); latest.current.onChange(result.url); }
      if (!silent) toast.success('تصویر آپلود شد.'); return result;
    } catch (error) { if (mounted.current) setError(getUploadErrorMessage(error)); throw error; }
    finally { lock.current = false; if (mounted.current) { setBusy(false); latest.current.onUploading?.(false); } }
  }
  useImperativeHandle(ref, () => ({ upload }));
  const displayed = pending?.url || value, finished = !pending && (isCloudinaryMedia(value) || uploaded?.url === value);
  const detailBanner = fieldName === 'detail_banner';
  const aspectClass = wide || detailBanner ? 'aspect-video' : portrait ? 'aspect-[2/3]' : 'aspect-square';
  const deviceLabel = displayed ? 'تغییر از دستگاه' : 'انتخاب از دستگاه';
  const iconClass = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950/75 text-white backdrop-blur-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50';
  const trigger = ({ onClick, disabled: blocked }) => <button ref={deviceTrigger} type="button" disabled={blocked} onClick={onClick} title={deviceLabel} aria-label={`${deviceLabel}؛ ${label}`} className={iconClass}><DeviceIcon /></button>;
  const selector = animated || detailBanner || fieldName === 'screenshot' ? <><input id={inputId} className="sr-only" type="file" accept={animated ? "image/gif,image/webp" : "image/jpeg,image/png,image/webp"} disabled={disabled || busy} onChange={event => { stage(event.target.files?.[0]); event.target.value = ''; }} /><button ref={deviceTrigger} type="button" disabled={disabled || busy} title={deviceLabel} aria-label={`${deviceLabel}؛ ${label}`} onClick={() => document.getElementById(inputId)?.click()} className={iconClass}><DeviceIcon /></button></> : <ProfileImageSelector deviceOnly disabled={disabled || busy} editorTitle={label} editorWidth={wide ? 1920 : 800} editorHeight={wide ? 1080 : portrait ? 1200 : 800} onImageSelect={stage} renderTrigger={trigger} />;
  return <div className="min-w-0 space-y-2" onPaste={event => { const file = [...event.clipboardData.files].find(item => item.type.startsWith('image/')); if (file) { event.preventDefault(); event.stopPropagation(); stage(file); } }}>
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      {displayed ? <ZoomableImage src={displayed} alt={label} aspectClass={aspectClass} mirrored={mirrored} /> : <button type="button" disabled={disabled || busy} aria-label={`انتخاب ${label} از دستگاه`} onClick={() => deviceTrigger.current?.click()} className={`${aspectClass} flex w-full items-center justify-center text-4xl text-slate-400 disabled:opacity-50`}>+</button>}
      {sourcePicker && <div className="absolute bottom-2 left-2">{typeof sourcePicker === "function" ? sourcePicker(stageSource) : sourcePicker}</div>}
      <div className="absolute right-1 top-1 flex items-center gap-1">
        {selector}
        {displayed && onToggleMirror && <button type="button" aria-label="قرینه‌کردن افقی تصویر" title="قرینه‌کردن افقی تصویر" aria-pressed={Boolean(mirrored)} disabled={disabled || busy} className={`${iconClass} aria-pressed:!bg-blue-600`} onClick={onToggleMirror}><MirrorIcon /></button>}
        {displayed && !finished && <button type="button" title={'آپلود تصویر'} aria-label={`آپلود ${label}`} disabled={disabled || busy} className={iconClass} onClick={() => { void upload().catch(() => {}); }}><UploadIcon /></button>}
        {(displayed || onRemove) && <button type="button" disabled={disabled || busy} aria-label={`حذف ${label}`} title="حذف" className={`${iconClass} hover:!bg-red-600`} onClick={() => { setPending(null); setUploaded(null); latest.current.onPendingChange?.(false); if (pending && !pending.file) return; if (onRemove) onRemove(); else onChange(''); }}><DeleteIcon /></button>}
      </div>
      {uploaded && uploaded.url === value && <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-slate-950/85 px-2 py-1 text-[10px] text-white">{mediaBytes(uploaded.bytes)}</span>}
      {busy && <div role="status" aria-label="در حال آپلود تصویر" className="absolute inset-0 flex items-center justify-center bg-black/20"><svg className="h-10 w-10 animate-spin text-white drop-shadow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></div>}
    </div>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
});
