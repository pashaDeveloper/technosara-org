import React, { useEffect, useRef } from 'react';
import { Controller } from 'react-hook-form';
import StatusSwitch from '../../components/shared/button/StatusSwitch';
import { useGetGameCapabilityOptionsQuery, useGetGameFeatureOptionsQuery, useFetchGameCapabilitySourcesMutation } from '../../services/games/gameApi';
import { capabilityPlatform, mergeCapabilitySources } from './capabilitySourceUtils';
import { gameStatusFields } from './definitions';

const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const matches = (row, item) => [row.value, row.code, row.slug, row.name, row.name_en].some(value => value && [item.key, ...item.aliases].map(normalize).includes(normalize(value)));
const parse = (value, fallback) => { try { return JSON.parse(value) || fallback; } catch { return fallback; } };
function Toggle({ item, value, onChange, disabled, id }) {
  return <div className="space-y-1">
    <StatusSwitch compact id={id} label={item.label} tone="light" className="!gap-2 !rounded-lg !px-2 !py-1.5 !bg-transparent hover:!bg-transparent" checked={value === true} disabled={disabled} onChange={event => onChange(event.target.checked)} />
  </div>;
}
export default function GameCapabilities({ control, getValues, setValue, watch, providerGame, storedGame, modes, platforms, disabled, onBusyChange, autoFetch = true }) {
  const catalog = useGetGameCapabilityOptionsQuery();
  const features = useGetGameFeatureOptionsQuery();
  const [fetchSources] = useFetchGameCapabilitySourcesMutation();
  const generation = useRef(0);
  const definitions = catalog.data?.data || [];
  const lastProvider = useRef(null);
  useEffect(() => {
    if (!providerGame || (storedGame && String(storedGame.id) === String(providerGame.id))) return;
    setValue('capability_status', '{}', { shouldDirty: true });
    setValue('platform_capabilities', '[]', { shouldDirty: true });
    setValue('feature_ids', [], { shouldDirty: true });
  }, [providerGame, storedGame, setValue]);
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
  const capabilityPlatforms = platformRows.filter(row => selectedPlatforms.includes(row._id) && Boolean(capabilityPlatform(row)));
  const families = capabilityPlatforms.map(capabilityPlatform);
  const storeLinks = [officialStores, offers].flatMap(value => {
    const rows = parse(value, []);
    return Array.isArray(rows) ? rows : [];
  });
  const storeHosts = storeLinks.map(row => {
    try { return new URL(row?.url).hostname; } catch { return ''; }
  });
  const providers = [
    (families.includes('pc') || storeHosts.includes('store.steampowered.com')) && 'steam',
    (families.includes('pc') || families.some(family => family.startsWith('xbox')) ||
      storeHosts.some(host => /^(?:www\.)?(?:xbox|microsoft)\.com$/.test(host))) && 'xbox',
    (families.some(family => family.startsWith('ps')) ||
      storeHosts.some(host => /^(?:store|www)\.playstation\.com$/.test(host))) && 'sony',
  ].filter(Boolean);
  const requestKey = JSON.stringify([providerGame?.id || storedGame?._id, title, officialStores, offers, platformKey, providers]);
  const latest = useRef();
  latest.current = { title, officialStores, offers, providers, getValues, setValue, onBusyChange };
  async function loadSources() {
    const input = latest.current;
    if (!input.providers.length || !input.title?.trim()) return;
    const version = ++generation.current;
    input.onBusyChange?.(true);
    try {
      const response = await fetchSources({ title: input.title, official_stores: input.officialStores, offers: input.offers, providers: input.providers }).unwrap();
      if (version !== generation.current) return;
      const current = latest.current;
      const results = response.data?.results || [];
      const merged = mergeCapabilitySources(parse(current.getValues('capability_status'), {}), results);
      if (merged.added) {
        current.setValue('capability_status', JSON.stringify(merged.states), { shouldDirty: true });
      }
    } catch {
      // Automatic store lookup is optional.
    } finally {
      if (version === generation.current) latest.current.onBusyChange?.(false);
    }
  }
  useEffect(() => {
    ++generation.current;
    latest.current.onBusyChange?.(false);
    const timer = autoFetch && providers.length && title?.trim() ? setTimeout(() => loadSources(), 700) : null;
    return () => { clearTimeout(timer); ++generation.current; latest.current.onBusyChange?.(false); };
  }, [requestKey, autoFetch]);
  useEffect(() => {
    const rows = parse(getValues('platform_capabilities'), []);
    const selected = new Set(JSON.parse(platformKey));
    const active = rows.filter(row => selected.has(row.platform_id));
    if (active.length === rows.length) return;
    const { states, added } = mergeCapabilitySources(parse(getValues('capability_status'), {}), [{ platforms: rows }]);
    if (added) setValue('capability_status', JSON.stringify(states), { shouldDirty: true });
    setValue('platform_capabilities', JSON.stringify(active), { shouldDirty: true });
  }, [platformKey, getValues, setValue]);
  const legacyPlatforms = parse(watch('platform_capabilities'), []);
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
      return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {gameStatusFields.map(item => <Controller key={item.key} name={item.key} control={control} render={({ field }) =>
          <Toggle id={`game-${item.key}`} item={item} value={field.value} disabled={disabled} onChange={field.onChange} />
        } />)}
        {definitions.filter(item => !['cross_save', 'achievements'].includes(item.key)).map(item => {
        const rows = item.group === 'mode' ? modes.data?.data || [] : features.data?.data || [];
        const ids = item.group === 'mode' ? selectedModes : selectedFeatures;
        const value = Object.hasOwn(states, item.key) ? states[item.key] === true : rows.some(row => ids.includes(row._id) && matches(row, item))
          || legacyPlatforms.some(row => row.status?.[item.key] === true);
        return <Toggle key={item.key} id={`capability-${item.key}`} item={item} value={value} disabled={disabled} onChange={value => changeState(item, states, value)} />;
      })}
      </div>;
    }} />
  </section>;
}
