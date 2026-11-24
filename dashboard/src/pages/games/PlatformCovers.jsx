import React, { useRef, useState } from 'react';
import { FiUpload } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import SendButton from '../../components/shared/button/SendButton';
import BoxArtButton from './BoxArtButton';
import GameImageAsset from './GameImageAsset';
import { isCloudinaryMedia } from './mediaUploadUtils';

const qualities = [['low_quality', 'کاور کم‌کیفیت'], ['high_quality', 'کاور باکیفیت']];
const colors = ['border-blue-400 bg-blue-50 dark:bg-blue-950', 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950', 'border-violet-400 bg-violet-50 dark:bg-violet-950', 'border-amber-400 bg-amber-50 dark:bg-amber-950'];
const colorFor = id => colors[Array.from(String(id)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
const platformNames = platform => [platform?.code, platform?.value, platform?.slug, platform?.short_name, platform?.name, platform?.name_en].map(value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s_\-\u200c|]/g, ''));
const excludedCoverPlatform = platform => platformNames(platform).some(name => ['playstation', 'ps', 'xbox', 'xb', 'پلیاستیشن', 'ایکسباکس'].includes(name) || /gamepass|cloudgaming|xcloud|گیمپس|کلادگیمینگ/.test(name));
const supportsCover = platform => [platform?.code, platform?.value, platform?.slug, platform?.short_name, platform?.name, platform?.name_en].some(value => {
  const name = String(value || '').normalize('NFKC').toLowerCase().replace(/[\s_\-\u200c|]/g, '');
  return /^(xbox|playstation|ps[1-5]|psp|psvita|nintendoswitch|switch|ایکسباکس|پلیاستیشن|نینتندوسوییچ|نینتندوسوئیچ|سوییچ|سوئیچ)/.test(name);
});

export default function PlatformCovers({ value, onChange, selectedIds, platforms, disabled, onUploading, onPendingChange, title, xboxUrl, exactXbox }) {
  const [uploading, setUploading] = useState(false);
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const assets = useRef(new Map());
  const batch = useRef(false);
  const latest = useRef();
  const availablePlatforms = platforms.data?.data || [];
  const coverIds = selectedIds.filter(id => {
    const platform = availablePlatforms.find(row => row._id === id);
    if (excludedCoverPlatform(platform)) return false;
    const parentId = platform?.parent_id?._id || platform?.parent_id;
    return supportsCover(platform) || supportsCover(availablePlatforms.find(row => row._id === parentId));
  });
  let covers;
  try { covers = JSON.parse(value || '[]'); } catch { covers = []; }
  latest.current = { covers, onChange };
  function setCover(platformId, quality, url) {
    const { covers: current, onChange: change } = latest.current;
    const existing = current.find(row => row.platform_id === platformId);
    const next = { ...existing, platform_id: platformId, [quality]: url || null };
    const rows = existing ? current.map(row => row.platform_id === platformId ? next : row) : [...current, next];
    latest.current.covers = rows;
    change(JSON.stringify(rows));
  }
  const readyKeys = coverIds.flatMap(platformId => {
    const cover = covers.find(row => row.platform_id === platformId);
    return qualities.flatMap(([quality]) => {
      const key = `platform-${platformId}-${quality}`;
      const url = cover?.[quality];
      return pendingKeys.has(key) || (url && !isCloudinaryMedia(url)) ? [key] : [];
    });
  });
  function uploadState(busy) {
    if (batch.current) return;
    setUploading(busy);
    onUploading?.(busy);
  }
  async function uploadAll() {
    if (disabled || uploading || batch.current || !readyKeys.length) return;
    batch.current = true;
    setUploading(true);
    onUploading?.(true);
    let failed = 0;
    let uploaded = 0;
    try {
      for (const key of readyKeys) {
        try {
          const result = await assets.current.get(key)?.upload({ ignoreDisabled: true, silent: true });
          if (result) uploaded++;
        } catch {
          failed++;
        }
      }
      if (failed) toast.error(`آپلود ${failed} کاور ناموفق بود. می‌توانید دوباره تلاش کنید.`);
      if (uploaded) toast.success(`${uploaded} کاور آپلود شد.`);
    } finally {
      batch.current = false;
      setUploading(false);
      onUploading?.(false);
    }
  }
  if (selectedIds.length && !coverIds.length) return null;
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">کاور پلتفرم‌ها</h2>
      {!!coverIds.length && <SendButton type="button" label="آپلود همهٔ کاورها" icon={FiUpload}
        disabled={disabled || uploading || !readyKeys.length} onClick={uploadAll} />}
    </div>
    {!selectedIds.length && <p className="text-sm text-slate-500">ابتدا پلتفرم‌های بازی را از بخش دسته‌بندی انتخاب کنید.</p>}
    <div className="flex items-start gap-4 overflow-x-auto pb-3">{coverIds.map(platformId => {
      const platform = (platforms.data?.data || []).find(row => row._id === platformId);
      const cover = covers.find(row => row.platform_id === platformId) || {};
      return <div key={platformId} className={`w-[23rem] shrink-0 space-y-3 rounded-xl border-r-4 p-4 ${colorFor(platformId)}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{platform?.name || platform?.name_en || platformId}</h3>
          <BoxArtButton title={title} platformId={platformId} xboxUrl={xboxUrl} exactXbox={exactXbox} disabled={disabled || uploading || Boolean(cover.low_quality && cover.high_quality)} onBusyChange={onUploading} onApply={result => {
            const current = latest.current.covers.find(row => row.platform_id === platformId) || {};
            if (!current.low_quality) setCover(platformId, 'low_quality', result.low_quality || result.high_quality);
            if (!current.high_quality) setCover(platformId, 'high_quality', result.high_quality);
          }} />
        </div>
        <div className="grid grid-cols-2 gap-3">{qualities.map(([quality, label]) => {
          const key = `platform-${platformId}-${quality}`;
          return <div key={quality} className="min-w-0 space-y-2">
          <span className="block text-sm font-medium">{label}</span>
          <GameImageAsset ref={asset => { if (asset) assets.current.set(key, asset); else assets.current.delete(key); }}
            value={cover[quality]} onChange={url => setCover(platformId, quality, url)} label={label} portrait gameTitle={title}
            options={{ platformId, quality }} disabled={disabled || uploading} onUploading={uploadState} onPendingChange={pending => {
              setPendingKeys(current => {
                if (current.has(key) === pending) return current;
                const next = new Set(current);
                if (pending) next.add(key); else next.delete(key);
                return next;
              });
              onPendingChange?.(key, pending);
            }} />
        </div>;
        })}</div>
      </div>;
    })}</div>
    {uploading && <p role="status" className="text-sm">در حال آپلود کاور…</p>}
  </section>;
}
