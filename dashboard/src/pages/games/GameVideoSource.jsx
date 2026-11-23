import React, { useEffect, useRef, useState } from 'react';
import { useFetchGameVideoSourcesMutation } from '../../services/games/gameApi';
import { importGameMedia, isCloudinaryMedia } from './mediaUploadUtils';
import { VideoPreview } from './ProviderField';
import { FiCheck, FiDownload, FiImage, FiPlay, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import SendButton from '../../components/shared/button/SendButton';

function storeUrls(value) {
  try {
    const rows = JSON.parse(value || '[]');
    return Array.isArray(rows) ? rows.map(row => row?.url).filter(Boolean) : [];
  } catch { return []; }
}

function SourcePreview({ url, thumbnail }) {
  const player = useRef(null);
  const [played, setPlayed] = useState('');
  const youtube = /^https?:\/\/(?:[\w-]+\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(url);
  const previewKey = JSON.stringify([url, thumbnail]);
  const hls = /\.m3u8(?:[?#]|$)/i.test(url);
  useEffect(() => {
    if (!hls) return;
    const video = player.current;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      return;
    }
    let active = true;
    let stream;
    import('hls.js').then(({ default: Hls }) => {
      if (!active || !Hls.isSupported()) return;
      stream = new Hls({ maxBufferLength: 8, maxMaxBufferLength: 12 });
      stream.loadSource(url);
      stream.attachMedia(video);
    }).catch(() => {});
    return () => { active = false; stream?.destroy(); };
  }, [hls, url]);
  if (youtube && thumbnail && played !== previewKey) {
    return <button type="button" className="relative block aspect-video w-full bg-black"
      aria-label="پخش ویدئو" onClick={() => setPlayed(previewKey)}>
      <img src={thumbnail} alt="" className="h-full w-full object-contain" />
      <span className="absolute inset-0 grid place-items-center"><FiPlay aria-hidden="true" className="h-10 w-10 rounded-full bg-black/70 p-2 text-white" /></span>
    </button>;
  }
  if (!hls) return <VideoPreview url={url} thumbnail={thumbnail} autoPlay={played === previewKey} />;
  return <video ref={player} className="aspect-video w-full rounded-lg bg-black" controls preload="none" poster={thumbnail} />;
}

function savedVideoSource(value, metadata) {
  const source = { url: value, key: metadata?.key || value, thumbnail: metadata?.thumbnail };
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || isCloudinaryMedia(value)) return source;
    const steam = /^\/store_trailers\/(\d+\/\d+)\/[a-f0-9]+\/\d+\/hls_264_master\.m3u8$/i.exec(url.pathname);
    const steamStream = /^video\.(?:akamai|fastly|cloudflare)\.steamstatic\.com$/.test(url.hostname) && Boolean(steam);
    if (steamStream && !metadata?.key) source.key = `steam:${steam[1]}`;
    return { ...source, steamStream, direct: /\.(mp4|m4v|webm|ogg|ogv|mov)$/i.test(url.pathname) };
  } catch { return source; }
}

function ThumbnailPicker({ images, value, disabled, onSelect }) {
  const [open, setOpen] = useState(false);
  const [dimensions, setDimensions] = useState({});
  const wide = images.filter(url => dimensions[url] === true);
  const loading = images.some(url => dimensions[url] === undefined);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button type="button" disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">
        <FiImage aria-hidden="true" /> انتخاب تصویر بندانگشتی
      </button>
    </PopoverTrigger>
    <PopoverContent dir="rtl" align="start" aria-label="تصاویر عریض بازی" className="w-64 max-w-[calc(100vw-1rem)] p-2">
      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
        {images.map((url, index) => <button type="button" key={url}
          className={`overflow-hidden rounded-md border ${dimensions[url] === true ? '' : 'hidden'} ${url === value ? 'border-blue-500' : 'border-transparent'}`}
          aria-label={`انتخاب تصویر ${index + 1}`} aria-pressed={url === value}
          onClick={() => { onSelect(url); setOpen(false); }}>
          <img src={url} alt="" className="aspect-video w-full object-contain"
            onLoad={event => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              setDimensions(previous => ({ ...previous, [url]: naturalWidth > naturalHeight }));
            }}
            onError={() => setDimensions(previous => ({ ...previous, [url]: false }))} />
        </button>)}
      </div>
      {!wide.length && <p role="status" className="p-2 text-xs text-slate-500">{loading ? 'در حال بررسی تصاویر…' : 'تصویر عریضی در گالری بازی نیست.'}</p>}
    </PopoverContent>
  </Popover>;
}

export default function GameVideoSource({ kind, title, gamebrainId, stores, offers, disabled, onBusyChange, saved, otherSaved, sourceKeys, thumbnailImages, onSelect, onRemove, onThumbnailChange }) {
  const [fetchSources, { isLoading }] = useFetchGameVideoSourcesMutation();
  const [matches, setMatches] = useState([]);
  const [pendingThumbnails, setPendingThumbnails] = useState({});
  const [importing, setImporting] = useState('');
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState('');
  const [uploadErrors, setUploadErrors] = useState({});
  const uploadLock = useRef(false);
  const [error, setError] = useState('');

  async function search() {
    setMatches([]);
    setSummary('');
    setError('');
    try {
      const response = await fetchSources({
        kind, title, gamebrain_id: gamebrainId,
        exclude_urls: otherSaved,
        store_urls: [...new Set([...storeUrls(stores), ...storeUrls(offers)])],
      }).unwrap();
      setMatches(response.data);
      if (!response.data.length) setError('ویدئوی مرتبط در منابع بازی پیدا نشد.');
    } catch (failure) {
      setError(failure.data?.description || failure.data?.message || 'دریافت ویدئو از منبع ناموفق بود.');
    }
  }

  async function upload(videos) {
    if (uploadLock.current || disabled || !videos.length) return;
    uploadLock.current = true;
    setError('');
    setSummary('');
    onBusyChange(true);
    let failed = 0;
    let lastError = '';
    try {
      for (const [index, video] of videos.entries()) {
        setImporting(video.url);
        setUploadErrors(previous => ({ ...previous, [video.key]: '' }));
        setProgress({ current: index + 1, total: videos.length });
        try {
          const uploaded = await importGameMedia(video.url, title, kind);
          onSelect(uploaded.url, video.key, pendingThumbnails[video.key] || video.thumbnail || uploaded.blur?.url, video.savedUrl);
        } catch (failure) {
          failed++;
          lastError = failure.message || 'ذخیرهٔ ویدئو ناموفق بود.';
          const message = lastError;
          setUploadErrors(previous => ({ ...previous, [video.key]: message }));
        }
      }
      const uploadedCount = videos.length - failed;
      if (uploadedCount) setSummary(`${uploadedCount.toLocaleString('fa-IR')} ویدئو آپلود شد.`);
      if (failed) setError(`${failed.toLocaleString('fa-IR')} ویدئو آپلود نشد. ${lastError}`);
    } finally {
      uploadLock.current = false;
      setImporting('');
      setProgress(null);
      onBusyChange(false);
    }
  }

  const label = kind === 'gameplay' ? 'گیم‌پلی' : 'تریلر';
  const cardColor = kind === 'gameplay'
    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
    : 'border-violet-400 bg-violet-50 dark:bg-violet-950';
  const cardClass = `w-[23rem] max-w-full shrink-0 space-y-3 rounded-xl border-r-4 p-4 ${cardColor}`;
  const iconClass = 'grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-950/75 text-white hover:bg-slate-950 disabled:opacity-50';

  const visibleMatches = matches.filter(video => !otherSaved.includes(video.url) &&
    !sourceKeys.some(row => row.key === video.key && otherSaved.includes(row.url)));

  const savedUrlFor = video => saved.includes(video.url) ? video.url : sourceKeys.find(row => row.key === video.key)?.url;
  const cards = visibleMatches.map(video => {
    const savedUrl = savedUrlFor(video);
    const metadata = sourceKeys.find(row => row.url === savedUrl);
    return { ...video, savedUrl, thumbnail: metadata?.thumbnail || video.thumbnail };
  });
  for (const [index, url] of saved.entries()) {
    if (cards.some(video => video.savedUrl === url)) continue;
    const metadata = sourceKeys.find(row => row.url === url);
    const title = isCloudinaryMedia(url) ? 'ویدئوی آپلودشده' : 'لینک ذخیره‌شده';
    cards.push({ ...savedVideoSource(url, metadata), savedUrl: url, title: `${title} ${index + 1}` });
  }
  const canUpload = video => (video.direct || video.steamStream) && !isCloudinaryMedia(video.savedUrl);
  const uploadable = cards.filter(canUpload);

  const actions = <div className="flex flex-wrap gap-2">
      <SendButton type="button" icon={FiUpload}
        label={`آپلود همه (${uploadable.length.toLocaleString('fa-IR')})`}
        disabled={disabled || isLoading || Boolean(progress) || !uploadable.length} onClick={() => upload(uploadable)} />
      <SendButton type="button" icon={FiDownload} label={isLoading ? 'در حال دریافت…' : `دریافت ${label}`}
        disabled={disabled || isLoading || Boolean(importing) || !title?.trim()} onClick={search} />
  </div>;

  return <section className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">{label}</h2>
      {kind === 'gameplay' && actions}
    </div>
    {kind === 'trailer' && actions}
    {cards.length > 0 && <div className="flex items-start gap-4 overflow-x-auto pb-3">
      {cards.map(video => {
        const { savedUrl } = video;
        const added = saved.includes(savedUrl);
        const uploaded = added && isCloudinaryMedia(savedUrl);
        const failure = !uploaded && uploadErrors[video.key];
        const thumbnail = pendingThumbnails[video.key] || video.thumbnail;
        const eligible = canUpload(video);
        return <article key={video.url} className={cardClass}>
          <h3 dir="auto" title={video.title || video.provider} className="truncate text-sm font-medium">{video.title || video.provider}</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <SourcePreview url={added ? savedUrl : video.url}
              thumbnail={thumbnail} />
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-1" title={failure || undefined}>
              {uploaded ? <><FiCheck aria-hidden="true" className="text-emerald-600" /> آپلود شد</>
                : failure ? <><FiX aria-hidden="true" className="text-red-600" /> آپلود ناموفق</>
                : importing === video.url ? 'در حال آپلود…' : eligible ? 'آمادهٔ آپلود' : 'فایل قابل آپلود در منبع موجود نیست'}
            </span>
            <div className="flex items-center gap-1">
              {!uploaded && <button type="button" title="آپلود ویدئو" disabled={disabled || Boolean(importing) || !eligible}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-green-300 px-2 py-1 text-green-700 disabled:opacity-50 dark:border-blue-600 dark:text-blue-300"
                onClick={() => upload([video])}>
                <FiUpload aria-hidden="true" /> {failure ? 'آپلود دوباره' : 'آپلود ویدئو'}
              </button>}
              {added && <button type="button" title="حذف ویدئو" aria-label="حذف ویدئو"
                className={iconClass} disabled={disabled || Boolean(importing)} onClick={() => onRemove(savedUrl)}>
                <FiTrash2 aria-hidden="true" />
              </button>}
            </div>
          </div>
          <ThumbnailPicker images={thumbnailImages} value={thumbnail} disabled={disabled || Boolean(progress)}
            onSelect={url => {
              if (added) onThumbnailChange(savedUrl, url);
              else setPendingThumbnails(previous => ({ ...previous, [video.key]: url }));
            }} />
        </article>;
      })}
    </div>}
    {progress && <p role="status" className="text-sm">{`در حال آپلود فایل ${progress.current.toLocaleString('fa-IR')} از ${progress.total.toLocaleString('fa-IR')}`}</p>}
    {summary && !progress && <p role="status" className="text-sm text-emerald-700">{summary}</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
