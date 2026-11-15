import React, { useEffect, useRef, useState } from 'react';
import { readApiResponse } from '../../utils/apiResponse';
import ZoomableImage from '../../components/shared/gallery/ZoomableImage';

const fields = {
  image: [['quality', 'کیفیت تصویر', 10, 100, 1], ['maxDimension', 'حداکثر ضلع', 320, 3840, 80]],
  preview: [['previewQuality', 'کیفیت پیش‌نمایش', 10, 80, 1], ['previewSize', 'اندازه پیش‌نمایش', 16, 256, 8], ['blur', 'بلور پیش‌نمایش', 0, 20, 1]],
  video: [['videoQuality', 'کیفیت ویدئو', 10, 90, 1]],
};
async function request(path = '', options = {}) {
  const response = await fetch(`/api/upload-settings${path}`, { credentials: 'same-origin', cache: 'no-store', ...options,
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, ...options.headers } });
  return readApiResponse(response);
}
const number = value => value.toLocaleString('fa-IR', { maximumFractionDigits: 1 });
const bytes = value => value >= 1024 * 1024 ? `${number(value / (1024 * 1024))} مگابایت` : `${number(value / 1024)} کیلوبایت`;
const sizePoints = { previewSize: [16, 32, 64, 128, 256], maxDimension: [320, 640, 1280, 1600, 1920, 2560, 3200, 3840] };
const gallery = [
  { id: 'black-ops-6', title: 'Black Ops 6', src: '/game-preview/compression-game-square.png', thumb: '/game-preview/bo6.jpg' },
  ...[['cyberpunk-2077', 'Cyberpunk 2077'], ['halo-infinite', 'Halo Infinite'], ['sea-of-thieves', 'Sea of Thieves'], ['starfield', 'Starfield']].map(([id, title]) => ({ id, title, src: `/game-preview/${id}.jpg`, thumb: `/game-preview/${id}-thumb.webp` })),
];
const galleryFiles = new Map();
function SettingRows({ group, settings, onChange, disabled }) {
  const id = React.useId();
  return <div className="divide-y divide-slate-100 dark:divide-slate-800">{fields[group].map(([key, label, min, max, step]) => {
    const points = sizePoints[key] ? [...new Set([...sizePoints[key], settings[key]])].sort((a, b) => a - b) : null;
    if (points) return <div key={key} className="space-y-2 py-3 text-xs">
      <div className="flex items-center justify-between gap-3"><label htmlFor={`${id}-${key}`} className="font-medium">{label}</label><output dir="ltr" className="rounded-md bg-slate-100 px-2 py-1.5 font-medium tabular-nums dark:bg-slate-800">{settings[key]} px</output></div>
      <div dir="rtl" className="relative h-14">
        <input id={`${id}-${key}`} dir="rtl" className="absolute inset-x-0 top-0 m-0 h-6 w-full cursor-pointer accent-blue-600 disabled:cursor-default" aria-label={label} aria-valuetext={`${settings[key]} px`} disabled={disabled} type="range" min={0} max={points.length - 1} step={1} value={points.indexOf(settings[key])} onChange={event => onChange(key, points[Number(event.target.value)])} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-0 h-6">{points.map((point, index) => <span key={point} className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${point <= settings[key] ? 'bg-blue-600' : 'bg-slate-400 dark:bg-slate-500'}`} style={{ left: `${100 - index / (points.length - 1) * 100}%` }} />)}</div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-7">{points.map((point, index) => <span key={point} dir="ltr" className={`absolute whitespace-nowrap text-[9px] tabular-nums ${point === settings[key] ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} style={{ left: `${100 - index / (points.length - 1) * 100}%`, transform: index === 0 ? 'translateX(-100%)' : index === points.length - 1 ? 'none' : 'translateX(-50%)' }}>{point} px</span>)}</div>
      </div>
    </div>;
    return <div key={key} className="space-y-2 py-3 text-xs">
      <div className="grid grid-cols-[7rem_minmax(0,1fr)_4.5rem] items-center gap-2 sm:gap-3">
        <label htmlFor={`${id}-${key}`} className="font-medium">{label}</label>
        <input id={`${id}-${key}`} dir="rtl" className="min-w-0 w-full accent-blue-600" aria-label={label} aria-valuetext={points ? `${settings[key]} px` : String(settings[key])} disabled={disabled} type="range" min={points ? 0 : min} max={points ? points.length - 1 : max} step={points ? 1 : step} value={points ? points.indexOf(settings[key]) : settings[key]} onChange={event => onChange(key, points ? points[Number(event.target.value)] : Number(event.target.value))} />
        <output dir={points ? 'ltr' : undefined} className="rounded-md bg-slate-100 px-1 py-1.5 text-center font-medium tabular-nums dark:bg-slate-800">{points ? `${settings[key]} px` : number(settings[key])}</output>
      </div>
    </div>;
  })}</div>;
}
function ImageComparison({ group, settings, onChange, disabled }) {
  const preview = group === 'preview', title = preview ? 'پیش‌نمایش کم‌حجم و بلور' : 'فشرده‌سازی تصویر';
  const [file, setFile] = useState(null), [originalImage, setOriginalImage] = useState(null), [sample, setSample] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const original = file && originalImage?.file === file ? originalImage.url : '';
  const sequence = useRef(0), inputId = React.useId();
  const [selected, setSelected] = useState(gallery[0].id), [loadingImage, setLoadingImage] = useState(false);
  const values = JSON.stringify(Object.fromEntries(fields[group].map(([key]) => [key, settings[key]])));
  useEffect(() => {
    const entry = gallery.find(item => item.id === selected);
    if (!entry) { setLoadingImage(false); return; }
    setFile(null); setSample(null); setError('');
    if (galleryFiles.has(entry.id)) { setFile(galleryFiles.get(entry.id)); setLoadingImage(false); return; }
    const controller = new AbortController();
    setLoadingImage(true);
    fetch(entry.src, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('تصویر نمونه دریافت نشد.');
      const blob = await response.blob(); if (controller.signal.aborted) return;
      const image = new File([blob], entry.src.split('/').pop(), { type: entry.src.endsWith('.png') ? 'image/png' : 'image/jpeg' });
      galleryFiles.set(entry.id, image); setFile(image);
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoadingImage(false); });
    return () => controller.abort();
  }, [selected]);
  useEffect(() => {
    if (!file) { setOriginalImage(null); return; }
    const url = URL.createObjectURL(file); setOriginalImage({ file, url }); return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const id = ++sequence.current; setSample(null); setBusy(false);
    if (!file) return;
    const controller = new AbortController(); setBusy(true);
    const timer = setTimeout(async () => {
      const form = new FormData(); form.append('image', file); form.append('settings', values);
      try { const result = await request('/preview', { method: 'POST', body: form, signal: controller.signal }); if (id === sequence.current) { setSample(result); setError(''); } }
      catch (error) { if (id === sequence.current && error.name !== 'AbortError') setError(error.message); }
      finally { if (id === sequence.current) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [file, values]);
  const outputBytes = sample ? (preview ? sample.previewBytes : sample.imageBytes) : null;
  const outputImage = sample ? (preview ? sample.preview : sample.image) : null;
  const reduction = sample ? (1 - outputBytes / sample.originalBytes) * 100 : 0;
  return <section aria-label={title} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
    <h3 className="text-sm font-semibold">{title}</h3><SettingRows group={group} settings={settings} onChange={onChange} disabled={disabled} />
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <h4 className="text-xs font-medium">قبل و بعد · {preview ? 'کم‌حجم و بلور' : 'تصویر اصلی'}</h4>
      <div className="flex items-center gap-2"><label htmlFor={inputId} className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">انتخاب تصویر
        <input id={inputId} aria-label={`انتخاب تصویر برای ${title}`} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
          const next = event.target.files?.[0]; event.target.value = ''; if (!next) return;
          if (next.size > 5 * 1024 * 1024) { setError('حداکثر حجم نمونه ۵ مگابایت است.'); return; }
          setSelected(null); setFile(next); setSample(null); setError('');
        }} /></label></div>
    </div>
    <div aria-label={`گالری بازی‌ها برای ${title}`} className="flex gap-2 overflow-x-auto py-1">
      {gallery.map(entry => <button key={entry.id} type="button" aria-label={`انتخاب ${entry.title}`} aria-pressed={selected === entry.id} title={entry.title} onClick={() => { if (entry.id !== selected) { setFile(null); setSample(null); setSelected(entry.id); } }} className={`shrink-0 overflow-hidden rounded-lg border-2 p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${selected === entry.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}>
        <img src={entry.thumb} alt={entry.title} width="64" height="64" className="h-16 w-16 rounded-md object-cover" loading="lazy" />
      </button>)}
    </div>
    <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span dir="auto">{gallery.find(entry => entry.id === selected)?.title || file?.name}</span><span>{loadingImage ? 'در حال دریافت تصویر…' : `${gallery.length} بازی`}</span></div>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    {original && <div className="grid grid-cols-2 gap-3">
      <figure className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="relative bg-slate-100 dark:bg-slate-800">
          <ZoomableImage src={original} alt={`قبل از ${title}`} />
          <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white">قبل</span>
          <span aria-label={`حجم اصلی: ${bytes(file.size)}`} className="pointer-events-none absolute bottom-2 right-2 max-w-[calc(100%-1rem)] rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-medium tabular-nums text-white shadow-sm backdrop-blur-sm">{bytes(file.size)}</span>
        </div>
      </figure>
      <figure aria-busy={busy} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="relative bg-slate-100 dark:bg-slate-800">
          {outputImage ? <ZoomableImage src={outputImage} alt={`بعد از ${title}`} /> : <div className="flex aspect-square items-center justify-center px-3 text-center text-xs text-slate-500">{busy ? 'در حال پردازش…' : 'نمونه آماده نیست'}</div>}
          <span className="pointer-events-none absolute right-2 top-2 rounded bg-blue-600 px-2 py-1 text-[10px] text-white">{preview ? 'بعد · کم‌حجم و بلور' : 'بعد · WebP'}</span>
          <span aria-label={preview ? 'حجم پیش‌نمایش' : 'حجم فشرده‌شده'} className="pointer-events-none absolute bottom-2 right-2 max-w-[calc(100%-1rem)] rounded-full bg-blue-600/95 px-2.5 py-1 text-[10px] font-medium tabular-nums text-white shadow-sm backdrop-blur-sm">{sample ? bytes(outputBytes) : '—'}</span>
        </div>
      </figure>
    </div>}
    {busy && <div role="status" className="text-xs text-blue-600"><progress aria-label={`پردازش ${title}`} className="block h-1 w-full" />در حال محاسبه حجم…</div>}
    {sample && <div className={`rounded-lg p-3 ${reduction >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
      <div className="flex items-center justify-between gap-2 text-sm"><span>{reduction >= 0 ? 'کاهش حجم' : 'افزایش حجم'}</span><strong className="text-lg tabular-nums">{number(Math.abs(reduction))}٪</strong></div>
      <div className="mt-1 flex justify-between gap-2 text-xs"><span>{reduction >= 0 ? 'حجم صرفه‌جویی‌شده' : 'حجم اضافه‌شده'}</span><span>{bytes(Math.abs(sample.originalBytes - outputBytes))}</span></div>
      <progress className="mt-2 block h-1.5 w-full accent-emerald-600" aria-label={`درصد کاهش حجم ${title}`} max="100" value={Math.max(0, reduction)} />
      {preview && <p className="mt-2 text-xs">{number(settings.previewSize)} × {number(settings.previewSize)} پیکسل · بلور {number(settings.blur)}</p>}
    </div>}
  </section>;
}
export default function UploadSettings({ embedded = false }) {
  const [settings, setSettings] = useState(null), [saving, setSaving] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { let active = true; request().then(value => { if (active) setSettings(value); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, []);
  function change(key, value) { setMessage(''); setSettings(current => ({ ...current, [key]: value })); }
  async function save() {
    setSaving(true); setError(''); setMessage('');
    try { await request('', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }); setMessage('تنظیمات برای همه آپلودهای بعدی ذخیره شد.'); }
    catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  return <section dir="rtl" className={`space-y-5 text-slate-800 dark:text-slate-100 ${embedded ? 'pt-5' : 'mt-8 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900'}`}>
    {!embedded && <h2 className="text-lg font-bold">تنظیمات آپلود رسانه</h2>}{error && <p role="alert" className="text-red-600">{error}</p>}
    {settings && <>
      <ImageComparison group="image" settings={settings} onChange={change} disabled={saving} />
      <ImageComparison group="preview" settings={settings} onChange={change} disabled={saving} />
      <section aria-label="فشرده‌سازی ویدئو" className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><h3 className="text-sm font-semibold">فشرده‌سازی ویدئو</h3><SettingRows group="video" settings={settings} onChange={change} disabled={saving} /></section>
      <button type="button" disabled={saving} onClick={save} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات برای همه آپلودها'}</button>
      {message && <p role="status" className="text-sm text-green-600">{message}</p>}
    </>}
  </section>;
}
