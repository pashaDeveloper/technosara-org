import React, { useEffect, useRef, useState } from 'react';
import ScreenshotGallery from './ScreenshotGallery';
import MediaFileUpload from './MediaFileUpload';
import { selectProviderStores } from './providerStoreUtils';
import { parseGameMetrics } from './gameFormUtils';
import { toast } from 'react-hot-toast';
import { FiUpload } from 'react-icons/fi';
import { importGameMedia, isCloudinaryMedia } from './mediaUploadUtils';
import Dropdown from '../../components/shared/select/Dropdown';
import PlatformInput from '../platforms/components/PlatformInput';

function ResolutionImage({ src, alt, className }) {
  const [resolution, setResolution] = useState(null);
  return <span className="relative block">
    <img src={src} alt={alt} loading="lazy" className={className}
      onLoad={event => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        setResolution(naturalWidth && naturalHeight ? `${naturalWidth} × ${naturalHeight}` : null);
      }}
      onError={() => setResolution(null)} />
    {resolution && <span dir="ltr" className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-1 text-xs font-medium tabular-nums text-white">{resolution}</span>}
  </span>;
}

export function ImageTrashIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" {...props}>
    <path d="M0 0h16v16H0z" fill="none" />
    <path fill="currentColor" d="M14 2h-4c0-1.103-.897-2-2-2S6 .897 6 2H2a.5.5 0 0 0 0 1h.54l.809 9.708A2.513 2.513 0 0 0 5.84 15h4.319a2.514 2.514 0 0 0 2.491-2.292L13.459 3h.54a.5.5 0 0 0 0-1zM8 1c.551 0 1 .449 1 1H7c0-.551.449-1 1-1m3.655 11.625A1.51 1.51 0 0 1 10.16 14H5.841a1.51 1.51 0 0 1-1.495-1.375L3.544 3h8.914l-.802 9.625zM7 5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 1 0m3 0v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 1 0" />
  </svg>;
}

function VideoEyeIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>;
}

function CopyVideoIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
    <path d="M0 0h24v24H0z" fill="none" />
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.242a2 2 0 0 0-.602-1.43L16.083 2.57A2 2 0 0 0 14.685 2H10a2 2 0 0 0-2 2" />
      <path d="M16 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2" />
    </g>
  </svg>;
}
async function copyVideoUrl(url) {
  try {
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy && !policy.allowsFeature('clipboard-write')) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    toast.success('آدرس ویدئو کپی شد.');
  } catch {
    toast.error('کپی آدرس ناموفق بود.');
  }
}

const ratingLabels = { mean: 'امتیاز کلی', count: 'تعداد ارزیابی‌ها', mean_players: 'امتیاز کاربران', count_players: 'تعداد نظر کاربران', mean_critics: 'امتیاز منتقدان', count_critics: 'تعداد نقدها' };
const timeLabels = { min: 'کمترین زمان (ساعت)', max: 'بیشترین زمان (ساعت)', mean: 'میانگین (ساعت)', median: 'میانه (ساعت)', mentions: 'تعداد گزارش‌ها' };
const fieldsFor = key => key === 'offers'
  ? [['store_name', 'فروشگاه'], ['platform', 'پلتفرم'], ['title', 'عنوان محصول'], ['url', 'لینک خرید'], ['price.value', 'قیمت فعلی', 'number'], ['price.initial', 'قیمت اولیه', 'number'], ['price.currency', 'واحد پول'], ['price.discount_percent', 'تخفیف (درصد)', 'number']]
  : key === 'official_stores' ? [['source', 'فروشگاه'], ['url', 'لینک محصول']]
  : key === 'twitch_videos' ? [['title', 'عنوان'], ['url', 'لینک ویدئو'], ['thumbnail_url', 'تصویر پیش‌نمایش'], ['creator_name', 'سازنده'], ['duration', 'مدت (ثانیه)', 'number'], ['language', 'زبان']]
  : [['name', 'نام'], ['value', 'شناسهٔ منبع']];
const get = (row, path) => path.split('.').reduce((value, key) => value?.[key], row) ?? '';
function put(row, path, value) {
  const parts = path.split('.');
  return parts.length === 1 ? { ...row, [path]: value } : { ...row, [parts[0]]: { ...row[parts[0]], [parts[1]]: value } };
}
const safeUrl = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
};
const videoFilePath = /\.(?:mp4|m4v|webm|ogg|ogv|mov)$/i;
const videoPageHost = /(?:^|\.)(?:youtube\.com|youtu\.be|youtube-nocookie\.com|twitch\.tv)$/i;
function directVideoUrl(value) {
  const safe = safeUrl(value);
  if (!safe || isCloudinaryMedia(safe)) return '';
  const url = new URL(safe);
  return url.protocol === 'https:' && !url.port && !videoPageHost.test(url.hostname.replace(/\.$/, '')) && videoFilePath.test(url.pathname) ? safe : '';
}
export function VideoPreview({ url, thumbnail, autoPlay = false }) {
  const safe = safeUrl(url);
  if (!safe) return null;
  const parsed = new URL(safe);
  const youtube = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com', 'youtu.be'].includes(parsed.hostname);
  const id = youtube ? (parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.pathname.startsWith('/embed/') ? parsed.pathname.split('/')[2] : parsed.searchParams.get('v')) : null;
  if (id && /^[\w-]{11}$/.test(id)) return <iframe className="aspect-video w-full rounded-lg" src={`https://www.youtube-nocookie.com/embed/${id}${autoPlay ? '?autoplay=1' : ''}`} title="پیش‌نمایش ویدئو" loading="lazy" allow="autoplay" allowFullScreen />;
  if (videoFilePath.test(parsed.pathname)) return <video className="aspect-video w-full rounded-lg bg-black" controls preload="none" src={safe} poster={safeUrl(thumbnail) || undefined} />;
  return <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
    {safeUrl(thumbnail) && <img src={safeUrl(thumbnail)} alt="" loading="lazy" className="h-full w-full object-cover" />}
    <a href={safe} target="_blank" rel="noreferrer" aria-label="مشاهده ویدئو در منبع" title="مشاهده ویدئو در منبع" className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-md bg-black/65 text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><VideoEyeIcon aria-hidden="true" className="h-5 w-5" /></a>
  </div>;
}

function EditableNumberBadge({ label, value, integer, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);
  const classes = 'inline-flex max-w-full cursor-text items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs leading-5 dark:border-slate-700 dark:bg-slate-800';
  function finish() {
    if (!cancelled.current) {
      const next = draft === '' ? undefined : Number(draft);
      if (next === undefined || (Number.isFinite(next) && next >= 0 && (!integer || Number.isInteger(next)))) onChange(next);
    }
    setEditing(false);
  }
  return editing ? <label className={classes + ' border-blue-400 ring-1 ring-blue-400'}><span className="text-slate-500 dark:text-slate-300">{label}</span><input autoFocus aria-label={label} type="number" min="0" step={integer ? 1 : 'any'} value={draft} onFocus={event => event.target.select()} onChange={event => setDraft(event.target.value)} onBlur={finish} onKeyDown={event => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      cancelled.current = event.key === 'Escape';
      event.currentTarget.blur();
    }
  }} className="h-5 w-14 appearance-none rounded border-0 bg-transparent p-0 text-center text-xs font-semibold focus:ring-0" /></label> : <button type="button" className={classes + ' hover:border-blue-400'} onClick={() => { cancelled.current = false; setDraft(value ?? ''); setEditing(true); }}><span className="text-slate-500 dark:text-slate-300">{label}</span><strong>{value == null ? '—' : new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(value)}</strong></button>;
}

function EmptyProviderSkeleton({ name, label }) {
  const media = ['screenshots', 'videos', 'twitch_videos'].includes(name);
  return <div role="img" aria-label={`${label}: موردی اضافه نشده است`} className="motion-safe:animate-pulse">
    {media ? <div aria-hidden="true" className="flex gap-3 overflow-hidden pb-3">
      {[0, 1].map(index => <div key={index} className="aspect-video w-72 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 sm:w-96" />)}
    </div> : <div aria-hidden="true" className="space-y-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: name === 'offers' ? 8 : 2 }, (_, index) => <div key={index} className="space-y-2">
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>)}
      </div>
    </div>}
  </div>;
}

export default function ProviderField({ name, label, value, onChange, stores, platforms, gameTitle, selectedXboxUrl, disabled, onBusyChange, onPendingChange }) {
  const clearedStores = useRef(new Set());
  const [editingIndex, setEditingIndex] = useState(null);
  const [importingVideo, setImportingVideo] = useState(null);
  const videoRequest = useRef(null);
  const currentRows = useRef([]);
  const reportBusy = useRef(onBusyChange);
  reportBusy.current = onBusyChange;
  useEffect(() => () => {
    if (!videoRequest.current) return;
    videoRequest.current.abort();
    reportBusy.current?.(false);
  }, []);
  const storeKey = row => JSON.stringify([row.url, row.source, row.store_name]);
  useEffect(() => {
    if (!['official_stores', 'offers'].includes(name) || !stores?.data?.data?.length) return;
    let rows;
    try { rows = JSON.parse(value || '[]'); } catch { return; }
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object')) return;
    const next = selectProviderStores(rows, stores.data.data).map((row, index) => clearedStores.current.has(storeKey(rows[index])) ? rows[index] : row);
    if (next.some((row, index) => row !== rows[index])) onChange(JSON.stringify(next));
  }, [name, value, stores?.data, onChange]);
  const objectField = ['rating', 'playtime'].includes(name);
  let data;
  try { data = objectField ? parseGameMetrics(value) : JSON.parse(value || '[]'); } catch { data = objectField ? {} : []; }
  currentRows.current = data;
  const update = next => onChange(JSON.stringify(next));
  const rowVideoUrl = row => name === 'videos' ? row : row?.url;
  async function uploadVideo(index, url) {
    if (!url || disabled || videoRequest.current) return;
    if (!gameTitle?.trim()) { toast.error('ابتدا نام بازی را وارد کنید.'); return; }
    const controller = new AbortController();
    videoRequest.current = controller;
    setImportingVideo(index);
    reportBusy.current?.(true);
    try {
      const file = await importGameMedia(url, gameTitle, 'video', {}, controller.signal);
      const rows = currentRows.current;
      if (controller.signal.aborted || directVideoUrl(rowVideoUrl(rows[index])) !== url) return;
      update(rows.map((row, i) => i !== index ? row : name === 'videos'
        ? file.url
        : { ...row, url: file.url, thumbnail_url: file.blur?.url || row.thumbnail_url }));
      toast.success('ویدئو آپلود شد.');
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error.message || 'آپلود مستقیم ویدئو ناموفق بود.');
    } finally {
      videoRequest.current = null;
      if (!controller.signal.aborted) {
        setImportingVideo(null);
        reportBusy.current?.(false);
      }
    }
  }
  const input = (label, value, change, type = 'text', extra = {}) => <label className="flex min-w-0 flex-col gap-1 text-sm"><span>{label}</span><PlatformInput dir="auto" type={type} value={value} onChange={event => change(event.target.value)} {...extra} /></label>;
  const number = value => value === '' ? undefined : Number(value);
  if (name === 'screenshots') return <ScreenshotGallery value={value} onChange={onChange} gameTitle={gameTitle} selectedXboxUrl={selectedXboxUrl} disabled={disabled} onBusyChange={onBusyChange} onPendingChange={onPendingChange} />;
  if (['offers', 'official_stores'].includes(name)) {
    if (!Array.isArray(data) || !data.length) return null;
    return <div className="space-y-3"><h3 className="font-medium">{label} <span className="text-xs text-slate-500">({new Intl.NumberFormat('fa-IR').format(data.length)})</span></h3><div className="flex flex-wrap gap-2">{data.map((row, index) => {
      const storeId = row.store_id?._id || row.store_id;
      const store = stores?.data?.data?.find(item => item._id === storeId);
      const text = [store?.name_fa || store?.name || store?.name_en || row.store_name || row.source || 'فروشگاه', row.platform, row.price?.value == null ? '' : `${new Intl.NumberFormat('fa-IR').format(row.price.value)} ${row.price.currency || ''}`].filter(Boolean).join(' · ');
      const href = safeUrl(row.url);
      const classes = 'inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
      return href ? <a key={index} href={href} target="_blank" rel="noreferrer" title={row.title || row.url} className={classes + ' hover:border-blue-400'}>{text}<span aria-hidden="true">↗</span></a> : <span key={index} className={classes}>{text}</span>;
    })}</div></div>;
  }
  if (name === 'rating') {
    const score = typeof data.mean === 'number' ? Math.min(1, Math.max(0, data.mean)) : null;
    const numberFormat = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
    const groups = [['mean', 'count', 'کلی'], ['mean_players', 'count_players', 'کاربران'], ['mean_critics', 'count_critics', 'منتقدان']];
    return <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <h3 className="font-semibold">امتیازها و بررسی‌ها</h3>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="shrink-0 text-center sm:min-w-28">
          <div className="text-5xl font-medium tabular-nums" aria-label={score == null ? 'امتیاز موجود نیست' : `امتیاز ${numberFormat.format(score * 10)} از ۱۰`}>{score == null ? '—' : numberFormat.format(score * 10)}</div>
          <div dir="ltr" aria-hidden="true" className="relative mx-auto mt-2 w-fit text-xl leading-none tracking-widest text-slate-200 dark:text-slate-600"><span>★★★★★★★★★★</span><span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-emerald-600" style={{ width: `${(score || 0) * 100}%` }}>★★★★★★★★★★</span></div>
          <p className="mt-3 text-xs text-slate-500">{data.count == null ? 'تعداد ارزیابی نامشخص' : `${numberFormat.format(data.count)} ارزیابی`}</p>
          <p className="mt-1 text-xs text-slate-400">از ۱۰ امتیاز</p>
        </div>
        <div className="min-w-0 flex-1 space-y-4">{groups.map(([key, count, text]) => {
          const value = typeof data[key] === 'number' ? data[key] : null;
          return <div key={key} className="space-y-1.5"><div className="flex items-center justify-between gap-3 text-xs"><span>{text}</span><span className="text-slate-500">{value == null ? 'امتیاز موجود نیست' : `${numberFormat.format(value * 10)} از ۱۰`}{data[count] != null ? ` · ${numberFormat.format(data[count])} ارزیابی` : ''}</span></div>
            <div role={value == null ? undefined : 'meter'} aria-label={`امتیاز ${text}`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value == null ? undefined : value * 10} className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(1, Math.max(0, value || 0)) * 100}%` }} /></div>
          </div>;
        })}</div>
      </div>
      <details className="border-t border-slate-100 pt-3 dark:border-slate-700"><summary className="cursor-pointer text-sm text-slate-500">ویرایش امتیازها و تعداد ارزیابی‌ها</summary><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{Object.entries(ratingLabels).map(([key, text]) => {
        const mean = key.startsWith('mean');
        return <React.Fragment key={key}>{input(mean ? `${text} (از ۱۰)` : text, data[key] == null ? '' : mean ? Number((data[key] * 10).toFixed(4)) : data[key], val => update({ ...data, [key]: val === '' ? undefined : mean ? Number(val) / 10 : number(val) }), 'number', { min: 0, ...(mean ? { max: 10, step: 'any' } : { step: 1 }) })}</React.Fragment>;
      })}</div></details>
    </div>;
  }
  if (name === 'playtime') return <div className="space-y-3"><h3 className="font-medium">{label}</h3><div className="flex flex-wrap gap-2">{Object.entries(timeLabels).map(([key, text]) => <EditableNumberBadge key={key} label={text} value={data[key]} integer={key === 'mentions'} onChange={next => update({ ...data, [key]: next })} />)}</div></div>;
  if (objectField) {
    const labels = name === 'rating' ? ratingLabels : timeLabels;
    return <div className="space-y-3"><h3 className="font-medium">{label}</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{Object.entries(labels).map(([key, text]) => {
      const score = name === 'rating' && key.startsWith('mean');
      return <React.Fragment key={key}>{input(score ? `${text} (از ۱۰۰)` : text, data[key] == null ? '' : score ? Number((data[key] * 100).toFixed(4)) : data[key], val => update({ ...data, [key]: val === '' ? undefined : score ? Number(val) / 100 : number(val) }), 'number', { min: 0, ...(score ? { max: 100, step: 'any' } : { step: name === 'rating' || key === 'mentions' ? 1 : 'any' }) })}</React.Fragment>;
    })}</div></div>;
  }
  const strings = ['screenshots', 'videos'].includes(name);
  if (strings || name === 'twitch_videos') return <div className="min-w-0 space-y-3">
    <h3 className="font-medium">{label} <span className="text-sm text-slate-500">({data.length})</span></h3>
    {!data.length && <EmptyProviderSkeleton name={name} label={label} />}
    <div className="flex gap-3 overflow-x-auto pb-3">{data.map((row, i) => {
      const fileUrl = directVideoUrl(rowVideoUrl(row));
      const uploading = importingVideo === i;
      return <div key={i} className="relative w-72 shrink-0 sm:w-96">
      {name === 'screenshots' && safeUrl(row) && <a href={safeUrl(row)} target="_blank" rel="noreferrer"><ResolutionImage key={safeUrl(row)} src={safeUrl(row)} alt={`تصویر بازی ${i + 1}`} className="aspect-video w-full rounded-lg bg-slate-100 object-cover" /></a>}
      {name === 'videos' && <VideoPreview url={row} />}
      {name === 'twitch_videos' && <VideoPreview url={row.url} thumbnail={row.thumbnail_url} />}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button type="button" disabled={disabled || importingVideo !== null} aria-label={`حذف مورد ${i + 1} از ${label}`} title="حذف" className="flex h-8 w-8 items-center justify-center rounded-md bg-black/65 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-40" onClick={() => { update(data.filter((_, j) => j !== i)); setEditingIndex(null); }}><ImageTrashIcon aria-hidden="true" className="h-4 w-4" /></button>
        {fileUrl && <button type="button" aria-label={`آپلود مستقیم ویدئو ${i + 1}`} title="آپلود مستقیم ویدئو" aria-busy={uploading} disabled={disabled || importingVideo !== null} onClick={() => uploadVideo(i, fileUrl)} className="flex h-8 w-8 items-center justify-center rounded-md bg-black/65 text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"><FiUpload aria-hidden="true" className="h-4 w-4" /></button>}
        {name !== 'screenshots' && <button type="button" aria-label={`کپی آدرس ویدئو ${i + 1}`} title="کپی آدرس ویدئو" disabled={!safeUrl(name === 'videos' ? row : row.url)} className="flex h-8 w-8 items-center justify-center rounded-md bg-black/65 text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40" onClick={() => copyVideoUrl(name === 'videos' ? row : row.url)}><CopyVideoIcon aria-hidden="true" className="h-5 w-5" /></button>}
      </div>
      {uploading && <span role="status" className="absolute bottom-3 right-2 rounded-md bg-black/75 px-2 py-1 text-xs text-white">در حال دریافت و آپلود ویدئو…</span>}
    </div>;
    })}</div>
  </div>;
  const replace = (i, row) => update(data.map((item, j) => j === i ? row : item));
  const badges = ['offers', 'official_stores'].includes(name);
  const badgeLabel = row => {
    const storeId = row.store_id?._id || row.store_id;
    const store = stores?.data?.data?.find(item => item._id === storeId);
    const storeName = store?.name_fa || store?.name || store?.name_en || row.store_name || row.source || 'فروشگاه';
    const price = row.price?.value;
    return [storeName, row.platform, price == null ? '' : `${new Intl.NumberFormat('fa-IR').format(price)} ${row.price?.currency || ''}`].filter(Boolean).join(' · ');
  };
  return <div className="space-y-3"><h3 className="font-medium">{label} <span className="text-sm text-slate-500">({data.length})</span></h3>
    {badges && <div className="flex flex-wrap gap-2">{data.map((row, i) => <button type="button" key={i} aria-expanded={editingIndex === i} title="ویرایش" onClick={() => setEditingIndex(editingIndex === i ? null : i)} className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${editingIndex === i ? 'border-blue-400 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}><span className="truncate">{badgeLabel(row)}</span><span aria-hidden="true">✎</span></button>)}{!data.length && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500 dark:bg-slate-800">موردی ثبت نشده</span>}</div>}
    {!data.length && !badges && <EmptyProviderSkeleton name={name} label={label} />}
    <div className={strings || name === 'twitch_videos' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'space-y-3'}>{data.map((row, i) => badges && editingIndex !== i ? null : <div key={i} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      {name === 'screenshots' && safeUrl(row) && <a href={safeUrl(row)} target="_blank" rel="noreferrer"><ResolutionImage key={safeUrl(row)} src={safeUrl(row)} alt={`تصویر بازی ${i + 1}`} className="aspect-video w-full rounded-lg bg-slate-100 object-contain" /></a>}
      {name === 'videos' && <VideoPreview url={row} />}
      {name === 'twitch_videos' && <VideoPreview url={row.url} thumbnail={row.thumbnail_url} />}
      {strings ? input(name === 'screenshots' ? 'نشانی تصویر' : 'نشانی ویدئو', row, val => replace(i, val), 'url') : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fieldsFor(name).map(([key, text, type]) => {
        const relation = ['store_name', 'source'].includes(key) ? { id: 'store_id', query: stores } : key === 'platform' ? { id: 'platform_id', query: platforms } : null;
        if (relation) {
          const rows = relation.query?.data?.data || [];
          const options = rows.map(item => ({ value: item._id, label: item.name || item.name_en }));
          const selected = typeof row[relation.id] === 'object' ? row[relation.id]?._id : row[relation.id];
          return <div key={key} className="space-y-1"><Dropdown label={text} inputComponent={PlatformInput} options={options} value={selected || ''} disabled={relation.query?.isFetching} error={relation.query?.error ? 'دریافت فهرست ناموفق بود' : undefined} onChange={id => {
            if (relation.id === 'store_id') {
              if (id) clearedStores.current.delete(storeKey(row));
              else clearedStores.current.add(storeKey(row));
            }
            replace(i, { ...row, [relation.id]: id || null });
          }} />
            {row[key] && <p className="text-xs text-slate-500">منبع: {row[key]}</p>}
            {relation.query?.error && <button type="button" className="text-xs text-blue-600" onClick={() => relation.query.refetch()}>تلاش دوباره</button>}
          </div>;
        }
        return <React.Fragment key={key}>{input(text, get(row, key), val => replace(i, put(row, key, type === 'number' ? number(val) : val)), type || (['url', 'thumbnail_url'].includes(key) ? 'url' : 'text'), type === 'number' ? { min: 0, step: 'any', ...(key === 'price.discount_percent' ? { max: 100 } : {}) } : {})}</React.Fragment>;
      })}</div>}
      <button type="button" aria-label={`حذف مورد ${i + 1} از ${label}`} title="حذف این مورد" className="flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onClick={() => { update(data.filter((_, j) => j !== i)); setEditingIndex(null); }}><ImageTrashIcon aria-hidden="true" className="h-4 w-4" /></button>
    </div>)}</div>
    {['screenshots', 'videos', 'twitch_videos'].includes(name) && <MediaFileUpload gameTitle={gameTitle} kind={name === 'screenshots' ? 'screenshot' : 'video'} disabled={disabled} onBusyChange={onBusyChange} onUploaded={file => update([...data, name === 'twitch_videos' ? { url: file.url, thumbnail_url: file.blur?.url } : file.url])} />}
    <button type="button" className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-600" onClick={() => { update([...data, strings ? '' : {}]); if (badges) setEditingIndex(data.length); }}>افزودن {name === 'screenshots' ? 'تصویر' : name === 'videos' || name === 'twitch_videos' ? 'ویدئو' : 'مورد'}</button>
  </div>;
}
