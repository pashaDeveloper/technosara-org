import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { nabApi } from '../../services/nab';

const api = nabApi.enhanceEndpoints({ addTagTypes: ['Catalog'] }).injectEndpoints({ endpoints: b => ({
  catalogRead: b.query({ query: url => url, providesTags: ['Catalog'] }),
  catalogWrite: b.mutation({ query: ({ url, method = 'POST', body }) => ({ url, method, body }), invalidatesTags: ['Catalog', 'Game'] }),
}) });
const { useCatalogReadQuery, useCatalogWriteMutation } = api;
const names = {
  'game-platforms': 'پلتفرم‌های بازی',
  'store-products': 'محصولات فروشگاه‌ها',
  'game-contents': 'محتواهای بازی',
  dlcs: 'محتواهای اضافه (DLC)', 'season-passes': 'سیزن‌پس‌ها', bundles: 'باندل‌ها', demos: 'دموها', trials: 'نسخه‌های آزمایشی',
  'bundle-items': 'محتویات باندل', 'edition-items': 'محتویات ادیشن', 'season-pass-items': 'محتویات سیزن‌پس',
  'external-terms': 'تطبیق اطلاعات منابع', 'provider-relations': 'محتوای مرتبط در منابع',
  
  subscriptions: 'طرح‌های اشتراک', editions: 'نسخه‌های بازی', 'content-items': 'محتویات نسخه و باندل',
  'system-requirements': 'سیستم موردنیاز', features: 'قابلیت‌ها', 'game-features': 'قابلیت‌های بازی', 'external-ids': 'شناسه‌های منابع',
  'achievement-groups': 'مجموعه اچیومنت', achievements: 'اچیومنت‌ها', 'source-priority': 'اولویت منابع', 'field-sources': 'منبع و قفل اطلاعات', 'api-raw-responses': 'داده‌های ورودی', 'sync-logs': 'گزارش همگام‌سازی', 'match-reviews': 'بررسی تطبیق',
  'import-jobs': 'صف ورود اطلاعات',
  media: 'رسانه‌های بازی', 'age-ratings': 'رده‌بندی سنی',
};
const labels = {
  short_description: 'توضیح کوتاه', image: 'تصویر', screenshots: 'تصاویر', videos: 'ویدئوها', developers: 'سازندگان', publishers: 'ناشران', supported_languages: 'زبان‌های پشتیبانی‌شده', release_date_text: 'تاریخ انتشار اعلام‌شده در منبع', coming_soon: 'به‌زودی', is_free: 'رایگان',
  pic2: 'لینک کاور باکیفیت', pic1: 'لینک کاور کم‌کیفیت',
  content_id: 'محتوای بازی',
  items: 'محتویات بسته',
  dlc_id: 'محتوای اضافه مرتبط', item_type: 'نوع محتوا', item_id: 'محتوا', bundle_id: 'باندل', season_pass_id: 'سیزن‌پس', type: 'نوع',
  game_id: 'بازی', platform_id: 'پلتفرم', platform_ids: 'پلتفرم‌ها', store_id: 'فروشگاه', store_product_id: 'محصول فروشگاه', offer_id: 'عرضه', edition_id: 'نسخه', bundle_game_id: 'باندل', content_game_id: 'محتوای داخل بسته', company_id: 'شرکت', feature_id: 'قابلیت', subscription_id: 'اشتراک',
  title: 'عنوان', name: 'نام', code: 'کد', slug: 'اسلاگ', description: 'توضیح', role: 'نقش', market: 'کشور بازار', currency: 'ارز', regular_price: 'قیمت اصلی', current_price: 'قیمت فعلی', checked_at: 'زمان بررسی', sale_start: 'شروع تخفیف', sale_end: 'پایان تخفیف',
  external_product_id: 'شناسه محصول در منبع', external_sku_id: 'شناسه SKU', external_title_id: 'شناسه عنوان در منبع', external_id: 'شناسه خارجی', external_group_id: 'شناسه گروه در منبع', external_set_id: 'شناسه مجموعه در منبع', provider: 'ارائه‌دهنده', store_title: 'عنوان فروشگاه', store_url: 'لینک محصول', product_type: 'نوع محصول',
  release_date: 'تاریخ انتشار', crossplay: 'بازی مشترک بین پلتفرم‌ها', cross_save: 'انتقال ذخیره', cross_progression: 'انتقال پیشرفت', is_available: 'موجود', is_preorder: 'پیش‌خرید', is_trial: 'آزمایشی', is_base_edition: 'نسخه پایه', supported: 'پشتیبانی می‌شود', locked: 'قفل ویرایش دستی',
  requirement_level: 'سطح سیستم', os: 'سیستم‌عامل', cpu: 'پردازنده', gpu: 'کارت گرافیک', ram: 'حافظه رم', storage: 'فضای ذخیره‌سازی', directx: 'دایرکت‌ایکس', network: 'شبکه', notes: 'توضیحات', min_players: 'حداقل بازیکن', max_players: 'حداکثر بازیکن', value: 'مقدار', quantity: 'تعداد', tier: 'سطح اشتراک', available_from: 'شروع دسترسی', available_until: 'پایان دسترسی', source: 'منبع', field: 'فیلد', providers: 'منابع به ترتیب اولویت', id_type: 'نوع شناسه', status: 'وضعیت', website: 'وب‌سایت', target_platform_ids: 'پلتفرم‌های مقصد', achievement_group_id: 'گروه اچیومنت', points: 'امتیاز', rarity: 'درصد دریافت', hidden: 'مخفی', achievement_type: 'نوع اچیومنت', icon_url: 'لینک آیکون', group_type: 'نوع گروه', parent_content_id: 'محتوای مرتبط', total_achievements: 'تعداد اچیومنت', total_points: 'مجموع امتیاز', is_dlc: 'مربوط به DLC', dlc_game_id: 'DLC مرتبط',
};
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:bg-slate-800 dark:text-white';
const labelOf = row => row.title || row.name || row.store_title || [row.code, row.market, row.currency, row.external_sku_id, row.external_id].filter(Boolean).join(' · ') || row._id;
function Reference({ field, value, onChange }) {
  const [search, setSearch] = useState('');
  const result = useCatalogReadQuery(`/catalog/options/${field.ref}?search=${encodeURIComponent(search)}`);
  const multiple = field.type === 'Array';
  const selected = multiple ? value || [] : value || '';
  const rows = result.data?.data || [];
  return <div><input aria-label={'جستجوی ' + (labels[field.name] || field.name)} placeholder="جستجو…" className={inputClass} value={search} onChange={e => setSearch(e.target.value)} />
    <select required={field.required} className={inputClass} multiple={multiple} value={selected} onChange={e => onChange(multiple ? [...e.target.selectedOptions].map(o => o.value) : e.target.value || null)}>
      {!multiple && <option value="">انتخاب کنید</option>}
      {[selected].flat().filter(Boolean).filter(id => !rows.some(row => row._id === id)).map(id => <option key={id} value={id}>{id}</option>)}
      {rows.map(row => <option key={row._id} value={row._id}>{labelOf(row)}</option>)}
    </select>{result.error && <span role="alert">دریافت گزینه‌ها ناموفق بود.</span>}</div>;
}
function ContentItems({ value, onChange }) {
  return <div className="space-y-3">
    {value.map((item, index) => {
      const key = item.edition_id ? 'edition_id' : item.game_id ? 'game_id' : Object.hasOwn(item, 'edition_id') && !Object.hasOwn(item, 'content_id') ? 'edition_id' : Object.hasOwn(item, 'game_id') && !Object.hasOwn(item, 'content_id') ? 'game_id' : 'content_id';
      const update = row => onChange(value.map((old, i) => i === index ? row : old));
      return <div key={index} className="space-y-2 rounded-lg border p-3">
        <select aria-label="نوع آیتم" className={inputClass} value={key} onChange={e => update({ [e.target.value]: null })}>
          <option value="game_id">بازی</option><option value="content_id">محتوای بازی</option><option value="edition_id">ادیشن</option>
        </select>
        <Reference field={{ name: key, ref: key === 'game_id' ? 'Game' : key === 'edition_id' ? 'Edition' : 'GameContent', required: true }} value={item[key]} onChange={id => update({ [key]: id })} />
        <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))}>حذف آیتم</button>
      </div>;
    })}
    <button type="button" onClick={() => onChange([...value, { content_id: null }])}>افزودن آیتم</button>
  </div>;
}
function Editor({ schema, record, onSave, busy, onCancel }) {
  const fields = schema.fields.filter(f => !['Mixed', 'Map'].includes(f.type) && !f.name.includes('.') && !['last_synced_at', 'raw_source_id', 'previous_value', 'observed_at', 'region'].includes(f.name));
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, record?.[f.name] ?? f.default ?? (f.type === 'Array' ? [] : '')])));
  function submit(e) {
    e.preventDefault();
    const body = {};
    for (const f of fields) {
      const value = values[f.name];
      if (value === '' || value == null) { if (record && record[f.name] != null) body[f.name] = null; continue; }
      body[f.name] = f.type === 'Number' ? Number(value) : value;
    }
    onSave(body);
  }
  return <form onSubmit={submit} className="rounded-xl border p-4"><h2 className="mb-4 font-bold">{record ? 'ویرایش' : 'افزودن'}</h2><fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">{fields.map(f => {
    const set = value => setValues(old => ({ ...old, [f.name]: value, ...(f.name === 'item_type' ? { item_id: '' } : {}) }));
    const value = values[f.name];
    return <label key={f.name} className="flex flex-col gap-2"><span>{labels[f.name] || f.name}{f.required ? ' *' : ''}</span>
      {f.name === 'items' ? <ContentItems value={value || []} onChange={set} /> : f.ref ? <Reference field={f} value={value} onChange={set} /> : f.type === 'Boolean' ? <select className={inputClass} value={value == null || value === '' ? '' : String(value)} onChange={e => set(e.target.value === '' ? null : e.target.value === 'true')}><option value="">نامشخص</option><option value="true">بله</option><option value="false">خیر</option></select>
        : f.options?.length ? <select required={f.required} className={inputClass} value={value || ''} onChange={e => set(e.target.value)}><option value="">انتخاب کنید</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
          : <input required={f.required} className={inputClass} type={f.type === 'Date' ? 'datetime-local' : ['Number', 'Decimal128'].includes(f.type) ? 'number' : 'text'} step={['Number', 'Decimal128'].includes(f.type) ? 'any' : undefined} value={f.type === 'Array' ? (value || []).join(', ') : f.type === 'Date' && value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : value ?? ''} onChange={e => set(f.type === 'Array' ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : f.type === 'Date' && e.target.value ? new Date(e.target.value).toISOString() : e.target.value)} />}
    </label>;
  })}</fieldset><div className="mt-4 flex gap-4"><button disabled={busy} className="rounded-lg bg-blue-600 px-5 py-2 text-white">ذخیره</button><button type="button" onClick={onCancel}>انصراف</button></div></form>;
}
export default function Catalog() {
  const [resource, setResource] = useState('game-contents'), [page, setPage] = useState(1), [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const schema = useCatalogReadQuery('/catalog/schema');
  const rows = useCatalogReadQuery(`/catalog/${resource}?page=${page}&search=${encodeURIComponent(search)}`);
  const [write, { isLoading }] = useCatalogWriteMutation();
  const definition = schema.data?.data?.[resource];
  useEffect(() => { setEditor(null); setPage(1); setError(''); }, [resource]);
  async function mutate(url, body, method = 'POST') {
    setError(''); setNotice('');
    try { const result = await write({ url, body, method }).unwrap(); setNotice('عملیات انجام شد.'); return result; }
    catch (e) { setError(e.data?.description || e.data?.message || 'عملیات ناموفق بود.'); return null; }
  }
  return <main dir="rtl" className="mx-auto min-h-screen max-w-7xl space-y-5 bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">مدیریت کاتالوگ بازی</h1><Link to="/games">بازگشت به بازی‌ها</Link></header>
    <div className="flex flex-wrap gap-4"><label>بخش<select className={inputClass} value={resource} onChange={e => setResource(e.target.value)}>{Object.entries(names).filter(([key]) => schema.data?.data?.[key]).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      <label>جستجو<input className={inputClass} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      {definition && !definition.readOnly && <button onClick={() => setEditor({})} className="rounded-lg bg-blue-600 px-4 text-white">افزودن</button>}</div>
    {(error || rows.error || schema.error) && <p role="alert" className="text-red-600">{error || 'دریافت اطلاعات ناموفق بود.'}</p>}
    {notice && <p role="status" className="text-green-600">{notice}</p>}
    {editor && definition && <Editor key={resource + (editor._id || 'new')} schema={definition} record={editor._id ? editor : null} busy={isLoading} onCancel={() => setEditor(null)} onSave={async body => { const result = await mutate(`/catalog/${resource}${editor._id ? '/' + editor._id : ''}`, body, editor._id ? 'PATCH' : 'POST'); if (result) setEditor(null); }} />}
    {rows.isFetching && <p role="status">در حال دریافت…</p>}
    <div className="space-y-3">{rows.data?.data?.map(row => <article key={row._id} className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><strong>{resource === 'match-reviews' ? row.normalized?.game?.title : labelOf(row)}</strong><span>{row.state || ''}</span>
        <div className="flex flex-wrap gap-3">{!definition?.readOnly && <><button disabled={isLoading} onClick={() => setEditor(row)}>ویرایش</button><button disabled={isLoading} onClick={() => mutate(`/catalog/${resource}/${row._id}`, undefined, 'DELETE')} className="text-red-600">حذف</button></>}
        </div></div>
      <dl className="mt-3 grid gap-2 text-sm md:grid-cols-3">{Object.entries(row).filter(([key, value]) => !['_id', '__v', 'creator', 'isDeleted', 'approvalReview'].includes(key) && value != null && typeof value !== 'object').map(([key, value]) => <div key={key}><dt className="text-slate-500">{labels[key] || key}</dt><dd className="break-all">{typeof value === 'boolean' ? value ? 'بله' : 'خیر' : String(value)}</dd></div>)}</dl>
    </article>)}</div>
    {!rows.isFetching && rows.data?.total === 0 && <p>موردی ثبت نشده است.</p>}
    <nav className="flex gap-4"><button disabled={page === 1 || rows.isFetching} onClick={() => setPage(p => p - 1)}>قبلی</button><span>صفحه {page} · {rows.data?.total || 0} مورد</span><button disabled={page * 20 >= (rows.data?.total || 0) || rows.isFetching} onClick={() => setPage(p => p + 1)}>بعدی</button></nav>
  </main>;
}
