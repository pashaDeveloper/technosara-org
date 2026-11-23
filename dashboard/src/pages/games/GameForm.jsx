import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import { Controller, useForm } from 'react-hook-form';
import Dropdown from '../../components/shared/select/Dropdown';
import ListTextField from '../../components/shared/ListTextField';
import GregorianDatePicker, { parseInputDate } from '../../components/shared/date/GregorianDatePicker';
import PlatformInput from '../platforms/components/PlatformInput';
import SendButton from '../../components/shared/button/SendButton';
import StatusSwitch from '../../components/shared/button/StatusSwitch';
import { useAddCompanyMutation, useGetCompanyOptionsQuery } from '../../services/companies/companyApi';
import { useGetGenreOptionsQuery } from '../../services/genres/genreApi';
import { useGetGameModeOptionsQuery } from '../../services/game-modes/gameModeApi';
import { useGetGameSeriesOptionsQuery } from '../../services/game-series/gameSeriesApi';
import { useGetGameCapabilityOptionsQuery, useGetGameMediaOptionsQuery, useGetGameThemeOptionsQuery, useGetGamePlatformOptionsQuery, useGetGameTagOptionsQuery, useLocalizeGameTagsMutation } from '../../services/games/gameApi';
import { definition, formValues, gameSteps } from './definitions';
import { englishSlug, gameBody, providerFormValues, matchProviderOptions, providerOptionMatches, validateGameMetrics } from './gameFormUtils';
import { useGamebrainLookup, GamebrainSuggestions } from './GamebrainLookup';

import { useGetStoreOptionsQuery } from '../../services/store/storeApi';
import PlatformCovers from './PlatformCovers';
import GameStorage from './GameStorage';
import GenreOrder from './GenreOrder';
import GameTags, { gameTagLabels } from './GameTags';
import MainCoverPicker from './MainCoverPicker';
import MediaFileUpload from './MediaFileUpload';
import GameVideoSource from './GameVideoSource';
import StoreCoverPicker from './StoreCoverPicker';
import StoreDescriptions from './StoreDescriptions';
import StoreGameLookup, { storeProductId } from './StoreGameLookup';
import GameDlcImport from './GameDlcImport';
import GameTrophies from './GameTrophies';
import GameCapabilities from './GameCapabilities';
import ProviderField, { VideoPreview } from './ProviderField';
import GameDetailPreview from './GameDetailPreview';
import GameDescriptionEditor from './GameDescriptionEditor';
import { plainDescription } from './GameDescriptionText';
import { useTranslateTextMutation } from '../../services/translation/translationApi';
import { toast } from 'react-hot-toast';
import { gameSearchAliases } from './gameSearchAliases';
import { useGamePersistence } from './useGamePersistence';

export default function GameForm({ record, isLoading, onSubmit }) {
  const { search: listQuery } = useLocation();
  const { control, register, setValue, getValues, watch, handleSubmit, formState: { errors } } = useForm({
    defaultValues: formValues(definition, record), mode: 'onChange', shouldFocusError: true,
  });
  const lookup = useGamebrainLookup(watch('title'), name => {
    setValue('title', name, { shouldDirty: true, shouldValidate: true });
    setValue('slug', englishSlug(name), { shouldDirty: true, shouldValidate: true });
  }, record?.title || record?.name);


  const aliasTitle = watch('title');
  const previousGeneratedAliases = useRef([]);
  useEffect(() => {
    if (isLoading || !aliasTitle?.trim()) return;
    const timer = setTimeout(() => {
      const generated = gameSearchAliases(aliasTitle, lookup.game || {});
      const previous = new Set(previousGeneratedAliases.current.map(value => value.toLowerCase()));
      const manual = (getValues('alternate_titles') || []).filter(value => !previous.has(value.toLowerCase()));
      const merged = [...new Map([...manual, ...generated].map(value => [value.toLowerCase(), value])).values()].slice(0, 100);
      if (JSON.stringify(merged) !== JSON.stringify(getValues('alternate_titles') || [])) setValue('alternate_titles', merged, { shouldDirty: true });
      previousGeneratedAliases.current = generated.filter(value => !manual.some(item => item.toLowerCase() === value.toLowerCase()));
    }, 700);
    return () => clearTimeout(timer);
  }, [aliasTitle, lookup.game, isLoading, getValues, setValue]);

  const stores = useGetStoreOptionsQuery();
  const companies = useGetCompanyOptionsQuery();
  const [addCompany] = useAddCompanyMutation();
  const [creatingDeveloper, setCreatingDeveloper] = useState(false);
  const [developerError, setDeveloperError] = useState('');
  const developerRequest = useRef(false);
  const currentDeveloper = useRef(null);
  currentDeveloper.current = (lookup.game || record?.gamebrain_source)?.developer;
  async function createDeveloper(name) {
    if (developerRequest.current) return;
    developerRequest.current = true; setCreatingDeveloper(true); setDeveloperError('');
    try {
      // Refresh first so another form's newly created developer is reused.
      let response = await companies.refetch().unwrap();
      let matches = providerOptionMatches([name], response.data || [])[0].matches;
      if (!matches.length) {
        const created = await addCompany({ name, type: 'developer' }).unwrap();
        if (created.acknowledgement === false) throw { data: created };
        response = await companies.refetch().unwrap();
        matches = providerOptionMatches([name], response.data || [])[0].matches;
      }
      if (matches.length !== 1) throw new Error('گزینهٔ یکتا پیدا نشد؛ سازنده را از فهرست انتخاب کنید.');
      if (currentDeveloper.current === name) setValue('developer_ids', [...new Set([...(getValues('developer_ids') || []), matches[0]._id])], { shouldDirty: true, shouldValidate: true });
    } catch (error) { setDeveloperError(error.data?.description || error.data?.message || error.message || 'افزودن سازنده ناموفق بود.'); }
    finally { developerRequest.current = false; setCreatingDeveloper(false); }
  }
  const genres = useGetGenreOptionsQuery();
  const modes = useGetGameModeOptionsQuery();
  const capabilityOptions = useGetGameCapabilityOptionsQuery();
  const series = useGetGameSeriesOptionsQuery();
  const media = useGetGameMediaOptionsQuery();
  const themes = useGetGameThemeOptionsQuery();
  const platforms = useGetGamePlatformOptionsQuery();
  const tags = useGetGameTagOptionsQuery();
  const [localizeGameTags] = useLocalizeGameTagsMutation();
  const selectedTags = watch('tags');
  const attemptedTagTranslations = useRef(new Set());
  useEffect(() => {
    const missing = (tags.data?.data || []).filter(tag =>
      selectedTags?.includes(tag._id) && !tag.name_fa && !attemptedTagTranslations.current.has(tag._id)
    );
    if (!missing.length) return;
    const ids = missing.map(tag => tag._id);
    for (const id of ids) attemptedTagTranslations.current.add(id);
    void (async () => {
      for (let index = 0; index < ids.length; index += 5) await localizeGameTags(ids.slice(index, index + 5));
    })();
  }, [tags.data, selectedTags, localizeGameTags]);
  const [translate] = useTranslateTextMutation();
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const gamebrainTexts = useRef(new Map());
  const [resettingText, setResettingText] = useState('');
  const currentSource = useRef(); currentSource.current = lookup.game || record?.gamebrain_source;
  const storedGame = record || lookup.local?.record;
  const savedId = storedGame?._id;
  const autoFetch = true;
  const storedResources = storedGame?.saved_resources || {};
  const [previewTrophies, setPreviewTrophies] = useState(null);
  const [previewDlc, setPreviewDlc] = useState(null);
  useEffect(() => { setPreviewTrophies(null); setPreviewDlc(null); }, [savedId]);
  async function resetDescription(key) {
    const source = currentSource.current;
    const text = source?.[key];
    if (!text?.trim() || resettingText) return;
    const cacheKey = `${source.id}:${key}:${text}`;
    setResettingText(key);
    try {
      let value = gamebrainTexts.current.get(cacheKey);
      if (!value) {
        const response = await translate({ text, sourceLanguage: 'en', targetLanguage: 'fa' }).unwrap();
        value = response.translation;
        if (!value?.trim()) throw new Error('Empty translation');
        gamebrainTexts.current.set(cacheKey, value);
      }
      if (currentSource.current === source) setValue(key, value, { shouldDirty: true, shouldValidate: true });
    } catch { toast.error('بازگردانی متن Gamebrain ناموفق بود؛ متن فعلی حفظ شد.'); }
    finally { setResettingText(''); }
  }
  useEffect(() => {
    const game = lookup.game;
    if (!game) return;
    setValue('cover_media_id', '', { shouldDirty: true });
    setValue('storage_sizes', '[]', { shouldDirty: true });
    setValue('pc_requirements', 'null', { shouldDirty: true });
    const saved = lookup.local?.record;
    const values = saved && (!lookup.local.created || saved.draft_completed) ? formValues(definition, saved) : providerFormValues(game);
    for (const [key,value] of Object.entries(values)) setValue(key,value,{shouldDirty:true,shouldValidate:true});
    if (saved && (!lookup.local.created || saved.draft_completed)) { setTranslating(false); setTranslationError(''); return; }
    let cancelled=false;
    setTranslationError(''); setTranslating(true);
    (async () => {
      try {
        const cache=new Map();
        for (const key of ['short_description','description']) {
          const text=game[key]; if(!text?.trim()) continue;
          let translated=cache.get(text);
          if(!translated) { const response=await translate({text,sourceLanguage:'en',targetLanguage:'fa'}).unwrap(); translated=response.translation; cache.set(text,translated); }
          if (!cancelled && translated?.trim()) gamebrainTexts.current.set(`${game.id}:${key}:${text}`, translated);
          if(!cancelled && getValues(key)===text) setValue(key,translated,{shouldDirty:true,shouldValidate:true});
        }
      } catch { if(!cancelled) setTranslationError("خطا در پردازش اطلاعات"); }
      finally { if(!cancelled) setTranslating(false); }
    })();
    return () => {cancelled=true;};
  },[lookup.game,setValue,getValues,translate]);
  const genreAutofill = useRef(null);
  useEffect(() => {
    const game=lookup.game; if(!game || (lookup.local?.record && (!lookup.local.created || lookup.local.record.draft_completed))) return;
    if (genres.data && genreAutofill.current !== game) {
      genreAutofill.current = game;
      setValue('genre_ids', matchProviderOptions(game.genres, genres.data.data || []), { shouldDirty: true, shouldValidate: true });
    }
    for(const [key,items,source] of [
      ['developer_ids',game.developer?[game.developer]:[],companies],
      ['game_mode_ids',game.play_modes,modes],['theme_ids',game.themes,themes],
      ['platform_ids',game.platforms,platforms],['tags',game.tags,tags],
    ]) if(source.data) setValue(key,matchProviderOptions(items,source.data.data || []),{shouldDirty:true,shouldValidate:true});
  },[lookup.game,companies.data,genres.data,modes.data,themes.data,platforms.data,tags.data,setValue]);
  const sources = { platform_ids: platforms, tags, theme_ids: themes, developer_ids: companies, publisher_ids: companies, genre_ids: genres, game_mode_ids: modes, game_series_ids: series, cover_media_id: media };
  const providerSource = lookup.game || record?.gamebrain_source;
  const providerItems = providerSource ? {
    developer_ids: providerSource.developer ? [providerSource.developer] : [],
    genre_ids: providerSource.genres, game_mode_ids: providerSource.play_modes,
    theme_ids: providerSource.themes, platform_ids: providerSource.platforms, tags: providerSource.tags,
  } : {};
  const [coverUploading, setCoverUploading] = useState(false);
  const pendingUploads = useRef(new Set());
  const [pendingBanner, setPendingBanner] = useState('');
  function pendingUpload(key, pending) { if (pending) pendingUploads.current.add(key); else pendingUploads.current.delete(key); }
  const [capabilityLoading, setCapabilityLoading] = useState(false);
  const [storageLoading, setStorageLoading] = useState(false);
  const [dlcBusy, setDlcBusy] = useState(false);
  const dlcImport = useRef(null);
  const trophies = useRef(null);
  const [trophyBusy, setTrophyBusy] = useState(false);
  const persistence = useGamePersistence({ storedGame, values: watch(), getValues, setValue, ready: !isLoading && !lookup.loadingDetails && !translating && !coverUploading && !creatingDeveloper && (!storedGame?.id || Number(watch('id')) === Number(storedGame.id)) });
  const busy = isLoading || persistence.recovering || translating || lookup.loadingDetails || coverUploading || capabilityLoading || storageLoading || creatingDeveloper || Boolean(resettingText);
  const recoveredCompanies = useRef(false);
  useEffect(() => {
    if (persistence.recovering) recoveredCompanies.current = true;
    else if (recoveredCompanies.current) { recoveredCompanies.current = false; void companies.refetch(); }
  }, [persistence.recovering]);
  function changeRelation(key, input, next) {
    if (key === 'game_mode_ids') {
      const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const states = JSON.parse(getValues('capability_status') || '{}');
      for (const item of (capabilityOptions.data?.data || []).filter(item => item.group === 'mode')) {
        const aliases = [item.key, ...item.aliases].map(normalize);
        const ids = (modes.data?.data || []).filter(row => [row.value, row.slug, row.name, row.name_en].some(value => value && aliases.includes(normalize(value)))).map(row => row._id);
        const before = ids.some(id => (input.value || []).includes(id));
        const after = ids.some(id => next.includes(id));
        if (before !== after) states[item.key] = after;
      }
      setValue('capability_status', JSON.stringify(states), { shouldDirty: true });
    }
    input.onChange(next);
  }
  function selectStoreEdition(provider, url) {
    const hosts = provider === 'sony'
      ? ['store.playstation.com', 'playstation.com', 'www.playstation.com']
      : ['xbox.com', 'www.xbox.com'];
    let rows;
    try { rows = JSON.parse(getValues('official_stores') || '[]'); } catch { rows = []; }
    if (!Array.isArray(rows)) rows = [];
    const matches = row => { try { return hosts.includes(new URL(row.url).hostname); } catch { return false; } };
    const existing = rows.find(matches);
    const selected = { ...existing, name: existing?.name || (provider === 'sony' ? 'PlayStation' : 'Xbox'), url };
    setValue('official_stores', JSON.stringify([selected, ...rows.filter(row => !matches(row))]), { shouldDirty: true, shouldValidate: true });
  }
  const [resourceSourceSelected, setResourceSourceSelected] = useState(false);
  const apiStoreValue = watch('console_api_stores');
  let apiStores = [];
  let resourceStores = watch('official_stores');
  try {
    const selected = JSON.parse(apiStoreValue || '[]');
    const official = JSON.parse(resourceStores || '[]');
    if (Array.isArray(selected) && selected.length && Array.isArray(official)) {
      apiStores = selected;
      resourceStores = JSON.stringify([...selected, ...official.filter(row => !selected.some(store =>
        storeProductId(store.provider, row?.url) ||
        (store.provider === 'sony' && /^https:\/\/(?:store\.|www\.)?playstation\.com\//i.test(row?.url || ''))
      ))]);
    }
  } catch {}
  function officialProductUrl(provider) {
    try {
      return JSON.parse(watch('official_stores') || '[]')
        .find(row => storeProductId(provider, row?.url))?.url || '';
    } catch { return ''; }
  }
  function savedStoreId(provider, field) {
    return watch(field) || storeProductId(provider, officialProductUrl(provider));
  }
  function applyStoreGame(game, enteredId) {
    const options = { shouldDirty: true, shouldValidate: true };
    const idField = game.provider === 'sony' ? 'playstation_product_id' : 'xbox_product_id';
    setValue(idField, enteredId || storeProductId(game.provider, game.url), options);
    const selected = { provider: game.provider, url: game.url, title: game.title };
    setValue('console_api_stores', JSON.stringify([selected, ...apiStores.filter(row => row.provider !== game.provider)]), options);
    setResourceSourceSelected(true);
    lookup.setOpen(false);
  }
  function hasPurchaseData(key) {
    try { const rows = JSON.parse(watch(key) || '[]'); return Array.isArray(rows) && rows.length > 0; } catch { return false; }
  }
  function renderField(field) {
    if (field.type === 'switch') return <Controller key={field.key} name={field.key} control={control} render={({ field: input }) => <StatusSwitch id={`game-${field.key}`} name={input.name} label={field.label} tone="light" className="!bg-transparent hover:!bg-transparent" checked={Boolean(input.value)} disabled={busy} onChange={event => input.onChange(event.target.checked)} />} />;
    if (field.key === 'detail_poster') return <Controller name="detail_poster" control={control} render={({ field: input }) => <MainCoverPicker key={`${lookup.game?.id || savedId || "new"}-${field.key}`} onPendingChange={pending => pendingUpload(field.key, pending)} gameTitle={watch('title')} compact label="کاور عمودی جزئیات بازی" fieldName="detail_poster" value={input.value} disabled={busy} onUploading={setCoverUploading} onChange={input.onChange} sourcePicker={<StoreCoverPicker onEditionSelect={selectStoreEdition} kind="portrait" compact auto={autoFetch && !persistence.recovering && !input.value} title={watch('title')} officialStores={watch('official_stores')} offers={watch('offers')} disabled={isLoading || lookup.loadingDetails || coverUploading} onSelect={value => setValue('detail_poster', value, { shouldDirty: true, shouldValidate: true })} />} />} />;
    if (field.key === 'detail_banner') return <Controller name="detail_banner" control={control} render={({ field: input }) => <MainCoverPicker key={`${lookup.game?.id || savedId || "new"}-${field.key}`} onPendingChange={(pending, url) => { pendingUpload(field.key, pending); setPendingBanner(pending ? url : ''); }} gameTitle={watch('title')} label={field.label} fieldName="detail_banner" mirrored={watch("detail_banner_mirrored")} onToggleMirror={() => setValue("detail_banner_mirrored", !getValues("detail_banner_mirrored"), { shouldDirty: true })} value={input.value} disabled={busy} onUploading={setCoverUploading} onChange={input.onChange} sourcePicker={stageSource => <StoreCoverPicker onEditionSelect={selectStoreEdition} kind="detail" compact auto={autoFetch && !persistence.recovering && !input.value} title={watch('title')} officialStores={watch('official_stores')} offers={watch('offers')} disabled={busy} onSelect={stageSource} />} />} />;
    if (field.key === 'image') return <Controller name="image" control={control} render={({ field: input }) => <MainCoverPicker key={`${lookup.game?.id || savedId || "new"}-${field.key}`} onPendingChange={pending => pendingUpload(field.key, pending)} gameTitle={watch('title')}
      value={input.value || (media.data?.data || []).find(item => item._id === watch('cover_media_id'))?.url} disabled={busy} onUploading={setCoverUploading}
      sourcePicker={<StoreCoverPicker onEditionSelect={selectStoreEdition} auto={autoFetch && !persistence.recovering && !input.value} title={watch('title')} officialStores={watch('official_stores')} offers={watch('offers')} disabled={busy} onSelect={url => { input.onChange(url); setValue('cover_media_id', '', { shouldDirty: true }); }} />}
      onChange={url => { input.onChange(url); setValue('cover_media_id', '', { shouldDirty: true }); }}
    />} />;
    if (field.type === 'checkbox') return <label key={field.key} className="flex gap-2"><input type="checkbox" {...register(field.key)} />{field.label}</label>;
    if (field.type === 'json') return <Controller key={field.key} name={field.key} control={control}
      rules={{ validate: value => {
        try {
          if (field.key === 'rating') return validateGameMetrics(field.key, value) || 'امتیاز باید بین صفر و ده و تعدادها عدد صحیح نامنفی باشند.';
          if (field.key === 'playtime') return validateGameMetrics(field.key, value) || 'زمان بازی باید نامنفی و تعداد گزارش‌ها عدد صحیح نامنفی باشد.';
          const parsed = JSON.parse(value);
          const validUrl = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } };
          if (!Array.isArray(parsed)) return 'اطلاعات معتبر وارد کنید.';
          if (['screenshots','videos'].includes(field.key)) return parsed.every(validUrl) || 'نشانی معتبر برای همهٔ رسانه‌ها وارد کنید یا موارد خالی را حذف کنید.';
          if (['offers','official_stores','twitch_videos'].includes(field.key)) return parsed.every(item => item && validUrl(item.url)) || 'لینک معتبر برای هر مورد وارد کنید.';
          return parsed.every(item => item && typeof item.name === 'string' && item.name.trim() && typeof item.value === 'string' && item.value.trim()) || 'نام و شناسهٔ هر مورد را وارد کنید.';
        } catch { return 'اطلاعات معتبر وارد کنید.'; }
      } }} render={({ field: input, fieldState }) => <div><ProviderField key={`${lookup.game?.id || savedId || "new"}-${field.key}`} onPendingChange={pendingUpload} gameTitle={watch('title')} disabled={busy} onBusyChange={setCoverUploading} stores={stores} platforms={platforms} name={field.key} label={field.label} value={input.value} onChange={input.onChange} />{fieldState.error && <p role="alert" className="text-sm text-red-500">{fieldState.error.message}</p>}</div>} />;
    if (field.type === 'date') return <Controller key={field.key} name={field.key} control={control}
      rules={{ validate: value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(parseInputDate(value))) || 'تاریخ معتبر وارد کنید' }}
      render={({ field: input, fieldState }) => <GregorianDatePicker
        label={`${field.label} (میلادی)`} inputComponent={PlatformInput}
        value={input.value} onChange={input.onChange} onBlur={input.onBlur} inputRef={input.ref}
        disabled={busy} error={fieldState.error?.message} minYear={1950} maxYear={new Date().getFullYear() + 20}
      />} />;
    if (field.type === 'list') return <Controller key={field.key} name={field.key} control={control}
      rules={{ validate: values => values.length <= 100 && values.every(value => typeof value === 'string' && value.trim() && value.trim().length <= 200) || 'حداکثر ۱۰۰ عنوان، هرکدام تا ۲۰۰ کاراکتر وارد کنید' }}
      render={({ field: input, fieldState }) => <ListTextField label={field.label} name={input.name} value={input.value} onChange={input.onChange} onBlur={input.onBlur} inputRef={input.ref} disabled={busy} error={fieldState.error?.message} inputComponent={PlatformInput} placeholder="مثلاً GTA V، جی تی ای ۵، Grand Theft Auto 5" />} />;
    if (['relation', 'multiple', 'select'].includes(field.type)) {
      const source = sources[field.key];
      const defaultTags = field.key === 'tags' ? gameTagLabels({
        title: watch('title'), name_fa: watch('name_fa'), platform_ids: watch('platform_ids'),
      }, platforms.data?.data) : [];
      const unmatched = source?.data && !source.error && !source.isFetching
        ? providerOptionMatches(providerItems[field.key], source.data.data || []).filter(item => item.matches.length !== 1) : [];
      const options = field.options || (source?.data?.data || []).map(item => ({ value: item._id, label: item.name_fa || item.title || item.name || item.url }));
      return <div key={field.key}><Controller name={field.key} control={control} rules={{ required: field.required ? 'انتخاب این گزینه الزامی است' : false }} render={({ field: input, fieldState }) => <>
        <Dropdown label={field.label} inputComponent={PlatformInput} options={field.type === 'multiple' ? options.filter(item => !input.value.includes(item.value)) : options}
          selectedOption={field.type !== 'multiple' && input.value ? options.find(item => item.value === input.value) || { value: input.value, label: input.value } : undefined}
          value={field.type === 'multiple' ? '' : input.value} onChange={value => changeRelation(field.key, input, field.type === 'multiple' ? value ? [...input.value, value] : input.value : value)} onBlur={input.onBlur} inputRef={input.ref}
          disabled={busy || source?.isFetching || Boolean(source?.error)} error={fieldState.error?.message} />
        {field.key === 'genre_ids' ? <GenreOrder value={input.value} options={options} disabled={busy}
          onChange={next => changeRelation(field.key, input, next)} /> :
          field.type === 'multiple' && <div className="mt-2 flex flex-wrap gap-2">{input.value.map(value => <button key={value} type="button" disabled={busy} className="max-w-full rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 [overflow-wrap:anywhere] dark:bg-blue-900 dark:text-blue-100" aria-label={'حذف ' + (options.find(item => item.value === value)?.label || value)} onClick={() => changeRelation(field.key, input, input.value.filter(id => id !== value))}>{options.find(item => item.value === value)?.label || value} ×</button>)}</div>}
      </>} />
      {defaultTags.length > 0 && <details className="mt-2 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer px-3 py-2 text-sm">تگ‌های پیش‌فرض ({defaultTags.length.toLocaleString('fa-IR')})</summary>
        <GameTags labels={defaultTags} className="max-h-48 space-y-1 overflow-y-auto px-3 pb-2 text-sm [&>li]:rounded [&>li]:bg-slate-100 [&>li]:px-2 [&>li]:py-1 [&>li]:[overflow-wrap:anywhere] dark:[&>li]:bg-slate-800" />
      </details>}
      {source?.error && <p role="alert" className="mt-2 text-sm text-red-500">دریافت گزینه‌ها ناموفق بود. <button type="button" onClick={source.refetch}>تلاش دوباره</button></p>}
      {!!unmatched.length && <div role="status" className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <ul className="list-inside list-disc space-y-1">{unmatched.map((item, index) => <li key={`${item.label}-${index}`}>
          <span dir="auto">{item.label}</span>: {item.matches.length === 0
            ? field.key === 'developer_ids' ? 'در فهرست سازندگان ثبت نشده است.' : 'در گزینه‌های شما موجود نیست؛ باید ساخته شود.'
            : 'چند گزینهٔ مشابه پیدا شد؛ گزینهٔ درست را دستی انتخاب کنید.'}
          {field.key === 'developer_ids' && item.matches.length === 0 && <button type="button" disabled={busy} className="ms-2 rounded-lg bg-white px-3 py-1.5 text-blue-700 disabled:opacity-50 dark:bg-slate-800 dark:text-blue-300" onClick={() => createDeveloper(item.label)}>{creatingDeveloper ? 'در حال افزودن…' : 'افزودن و انتخاب سازنده'}</button>}
        </li>)}</ul>
        {field.key !== 'developer_ids' && <button type="button" className="mt-2 underline" onClick={() => source.refetch()}>پس از ساخت، فهرست را تازه کنید</button>}
      </div>}
      {field.key === 'developer_ids' && developerError && <p role="alert" className="mt-2 text-sm text-red-500">{developerError}</p>}
      </div>;
    }
    if (['gameplay', 'trailer'].includes(field.key)) {
      const key = field.key;
      const listField = key === 'gameplay' ? 'gameplay_videos' : 'trailers';
      const readSaved = (primary = key, list = listField) => {
        const rows = JSON.parse(getValues(list) || '[]');
        return [...new Set([getValues(primary), ...rows].filter(Boolean))];
      };
      const otherSaved = key === 'gameplay' ? readSaved('trailer', 'trailers') : readSaved('gameplay', 'gameplay_videos');
      const sourceKeys = JSON.parse(watch('video_source_keys') || '[]');
      const readSourceKeys = () => JSON.parse(getValues('video_source_keys') || '[]');
      const visibleSaved = () => key === 'gameplay' ? readSaved() : readSaved().filter(url => !otherSaved.includes(url));
      const shown = visibleSaved();
      let screenshots = [];
      try {
        const rows = JSON.parse(watch('screenshots') || '[]');
        if (Array.isArray(rows)) screenshots = rows;
      } catch {}
      const thumbnailImages = [...new Set([watch('detail_banner'), ...screenshots].filter(url => /^https?:\/\//i.test(url || '')))];
      const updateSourceKeys = rows => setValue('video_source_keys', JSON.stringify(rows), { shouldDirty: true });
      const changeSaved = urls => {
        setValue(key, urls[0] || '', { shouldDirty: true });
        setValue(listField, JSON.stringify(urls), { shouldDirty: true });
      };
      return <GameVideoSource key={JSON.stringify([key, watch('title'), watch('id'), watch('official_stores'), watch('offers')])}
        kind={key} title={watch('title')} gamebrainId={watch('id')} stores={watch('official_stores')}
        offers={watch('offers')} disabled={busy} onBusyChange={setCoverUploading} saved={shown}
        otherSaved={otherSaved} sourceKeys={sourceKeys} thumbnailImages={thumbnailImages}
        onThumbnailChange={(url, thumbnail) => {
          const currentKeys = readSourceKeys();
          const source = currentKeys.find(row => row.url === url);
          updateSourceKeys([...currentKeys.filter(row => row.url !== url), { ...source, url, thumbnail }]);
        }}
        onSelect={(url, sourceKey, thumbnail, previousUrl) => {
          const currentKeys = readSourceKeys();
          const current = visibleSaved();
          if (otherSaved.includes(url) || currentKeys.some(row => row.key === sourceKey && row.url !== previousUrl)) return;
          const next = previousUrl ? current.map(value => value === previousUrl ? url : value) : [...current, url];
          changeSaved([...new Set(next)]);
          updateSourceKeys([...currentKeys.filter(row => row.url !== previousUrl), { url, key: sourceKey, thumbnail }]);
        }}
        onRemove={url => {
          changeSaved(visibleSaved().filter(value => value !== url));
          updateSourceKeys(readSourceKeys().filter(row => row.url !== url));
        }} />;
    }
    const editingDescription = ['short_description', 'description'].includes(field.key);
    return <React.Fragment key={field.key}>
      <div className="flex flex-col gap-1.5">
        <div className={`flex items-center gap-2 ${field.key === 'title' ? 'justify-start' : 'justify-between'}`}>
        <label className="text-sm" htmlFor={`game-${field.key}`}>{field.label}{field.required ? ' *' : ''}</label>
      {field.key === 'title' && <StoreGameLookup key={savedId || 'new'} query={watch('title')} disabled={busy} onApply={applyStoreGame}
        savedIds={{ sony: savedStoreId('sony', 'playstation_product_id'), xbox: savedStoreId('xbox', 'xbox_product_id') }} />}
      {editingDescription && <div className="flex items-center gap-2"><button type="button" title="بازگردانی توضیحات Gamebrain" aria-label={`بازگردانی ${field.label} به Gamebrain`} disabled={busy || !currentSource.current?.[field.key]?.trim()} onClick={() => resetDescription(field.key)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"><svg className={resettingText === field.key ? 'animate-spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6" /></svg></button><StoreDescriptions fieldKey={field.key} title={watch('title')} officialStores={watch('official_stores')} offers={watch('offers')} disabled={busy} onApply={(key, value) => setValue(key, value, { shouldDirty: true, shouldValidate: true })} /></div>}
        </div>
        {editingDescription ? <Controller name={field.key} control={control}
          rules={{ maxLength: { value: 10000, message: '\u0645\u062a\u0646 \u0628\u06cc\u0634 \u0627\u0632 \u062d\u062f \u0637\u0648\u0644\u0627\u0646\u06cc \u0627\u0633\u062a' } }}
          render={({ field: input }) => field.key === 'description'
            ? <GameDescriptionEditor id={`game-${field.key}`} label={field.label}
              value={input.value} onChange={input.onChange} onBlur={input.onBlur} disabled={busy} />
            : <PlatformInput {...input} as="textarea" id={`game-${field.key}`} rows={4} dir="auto"
              value={plainDescription(input.value ?? '')} disabled={busy} aria-invalid={Boolean(errors[field.key])} />} />
        : <PlatformInput as={field.type === 'textarea' ? 'textarea' : 'input'} id={`game-${field.key}`}
          type={field.type} rows={field.type === 'textarea' ? 4 : undefined} dir={field.dir || 'rtl'} aria-invalid={Boolean(errors[field.key])}
          {...(field.key === 'title' ? {
            role: 'combobox', autoComplete: 'off', 'aria-autocomplete': 'list',
            'aria-expanded': lookup.open, 'aria-controls': lookup.open ? lookup.listId : undefined,
            'aria-activedescendant': lookup.open && lookup.active >= 0 ? `${lookup.listId}-${lookup.active}` : undefined,
            onKeyDown: lookup.onKeyDown,
            onFocus: () => { if (lookup.items.length) lookup.setOpen(true); },
          } : {})}
          {...register(field.key, {
            ...(field.key === 'title' ? { onChange: event => setValue('slug', englishSlug(event.target.value), { shouldDirty: true, shouldValidate: true }) } : {}),
            validate: value => {
              if (field.type === 'number') return value === '' || (Number.isFinite(Number(value)) && Number(value) > 0) || "خطا در پردازش اطلاعات";
              if (field.required && !value?.trim()) return `${field.label} الزامی است`;
              if (field.type === 'url' && value) {
                try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return 'نشانی معتبر وارد کنید.'; }
                catch { return 'نشانی معتبر وارد کنید.'; }
              }
              return true;
            },
            maxLength: { value: field.key === 'slug' ? 100 : 500, message: 'متن بیش از حد طولانی است' },
            ...(field.key === 'slug' ? { pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'کد را با حروف کوچک انگلیسی، عدد و خط تیره وارد کنید.' } } : {}),
          })} />}
        {errors[field.key] && <span role="alert" className="text-sm text-red-500">{errors[field.key].message}</span>}
      </div>
      {field.key === 'image' && /^https?:\/\//.test(watch('image') || '') && <img src={watch('image')} alt={field.label} className="max-h-64 w-full rounded-lg object-contain" />}
      {field.key === 'micro_trailer' && <>
        <MediaFileUpload gameTitle={watch('title')} kind={field.key} disabled={busy}
          onBusyChange={setCoverUploading} onUploaded={file => setValue(field.key, file.url, { shouldDirty: true, shouldValidate: true })} />
        <VideoPreview url={watch(field.key)} />
      </>}
      {field.key === 'title' && <GamebrainSuggestions lookup={lookup} />}
    </React.Fragment>;
  }

  return <div className="grid w-full min-w-0 items-start gap-6 md:grid-cols-2" dir="ltr"><form dir="rtl" className="flex min-w-0 w-full flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-gray-900 sm:p-8 md:col-start-2 md:row-start-1" noValidate onSubmit={event => {
    event.preventDefault();
    if (busy || dlcBusy) return;
    if (pendingUploads.current.size) { toast.error('تصاویر انتخاب‌شده را ابتدا آپلود یا حذف کنید.'); return; }
    void handleSubmit(values => onSubmit(gameBody(values), async id => {
      const dlc = await dlcImport.current?.save(id);
      // Trophy imports are independent and never gate saving the game.
      return { failed: dlc?.failed || 0 };
    }, savedId), invalidFields => {
      const messages = new Set(Object.values(invalidFields).map(field => field?.message).filter(Boolean));
      for (const message of messages) toast.error(message, { id: message });
    })(event);
  }}>
    <header>
      {persistence.recovering && <p role="status" className="mb-3 text-sm text-slate-500">{'\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0632\u06cc\u0627\u0628\u06cc \u0627\u0637\u0644\u0627\u0639\u0627\u062a\u2026'}</p>}
      {persistence.state === 'saving' && <p role="status" className="mb-3 text-sm text-slate-500">{'\u062f\u0631 \u062d\u0627\u0644 \u0630\u062e\u06cc\u0631\u0647\u0654 \u062e\u0648\u062f\u06a9\u0627\u0631\u2026'}</p>}
      {persistence.state === 'saved' && <p role="status" className="mb-3 text-sm text-emerald-600">{'\u062a\u063a\u06cc\u06cc\u0631\u0627\u062a \u0630\u062e\u06cc\u0631\u0647 \u0634\u062f.'}</p>}
      {persistence.error && <p role="alert" className="mb-3 text-sm text-red-500">{persistence.error}</p>}
      <h1 className="mb-5 text-xl font-semibold">{record ? 'ویرایش بازی' : 'افزودن بازی'}</h1>
      {!record && savedId && <p role="status" className="mb-3 flex items-center gap-2 text-sm text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />اطلاعات ذخیره شده؛ تأیید نهایی همین بازی را ویرایش می‌کند.</p>}
    </header>
    <div className="grid min-w-0 grid-cols-3 items-start gap-3">
      {['image', 'detail_banner', 'detail_poster'].map(key => <div key={key} className="min-w-0">{renderField(definition.fields.find(field => field.key === key))}</div>)}
    </div>
    {translating && <p role="status">{"در حال ترجمه..."}</p>}
    {translationError && <p role="alert" className="text-red-500">{translationError}</p>}
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-8">
      {gameSteps.filter(item => !item.fields.includes('offers') || item.fields.some(key => hasPurchaseData(key))).map(item => <section key={item.title} className="min-w-0 border-t border-slate-200 pt-5 dark:border-slate-700">
        <h2 className="mb-2 text-base font-semibold">{item.title}</h2>
        <p className="mb-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:grid-cols-2">{item.fields.filter(key => key !== 'image' && (!['offers', 'official_stores'].includes(key) || hasPurchaseData(key))).map(key => {
          const field = definition.fields.find(field => field.key === key);
          const fullWidth = ['textarea', 'json', 'list'].includes(field.type) || ['official_website', 'cover_media_id', 'image'].includes(key);
          return <div key={key} className={`min-w-0 ${fullWidth ? 'sm:col-span-2' : ''}`}>{renderField(field)}</div>;
        })}</div>
        {item.fields.includes('platform_ids') && <div className="mt-5"><Controller name="platform_covers" control={control} render={({ field: input }) => <PlatformCovers key={lookup.game?.id || savedId || "new"} onPendingChange={pendingUpload} value={input.value} onChange={input.onChange} selectedIds={watch('platform_ids') || []} platforms={platforms} media={media} disabled={busy} onUploading={setCoverUploading} title={watch('title')} xboxUrl={officialProductUrl('xbox')} />} /><Controller name="storage_sizes" control={control} render={({ field: input }) => <GameStorage requirements={watch('pc_requirements')} onRequirementsChange={value => setValue('pc_requirements', value, { shouldDirty: true })} autoFetch={autoFetch} ready={!isLoading && !persistence.recovering && !translating && !lookup.loadingDetails} onBusyChange={setStorageLoading} value={input.value} onChange={input.onChange} title={watch('title')} officialStores={watch('official_stores')} offers={watch('offers')} selectedIds={watch('platform_ids') || []} platforms={platforms} disabled={busy} />} /></div>}
      </section>)}
    </fieldset>
    <GameCapabilities autoFetch={autoFetch && !persistence.recovering} control={control} getValues={getValues} setValue={setValue} watch={watch} providerGame={lookup.game} storedGame={storedGame} modes={modes} platforms={platforms} disabled={busy} onBusyChange={setCapabilityLoading} />
    <GameDlcImport onPreviewChange={setPreviewDlc} autoFetch={autoFetch && !persistence.recovering && (!storedResources.dlc?.length || !storedResources.dlc.some(item => item.provider === 'playstation') || (/xbox\.com/i.test(`${resourceStores} ${watch('offers')}`) && !storedResources.dlc.some(item => item.provider === 'xbox')))} storedItems={storedResources.dlc || []} ref={dlcImport} key={savedId || 'new'} gameId={savedId} title={watch('title')} officialStores={resourceStores} offers={watch('offers')} onBusyChange={setDlcBusy} disabled={isLoading || lookup.loadingDetails || coverUploading} />
    <GameTrophies onPreviewChange={setPreviewTrophies} autoFetch={autoFetch && !persistence.recovering && (!storedResources.trophies?.length || resourceSourceSelected)} storedLists={storedResources.trophies || []} ref={trophies} gameId={savedId} title={watch('title')} apiStores={apiStores} officialStores={resourceStores} offers={watch('offers')} onBusyChange={setTrophyBusy} disabled={busy} />
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <fieldset disabled={busy || dlcBusy}><SendButton isLoading={isLoading || dlcBusy} /></fieldset>
      <Link to={'/games' + listQuery} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"><FiX aria-hidden="true" className="size-6 shrink-0" />انصراف</Link>
    </div>
  </form><div className="relative z-20 min-w-0 space-y-4 md:col-start-1 md:row-start-1 md:sticky md:top-5 md:self-start"><GameDetailPreview pendingBanner={pendingBanner} resources={{ ...storedResources, trophies: previewTrophies ?? storedResources.trophies, dlc: previewDlc ?? storedResources.dlc }} game={watch()} tags={tags} platforms={platforms} genres={genres} companies={companies} modes={modes} media={media} /></div></div>;
}
