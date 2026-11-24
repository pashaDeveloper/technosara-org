import { apiUrl } from '../../../utils/apiUrl.js';
import React, { useEffect, useId, useRef, useState } from 'react';

export function AutoPersianToEnglish({ sourceText = '', initialSource = '', disabled = false, onBusyChange, onTranslated }) {
  const callbacks = useRef({ onBusyChange, onTranslated });
  callbacks.current = { onBusyChange, onTranslated };
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    setStatus('');
    const text = sourceText.trim();
    if (disabled || !text || sourceText === initialSource) return;
    if (new TextEncoder().encode(text).length > 500) {
      setError('نام برای ترجمه باید حداکثر ۵۰۰ بایت باشد.');
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    let timeout;
    callbacks.current.onBusyChange?.(true);
    setStatus('در انتظار تکمیل نام…');
    const timer = setTimeout(async () => {
      setStatus('در حال ترجمه…');
      timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(apiUrl('/translations'), {
          method: 'POST', credentials: 'include', signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'ترجمه انجام نشد.');
        if (typeof data.translation !== 'string' || !data.translation.trim()) throw new Error('پاسخ ترجمه معتبر نیست.');
        if (!cancelled) {
          callbacks.current.onTranslated?.(data.translation);
          setStatus('');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('');
          setError((err.name === 'AbortError' ? 'زمان انتظار ترجمه تمام شد.' : err.message) + ' نام انگلیسی و اسلاگ را دستی وارد کنید یا نام فارسی را تغییر دهید.');
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) callbacks.current.onBusyChange?.(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(timeout);
      controller.abort();
      callbacks.current.onBusyChange?.(false);
    };
  }, [sourceText, initialSource, disabled]);
  return <>
    {status && <p role="status" className="text-xs text-gray-500 dark:text-gray-400">{status}</p>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
  </>;
}

export default function PersianToEnglish({ initialText = '', sourceText, compact = false, disabled = false, onBusyChange, onTranslated }) {
  const id = useId();
  const request = useRef(null);
  const [inputText, setText] = useState(initialText);
  const text = sourceText ?? inputText;
  const latestText = useRef(text);
  latestText.current = text;
  const [translation, setTranslation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const bytes = new TextEncoder().encode(text.trim()).length;
  useEffect(() => () => request.current?.abort(), []);

  async function translate(event) {
    event.preventDefault();
    if (!bytes || bytes > 500 || busy || disabled) return;
    const submittedText = text;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    setTranslation('');
    setCopied(false);
    const timeout = setTimeout(() => controller.abort(), 20000);
    let result;
    try {
      const response = await fetch(apiUrl('/translations'), {
        method: 'POST', credentials: 'include', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'ترجمه انجام نشد.');
      if (typeof data.translation !== 'string' || !data.translation.trim()) throw new Error('پاسخ ترجمه معتبر نیست.');
      if (latestText.current === submittedText && !controller.signal.aborted) {
        setTranslation(data.translation);
        result = data.translation;
      }
    } catch (err) {
      setError(err.name === 'AbortError' ? 'زمان انتظار تمام شد. دوباره تلاش کنید.' : err.message);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
      onBusyChange?.(false);
    }
    if (result) onTranslated?.(result);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(translation);
      setCopied(true);
      setError('');
    } catch {
      setError('کپی خودکار ممکن نیست؛ متن خروجی را انتخاب و کپی کنید.');
    }
  }

  if (compact) return <div className="space-y-2" aria-busy={busy}>
    <button type="button" onClick={translate} disabled={disabled || busy || !bytes || bytes > 500} className="btn bg-violet-600 text-white disabled:opacity-50">{busy ? 'در حال ترجمه…' : 'ترجمهٔ نام و ساخت اسلاگ'}</button>
    {bytes > 500 && <p role="alert" className="text-red-500">نام برای ترجمه باید حداکثر ۵۰۰ بایت باشد.</p>}
    {error && <p role="alert" className="text-red-500">{error}</p>}
  </div>;

  return (
    <form onSubmit={translate} dir="rtl" className="space-y-4 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800" aria-busy={busy}>
      <p className="text-sm text-gray-500 dark:text-gray-400">متن برای ترجمه به سرویس Microsoft Translator ارسال می‌شود. حداکثر متن در این فرم ۵۰۰ بایت است.</p>
      <label htmlFor={`${id}-source`} className="block font-medium">متن فارسی</label>
      <textarea id={`${id}-source`} lang="fa" dir="rtl" rows={6} value={text} disabled={busy}
        aria-describedby={`${id}-size`} className="form-textarea w-full rounded-lg dark:bg-gray-900"
        placeholder="متن فارسی را اینجا بنویسید…"
        onChange={event => { setText(event.target.value); setTranslation(''); setError(''); setCopied(false); }} />
      <p id={`${id}-size`} className={bytes > 500 ? 'text-red-500' : 'text-sm text-gray-500'}>{bytes} / 500 بایت{bytes > 500 ? '؛ متن را کوتاه‌تر کنید.' : ''}</p>
      <button type="submit" disabled={busy || !bytes || bytes > 500} className="btn bg-violet-600 text-white disabled:opacity-50">{busy ? 'در حال ترجمه…' : 'ترجمه به انگلیسی'}</button>
      {error && <p role="alert" className="text-red-500">{error}</p>}
      <div aria-live="polite">
        {translation && <div className="space-y-3">
          <label htmlFor={`${id}-result`} className="block font-medium">ترجمهٔ انگلیسی</label>
          <textarea id={`${id}-result`} lang="en" dir="ltr" readOnly value={translation} rows={6} className="form-textarea w-full rounded-lg text-left dark:bg-gray-900" />
          <button type="button" onClick={copy} className="btn border border-gray-300">{copied ? 'کپی شد' : 'کپی ترجمه'}</button>
        </div>}
      </div>
    </form>
  );
}
