import React, { useRef, useState } from 'react';
import BoxArtButton from './BoxArtButton';
import GameImageAsset from './GameImageAsset';

const colors = ['border-blue-400 bg-blue-50 dark:bg-blue-950', 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950', 'border-violet-400 bg-violet-50 dark:bg-violet-950', 'border-amber-400 bg-amber-50 dark:bg-amber-950'];
const colorFor = id => colors[Array.from(String(id)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
const platformNames = platform => [platform?.code, platform?.value, platform?.slug, platform?.short_name, platform?.name, platform?.name_en].map(value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s_\-\u200c|]/g, ''));
const excludedCoverPlatform = platform => platformNames(platform).some(name => ['playstation', 'ps', 'xbox', 'xb', 'پلیاستیشن', 'ایکسباکس'].includes(name) || /gamepass|cloudgaming|xcloud|گیمپس|کلادگیمینگ/.test(name));
const supportsCover = platform => [platform?.code, platform?.value, platform?.slug, platform?.short_name, platform?.name, platform?.name_en].some(value => {
  const name = String(value || '').normalize('NFKC').toLowerCase().replace(/[\s_\-\u200c|]/g, '');
  return /^(xbox|playstation|ps[1-5]|psp|psvita|nintendoswitch|switch|ایکسباکس|پلیاستیشن|نینتندوسوییچ|نینتندوسوئیچ|سوییچ|سوئیچ)/.test(name);
});

export default function PlatformCovers({ value, onChange, selectedIds, platforms, disabled, onUploading, onPendingChange, title }) {
  const [uploading, setUploading] = useState(false);
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
  if (selectedIds.length && !coverIds.length) return null;
  return <section className="space-y-4">
    <h2 className="font-semibold">کاور پلتفرم‌ها</h2>
    {!selectedIds.length && <p className="text-sm text-slate-500">ابتدا پلتفرم‌های بازی را از بخش دسته‌بندی انتخاب کنید.</p>}
    <div className="flex items-start gap-4 overflow-x-auto pb-3">{coverIds.map(platformId => {
      const platform = (platforms.data?.data || []).find(row => row._id === platformId);
      const cover = covers.find(row => row.platform_id === platformId) || {};
      return <div key={platformId} className={`w-[23rem] shrink-0 space-y-3 rounded-xl border-r-4 p-4 ${colorFor(platformId)}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{platform?.name || platform?.name_en || platformId}</h3>
          <BoxArtButton title={title} platformId={platformId} disabled={disabled || uploading || Boolean(cover.low_quality && cover.high_quality)} onBusyChange={onUploading} onApply={result => {
            const current = latest.current.covers.find(row => row.platform_id === platformId) || {};
            if (!current.low_quality) setCover(platformId, 'low_quality', result.low_quality || result.high_quality);
            if (!current.high_quality) setCover(platformId, 'high_quality', result.high_quality);
          }} />
        </div>
        <div className="grid grid-cols-2 gap-3">{[['low_quality', 'کاور کم‌کیفیت'], ['high_quality', 'کاور باکیفیت']].map(([quality, label]) => <div key={quality} className="min-w-0 space-y-2">
          <span className="block text-sm font-medium">{label}</span>
          <GameImageAsset value={cover[quality]} onChange={url => setCover(platformId, quality, url)} label={label} portrait gameTitle={title} options={{ platformId, quality }} disabled={disabled || uploading} onUploading={busy => { setUploading(busy); onUploading?.(busy); }} onPendingChange={pending => onPendingChange?.(`platform-${platformId}-${quality}`, pending)} />
        </div>)}</div>
      </div>;
    })}</div>
    {uploading && <p role="status" className="text-sm">در حال آپلود کاور…</p>}
  </section>;
}
