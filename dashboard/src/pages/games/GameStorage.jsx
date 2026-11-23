import React, { useEffect, useRef, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import SendButton from '../../components/shared/button/SendButton';
import PcRequirements, { readPcRequirements } from './PcRequirements';
import { nabApi } from '../../services/nab';
import { capabilityPlatform } from './capabilitySourceUtils';
const api = nabApi.injectEndpoints({ endpoints: builder => ({
  fetchGameStorage: builder.mutation({ query: body => ({ url: '/games/storage/source', method: 'POST', body }) }),
}) });
const kinds = { download: 'حداکثر حجم دانلود بسته', install: 'حجم نصب', required: 'فضای موردنیاز' };
const storagePlatform = platform => capabilityPlatform(platform) || ([platform.code, platform.value, platform.slug, platform.name_en, platform.name, platform.short_name].some(value => /^(?:microsoft)?xbox(?:360|one|seriesx|seriesxs|series|sx)?$/.test(String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''))) ? 'xbox' : null);
export default function GameStorage({ value, onChange, requirements, onRequirementsChange, title, officialStores, offers, selectedIds, platforms, disabled, onBusyChange, ready = true, autoFetch = true }) {
  const [fetchStorage] = api.useFetchGameStorageMutation();
  const [loading, setLoading] = useState(false), [messages, setMessages] = useState([]);
  const [manual, setManual] = useState({ platform_id: '', kind: 'install', gb: '', source_url: '' });
  const version = useRef(0), latest = useRef(), locked = useRef(false);
  let rows; try { rows = JSON.parse(value || '[]'); } catch { rows = []; }
  const savedRequirements = readPcRequirements(requirements);
  const choices = (platforms.data?.data || []).filter(row => selectedIds.includes(row._id));
  const families = choices.map(storagePlatform);
  const providers = [...new Set(families.flatMap(family => family === 'pc' ? ['steam', 'xbox'] : family?.startsWith('xbox') ? ['xbox'] : []))];
  const requestKey = JSON.stringify([title, officialStores, offers, selectedIds, providers, ready]);
  latest.current = { rows, onChange, onBusyChange, title, officialStores, offers, providers, families, choices, disabled };
  useEffect(() => {
    ++version.current; setLoading(false); setMessages([]);
    const needsRequirements = providers.includes('steam') && !savedRequirements;
    const timer = autoFetch && ready && title?.trim().length >= 2 && providers.length && (!rows.length || needsRequirements) ? setTimeout(() => load(true), 700) : null;
    return () => { clearTimeout(timer); ++version.current; if (locked.current) latest.current.onBusyChange?.(false); locked.current = false; };
  }, [requestKey, autoFetch]);
  async function load(automatic = false) {
    const input = latest.current;
    if (locked.current || (!automatic && input.disabled)) return;
    if (!input.title?.trim() || !input.providers.length) { setMessages(['نام بازی و پلتفرم PC یا Xbox را انتخاب کنید. حجم PlayStation در منابع فعلی قابل دریافت نیست.']); return; }
    locked.current = true; latest.current.onBusyChange?.(true);
    const current = ++version.current; setLoading(true); setMessages([]);
    try {
      const response = await fetchStorage({ title: input.title, official_stores: input.officialStores, offers: input.offers, providers: input.providers }).unwrap();
      if (current !== version.current) return;
      const data = response.data;
      const found = data.results?.find(result => result.pc_requirements)?.pc_requirements;
      if (found && input.families.includes('pc')) onRequirementsChange(JSON.stringify(found));
      const existing = [...latest.current.rows];
      for (const result of data.results || []) for (const row of result.rows || []) {
        if (row.platform === 'pc' && !input.families.includes('pc')) continue;
        if (row.platform === 'xbox' && !input.families.some(family => family?.startsWith('xbox'))) continue;
        const matching = input.choices.filter(platform => row.platform === 'pc' && storagePlatform(platform) === 'pc');
        if (matching.length === 1) row.platform_id = matching[0]._id;
        // Keep distinct package sizes and manual choices; refresh evidence for identical rows.
        const index = existing.findIndex(old => old.platform === row.platform && old.kind === row.kind && old.source_url === row.source_url && old.bytes === row.bytes);
        if (index < 0) existing.push(row); else existing[index] = { ...existing[index], ...row };
      }
      latest.current.onChange(JSON.stringify(existing));
      setMessages([data.message, ...(data.results || []).filter(row => row.error).map(row => `${row.provider}: ${row.error}`)].filter(Boolean));
    } catch (error) { if (current === version.current) setMessages([error.data?.description || error.data?.message || 'دریافت حجم ناموفق بود.']); }
    finally { if (current === version.current) { locked.current = false; setLoading(false); latest.current.onBusyChange?.(false); } }
  }
  function add() {
    const platform = choices.find(row => row._id === manual.platform_id);
    const bytes = Math.round(Number(manual.gb) * 1e9);
    let validUrl = false;
    try { const url = new URL(manual.source_url); validUrl = url.protocol === 'https:' && !url.username && !url.password; } catch {}
    if (!platform || !Number.isSafeInteger(bytes) || bytes <= 0 || !validUrl) { setMessages(['پلتفرم، حجم مثبت و لینک HTTPS منبع را وارد کنید.']); return; }
    onChange(JSON.stringify([...rows, { platform_id: platform._id, platform: platform.name_en || platform.name || platform._id, kind: manual.kind, bytes, provider: 'manual', source_url: manual.source_url, checked_at: new Date().toISOString() }]));
    setManual({ platform_id: '', kind: 'install', gb: '', source_url: '' }); setMessages([]);
  }
  return <section className="mt-5 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">حجم بازی در پلتفرم‌ها</h2><SendButton type="button" label={loading ? 'در حال دریافت اطلاعات…' : providers.includes('steam') ? 'دریافت حجم و سیستم موردنیاز' : 'بررسی دوبارهٔ حجم'} icon={FiRefreshCw} disabled={disabled || loading} onClick={() => load()} /></div>
    <p className="text-xs text-slate-500">حجم با انتخاب نام بازی و پلتفرم به‌صورت خودکار دریافت می‌شود. حجم دانلود، نصب و فضای موردنیاز متفاوت‌اند و با آپدیت تغییر می‌کنند. نسل کنسول بعضی بسته‌های Xbox مشخص نیست. حجم PlayStation در منابع فعلی قابل دریافت نیست.</p>
    {!rows.length && <p className="text-sm text-slate-500">حجمی ثبت نشده است.</p>}
    {providers.includes('steam') && <section className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
      <h3 className="font-semibold">سیستم موردنیاز PC</h3>
      <PcRequirements requirements={savedRequirements} />
    </section>}
    <div className="grid gap-2">{rows.map((row, index) => {
      const platformId = row.platform_id?._id || row.platform_id;
      const platform = (platforms.data?.data || []).find(item => item._id === platformId) || (typeof row.platform_id === 'object' ? row.platform_id : null);
      const platformName = platform?.name_fa || platform?.name || platform?.name_en;
      const checkedAt = row.checked_at && !Number.isNaN(Date.parse(row.checked_at)) ? new Date(row.checked_at).toLocaleDateString('fa-IR') : null;
      const badge = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-5';
      return <div key={`${row.source_url}:${row.bytes}:${index}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        {row.platform && <span className={badge + ' bg-slate-200/70 font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200'}>{row.platform === 'pc' ? 'PC' : row.platform === 'xbox' ? 'Xbox (نسل نامشخص)' : row.platform}</span>}
        <strong dir="ltr" className={badge + ' bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}>{new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(row.bytes / 1e9)} GB</strong>
        {kinds[row.kind] && <span className={badge + ' bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'}>{kinds[row.kind]}</span>}
        {platformName && <span className={badge + ' bg-slate-200/70 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}>{platformName}</span>}
        {row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer" className={badge + ' bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300'}>منبع{row.provider ? ` (${row.provider})` : ''} ↗</a>}
        {checkedAt && <span className={badge + ' bg-slate-200/70 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}>بررسی: {checkedAt}</span>}
        <button type="button" disabled={disabled || loading} onClick={() => onChange(JSON.stringify(rows.filter((_, i) => i !== index)))} className="ms-auto rounded-full px-3 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950">حذف</button>
      </div>;
    })}</div>
    <fieldset disabled={disabled || loading} className="flex flex-wrap items-center gap-2 rounded border p-3"><legend className="px-1 text-sm">ثبت دستی (از جمله PlayStation)</legend>
      <select aria-label="پلتفرم ثبت دستی حجم" value={manual.platform_id} onChange={e => setManual({ ...manual, platform_id: e.target.value })} className="rounded border bg-transparent"><option value="">انتخاب پلتفرم</option>{choices.map(p => <option key={p._id} value={p._id}>{p.name || p.name_en}</option>)}</select>
      <select aria-label="نوع حجم" value={manual.kind} onChange={e => setManual({ ...manual, kind: e.target.value })} className="rounded border bg-transparent">{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <input aria-label="حجم به گیگابایت" type="number" min="0.001" step="any" placeholder="حجم (GB)" value={manual.gb} onChange={e => setManual({ ...manual, gb: e.target.value })} className="w-36 rounded border bg-transparent" />
      <input aria-label="لینک منبع حجم" type="url" dir="ltr" placeholder="https://… لینک منبع" value={manual.source_url} onChange={e => setManual({ ...manual, source_url: e.target.value })} className="min-w-48 flex-1 rounded border bg-transparent" />
      <button type="button" onClick={add} className="rounded border px-3 py-1">افزودن حجم</button>
    </fieldset>
    {messages.map((message, index) => <p role="status" key={index} className="text-sm text-amber-600">{message}</p>)}
  </section>;
}
