import React, { useEffect, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import StatusSwitch from '../../components/shared/button/StatusSwitch';
import { useGetGameCapabilityOptionsQuery, useGetGameFeatureOptionsQuery, useFetchGameCapabilitySourcesMutation } from '../../services/games/gameApi';
import { capabilityPlatform, mergeCapabilitySources } from './capabilitySourceUtils';
import { toast } from 'react-hot-toast';
import GameSectionSkeleton from './GameSectionSkeleton';

const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const matches = (row, item) => [row.value, row.code, row.slug, row.name, row.name_en].some(value => value && [item.key, ...item.aliases].map(normalize).includes(normalize(value)));
const parse = (value, fallback) => { try { return JSON.parse(value) || fallback; } catch { return fallback; } };
function Toggle({ item, value, onChange, disabled, id }) {
  return <div className="space-y-1">
    <StatusSwitch id={id} label={item.label} tone="light" className="!bg-transparent hover:!bg-transparent" checked={value === true} disabled={disabled} onChange={event => onChange(event.target.checked)} />
  </div>;
}
export default function GameCapabilities({ control, getValues, setValue, watch, providerGame, storedGame, modes, platforms, disabled, onBusyChange, autoFetch = true }) {
  const catalog = useGetGameCapabilityOptionsQuery();
  const features = useGetGameFeatureOptionsQuery();
  const [fetchSources] = useFetchGameCapabilitySourcesMutation();
  const [sourceLoading, setSourceLoading] = useState(false);
  const generation = useRef(0);
  const definitions = catalog.data?.data || [];
  const lastProvider = useRef(null);
  useEffect(() => {
    if (!providerGame) return;
    setValue('capability_status', '{}', { shouldDirty: true });
    setValue('platform_capabilities', '[]', { shouldDirty: true });
    setValue('feature_ids', [], { shouldDirty: true });
  }, [providerGame, setValue]);
  useEffect(() => {
    const source = providerGame || storedGame;
    if (!source || !definitions.length || lastProvider.current === source) return;
    lastProvider.current = source;
    const states = parse(getValues('capability_status'), {});
    for (const item of definitions.filter(item => item.group !== 'platform')) {
      const rows = item.group === 'mode' ? source.play_modes : source.tags;
      if (!Object.hasOwn(states, item.key) && (rows || []).some(row => matches(typeof row === 'string' ? { value: row } : row, item))) states[item.key] = true;
    }
    setValue('capability_status', JSON.stringify(states), { shouldDirty: true });
  }, [providerGame, storedGame, definitions, getValues, setValue]);
  const selectedPlatforms = watch('platform_ids') || [];
  const platformKey = JSON.stringify(selectedPlatforms);
  const title = watch('title');
  const officialStores = watch('official_stores');
  const offers = watch('offers');
  const platformRows = platforms.data?.data || [];
  const families = platformRows.filter(row => selectedPlatforms.includes(row._id)).map(capabilityPlatform);
  const providers = [...new Set(families.flatMap(family => family === 'pc' ? ['steam', 'xbox'] : family?.startsWith('ps') ? ['sony'] : family?.startsWith('xbox') ? ['xbox'] : []))];
  const requestKey = JSON.stringify([providerGame?.id || storedGame?._id, title, officialStores, offers, platformKey, providers]);
  const latest = useRef();
  latest.current = { title, officialStores, offers, providers, platformRows, selectedPlatforms, getValues, setValue, onBusyChange };
  async function loadSources(manual = false) {
    const input = latest.current;
    if (!input.providers.length || !input.title?.trim()) {
      if (manual) toast.error('ابتدا نام بازی و پلتفرم را انتخاب کنید.');
      return;
    }
    const version = ++generation.current;
    setSourceLoading(true); input.onBusyChange?.(true);
    try {
      const response = await fetchSources({ title: input.title, official_stores: input.officialStores, offers: input.offers, providers: input.providers }).unwrap();
      if (version !== generation.current) return;
      const current = latest.current;
      const results = response.data?.results || [];
      const merged = mergeCapabilitySources(parse(current.getValues('platform_capabilities'), []), parse(current.getValues('capability_status'), {}), results, current.platformRows, current.selectedPlatforms);
      if (merged.added) {
        current.setValue('platform_capabilities', JSON.stringify(merged.rows), { shouldDirty: true });
        current.setValue('capability_status', JSON.stringify(merged.states), { shouldDirty: true });
      }
      if (manual) {
        if (merged.added) toast.success('قابلیت‌های تأییدشده دریافت شدند.');
        else if (results.every(row => row.error)) toast.error(results[0]?.error || 'دریافت قابلیت‌ها ناموفق بود.');
        else toast('قابلیت جدیدی برای تکمیل پیدا نشد.');
      }
    } catch { if (manual && version === generation.current) toast.error('دریافت قابلیت‌ها ناموفق بود.'); }
    finally { if (version === generation.current) { setSourceLoading(false); latest.current.onBusyChange?.(false); } }
  }
  useEffect(() => {
    ++generation.current;
    setSourceLoading(false); latest.current.onBusyChange?.(false);
    const timer = autoFetch && (providerGame || storedGame) ? setTimeout(() => loadSources(), 700) : null;
    return () => { clearTimeout(timer); ++generation.current; latest.current.onBusyChange?.(false); };
  }, [requestKey, autoFetch]);
  useEffect(() => {
    const rows = parse(getValues('platform_capabilities'), []);
    const selected = new Set(JSON.parse(platformKey));
    const active = rows.filter(row => selected.has(row.platform_id));
    if (active.length !== rows.length) setValue('platform_capabilities', JSON.stringify(active), { shouldDirty: true });
  }, [platformKey, getValues, setValue]);
  const selectedModes = watch('game_mode_ids') || [];
  const selectedFeatures = watch('feature_ids') || [];
  function changeState(item, states, value) {
    setValue('capability_status', JSON.stringify({ ...states, [item.key]: value }), { shouldDirty: true });
    const field = item.group === 'mode' ? 'game_mode_ids' : 'feature_ids';
    const rows = (item.group === 'mode' ? modes : features).data?.data || [];
    const matching = rows.filter(row => matches(row, item)).map(row => row._id);
    const ids = (getValues(field) || []).filter(id => !matching.includes(id));
    if (value === true && matching.length === 1) ids.push(matching[0]);
    setValue(field, ids, { shouldDirty: true });
  }
  return <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
    <h2 className="font-semibold">حالت‌ها و قابلیت‌های بازی</h2>
    {catalog.isLoading && <p role="status">در حال دریافت قابلیت‌ها…</p>}
    {catalog.error && <p role="alert">دریافت قابلیت‌ها ناموفق بود. <button type="button" onClick={catalog.refetch}>تلاش دوباره</button></p>}
    <Controller name="capability_status" control={control} render={({ field }) => {
      const states = parse(field.value, {});
      return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{definitions.filter(item => item.group !== 'platform' && item.key !== 'cross_save').map(item => {
        if (item.key === 'achievements') return <Controller key="has_persian_subtitles" name="has_persian_subtitles" control={control} render={({ field: subtitle }) => <div className="space-y-1">
          <StatusSwitch id="game-has_persian_subtitles" label="زیرنویس فارسی" tone="light" className="!bg-transparent hover:!bg-transparent" checked={Boolean(subtitle.value)} disabled={disabled} onChange={event => subtitle.onChange(event.target.checked)} />
        </div>} />;
        const rows = item.group === 'mode' ? modes.data?.data || [] : features.data?.data || [];
        const ids = item.group === 'mode' ? selectedModes : selectedFeatures;
        const value = Object.hasOwn(states, item.key) ? states[item.key] === true : rows.some(row => ids.includes(row._id) && matches(row, item));
        return <Toggle key={item.key} id={`capability-${item.key}`} item={item} value={value} disabled={disabled} onChange={value => changeState(item, states, value)} />;
      })}</div>;
    }} />
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">قابلیت‌ها به تفکیک پلتفرم</h3><button type="button" disabled={disabled || sourceLoading} onClick={() => loadSources(true)} className="rounded-lg border border-blue-500 px-3 py-2 text-sm text-blue-600 disabled:opacity-50">{sourceLoading ? 'در حال دریافت قابلیت‌ها…' : 'دریافت قابلیت‌ها'}</button></div>
    {!selectedPlatforms.length && <GameSectionSkeleton kind="capabilities" label="قابلیت‌های پلتفرم: هنوز پلتفرمی انتخاب نشده است" />}
    <Controller name="platform_capabilities" control={control} render={({ field }) => {
      const rows = parse(field.value, []);
      return <div className="flex gap-4 overflow-x-auto pb-3">{selectedPlatforms.map(id => {
        const platform = (platforms.data?.data || []).find(row => row._id === id);
        const states = rows.find(row => row.platform_id === id)?.status || {};
        return <div key={id} className="w-[23rem] shrink-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700"><h4 className="font-medium">{platform?.name || platform?.name_en || id}</h4>{definitions.filter(item => item.group === 'platform').map(item => <Toggle key={item.key} id={`capability-${id}-${item.key}`} item={item} value={states[item.key]} disabled={disabled} onChange={value => {
          const next = { platform_id: id, status: { ...states, [item.key]: value } };
          field.onChange(JSON.stringify([...rows.filter(row => row.platform_id !== id), next]));
        }} />)}</div>;
      })}</div>;
    }} />
  </section>;
}
