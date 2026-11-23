import React, { useRef, useState } from 'react';
import { uploadFilesToArvan, getUploadErrorMessage } from '../../utils/directUpload';
import { mediaBytes } from './mediaUploadUtils';

export default function MediaFileUpload({ gameTitle, kind, label, onUploaded, disabled, onBusyChange, options = {} }) {
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
  const lock = useRef(false);
  const [uploaded, setUploaded] = useState(null);
  const video = ['video', 'trailer', 'gameplay', 'micro_trailer'].includes(kind);
  async function upload(file) {
    if (!file || lock.current || disabled) return;
    if (!gameTitle?.trim()) { setError('ابتدا نام بازی را وارد کنید.'); return; }
    if (file.size > (video ? 100 : 5) * 1024 * 1024) { setError(video ? 'حداکثر حجم ویدئو ۱۰۰ مگابایت است.' : 'حداکثر حجم تصویر ۵ مگابایت است.'); return; }
    lock.current = true; setBusy(true); setProgress(0); setError(''); onBusyChange?.(true);
    try {
      const files = await uploadFilesToArvan({ files: file, fieldName: kind, endpoint: '/games/media/upload', options: { gameTitle, ...options }, onProgress: setProgress });
      if (!files[0]?.url) throw new Error('نشانی رسانه دریافت نشد.');
      onUploaded(files[0]);
      setUploaded(files[0]);
    } catch (error) { setError(getUploadErrorMessage(error)); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }
  return <div className="space-y-2 text-sm">
    <label className="block">{label || (video ? 'آپلود و فشرده‌سازی ویدئو' : 'آپلود و فشرده‌سازی تصویر')}<input className="mt-2 block w-full" type="file" disabled={busy || disabled} accept={video ? 'video/mp4,video/webm,video/ogg,video/quicktime' : 'image/png,image/jpeg,image/webp'} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} /></label>
    {busy && <div role="status"><progress aria-label="پیشرفت ارسال" className="w-full" max="100" value={progress} /><span>{progress < 100 ? `${progress}٪ ارسال` : 'در حال فشرده‌سازی و ذخیره در Cloudinary…'}</span></div>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {uploaded && <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{mediaBytes(uploaded.original_bytes)} ← {mediaBytes(uploaded.bytes)}</span>}
  </div>;
}
