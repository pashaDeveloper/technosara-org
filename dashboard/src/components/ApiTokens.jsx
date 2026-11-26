import { apiUrl } from '../utils/apiUrl.js';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
const healthLabels = { valid: 'معتبر', expired: 'منقضی شده', invalid_or_expired: 'نامعتبر یا منقضی', quota: 'محدودیت سهمیه', subscription: 'نیاز به اشتراک', forbidden: 'دسترسی محدود', unavailable: 'خطای اتصال', unverified: 'بررسی نشده', missing: 'تنظیم نشده' };
const healthColors = { valid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', expired: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300', invalid_or_expired: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' };

async function request(method = 'GET', body, suffix = '') {
  const response = await fetch(apiUrl(`/admin/api-tokens${suffix}`), {
    method, credentials: 'include', cache: 'no-store',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`, ...(body && { 'Content-Type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.description || result.message || 'ارتباط با سرور ناموفق بود.');
  return result.data;
}
export default function ApiTokens() {
  const admin = useSelector(state => state.auth.admin);
  const panel = useRef(), trigger = useRef();
  const [panelOpen, setPanelOpen] = useState(false);
  const [services, setServices] = useState([]), [values, setValues] = useState({});
  const [arvanFields, setArvanFields] = useState([]), [arvanValues, setArvanValues] = useState({});
  const [busy, setBusy] = useState(false), [savingKey, setSavingKey] = useState(''), [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!panelOpen) return;
    panel.current?.focus();
    const onKey = event => { if (event.key === 'Escape' && !busy) close(); };
    const onPointer = event => { if (!busy && !panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [panelOpen, busy]);
  if (admin?.role !== 'superAdmin') return null;
  function showArvan(fields) {
    setArvanFields(fields);
    setArvanValues(Object.fromEntries(fields.map(field => [field.key, field.value || ''])));
  }
  async function open() {
    setMessage(''); setValues({}); setLoaded(false); setServices([]); setArvanFields([]); setArvanValues({});
    setPanelOpen(true); setBusy(true);
    try {
      const [tokens, arvan] = await Promise.allSettled([request(), request('GET', undefined, '/arvan')]);
      if (arvan.status === 'fulfilled') showArvan(arvan.value);
      else setMessage(arvan.reason.message);
      if (tokens.status === 'rejected') throw tokens.reason;
      setServices(tokens.value); setLoaded(true); setChecking(true); setServices(await request('POST'));
    }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); setChecking(false); }
  }
  function close() { if (busy) return; setValues({}); setArvanValues({}); setMessage(''); setPanelOpen(false); trigger.current?.focus(); }
  async function saveArvan(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setSavingKey('arvan'); setMessage('');
    try {
      showArvan(await request('PATCH', arvanValues, '/arvan'));
      setMessage('تنظیمات آروان ذخیره شد و برای آپلودهای جدید اعمال می‌شود.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); setSavingKey(''); }
  }
  async function save(event, key) {
    event.preventDefault(); const value = values[key] || ''; if (busy || !value.trim()) return;
    setBusy(true); setSavingKey(key); setMessage('');
    try { setServices(await request('PATCH', { key, value: value.trim() })); setValues(current => ({ ...current, [key]: '' })); setMessage(`توکن ${services.find(row => row.key === key)?.name || ''} ذخیره و فعال شد.`); setChecking(true); setServices(await request('POST')); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); setSavingKey(''); setChecking(false); }
  }
  return <>
    <button ref={trigger} type="button" onClick={() => panelOpen ? close() : open()} title="مدیریت توکن‌های API" className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800" aria-controls="api-tokens-panel" aria-expanded={panelOpen}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><circle cx="8" cy="8" r="5" /><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3" /></svg><span>توکن‌های API</span>
    </button>
    {createPortal(<aside id="api-tokens-panel" ref={panel} tabIndex={-1} aria-labelledby="api-token-title" aria-hidden={!panelOpen} inert={panelOpen ? undefined : ''} className={`fixed bottom-0 left-0 top-0 z-50 w-full max-w-lg overflow-y-auto overscroll-contain border-r border-gray-200 bg-white p-5 text-gray-800 shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${panelOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}`} dir="rtl">
      <div className="mb-4 flex items-center justify-between"><h2 id="api-token-title" className="font-semibold">مدیریت توکن‌های API</h2><button type="button" onClick={close} disabled={busy} aria-label="بستن" className="rounded px-2 py-1">×</button></div>
      {services.some(row => ['expired', 'invalid_or_expired'].includes(row.health)) && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">توکن‌های نیازمند تعویض: {services.filter(row => ['expired', 'invalid_or_expired'].includes(row.health)).map(row => row.name).join('، ')}</div>}
      {checking && <p role="status" className="mb-3 text-sm text-blue-600">در حال بررسی اعتبار توکن‌ها…</p>}
      {!loaded && busy && <p role="status" className="py-6 text-center text-sm">در حال دریافت سرویس‌ها…</p>}
      {arvanFields.length > 0 && (
        <form onSubmit={saveArvan} className="mb-4 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="font-medium">فضای ابری آروان</h3>
          <p className="text-xs text-gray-500">مشخصات اتصال S3 باکت را وارد کنید. آدرس عمومی فایل‌ها باید به ریشهٔ همان باکت اشاره کند.</p>
          {arvanFields.map(field => (
            <label key={field.key} className="block space-y-1 text-sm">
              <span>{field.label}</span>
              <input type={field.secret ? 'password' : 'text'} dir="ltr" autoComplete={field.secret ? 'new-password' : 'off'}
                spellCheck={false} maxLength={512} required={!field.secret || !field.configured}
                value={arvanValues[field.key] || ''} disabled={busy}
                placeholder={field.secret && field.configured ? 'برای جایگزینی کلید جدید وارد کنید' : undefined}
                onChange={event => setArvanValues(current => ({ ...current, [field.key]: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent dark:border-gray-600" />
            </label>
          ))}
          <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {savingKey === 'arvan' ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات آروان'}
          </button>
        </form>
      )}
      <ul className="space-y-3">{services.map(row => <li key={row.key} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <form onSubmit={event => save(event, row.key)} className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h3 dir="ltr" className="font-medium">{row.name}</h3><span className={`rounded-full px-2 py-1 text-xs ${healthColors[row.health] || 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>{checking && row.configured && row.health === 'unverified' ? 'در حال بررسی…' : healthLabels[row.health] || (row.configured ? 'بررسی نشده' : 'تنظیم نشده')}</span></div>
          <p className="text-xs text-gray-500">{row.description}</p>
          <div className="space-y-1">
            <div className="flex flex-wrap gap-3 text-xs">
              {row.login_url && <a href={row.login_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">ورود به حساب PlayStation ↗</a>}
              {row.token_url && <a href={row.token_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">دریافت توکن {row.name} ↗</a>}
            </div>
          </div>
          {row.checked_at && <p className="text-xs text-gray-500">آخرین بررسی: {new Date(row.checked_at).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>}
          <div className="flex flex-col gap-2 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">توکن جدید {row.name}</span><input type="password" dir="ltr" autoComplete="new-password" spellCheck={false} required maxLength={8192} value={values[row.key] || ''} disabled={busy} onChange={event => setValues(current => ({ ...current, [row.key]: event.target.value }))} className="w-full rounded-lg border border-gray-300 bg-transparent dark:border-gray-600" placeholder={row.configured ? 'توکن جدید برای جایگزینی' : 'توکن API را وارد کنید'} /></label>
          <button type="submit" disabled={busy || !(values[row.key] || '').trim()} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{savingKey === row.key ? 'در حال ذخیره…' : 'ذخیره و فعال‌سازی'}</button></div>
        </form>
      </li>)}</ul>
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      <div className="mt-4 flex justify-end"><button type="button" onClick={close} disabled={busy} className="rounded-lg border px-3 py-2 text-sm">بستن</button></div>
    </aside>, document.body)}
  </>;
}
