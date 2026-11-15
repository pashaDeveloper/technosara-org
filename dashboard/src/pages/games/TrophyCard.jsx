import React, { useEffect, useRef, useState } from 'react';
import { useTranslateTextMutation } from '../../services/translation/translationApi';
import Trophy, { trophyColors } from '../../components/icons/Trophy';

const translations = new Map();
const grades = { bronze: 'برنز', silver: 'نقره', gold: 'طلا', platinum: 'پلاتین', standard: 'اچیومنت' };
const codes = { Rare: 'کمیاب', Common: 'معمولی', VeryRare: 'بسیار کمیاب', UltraRare: 'فوق‌العاده کمیاب', Persistent: 'دائمی', Challenge: 'چالش', Individual: 'فردی', Group: 'گروهی', Cooperative: 'همکاری', Achieved: 'دریافت‌شده', InProgress: 'در حال پیشرفت', NotStarted: 'شروع‌نشده', Sum: 'مجموع', Max: 'بیشینه', Min: 'کمینه', Integer: 'عدد صحیح', Double: 'عدد اعشاری', String: 'متن' };
const label = value => codes[value] || value || 'نامشخص';
const number = value => new Intl.NumberFormat('fa-IR').format(value);
const date = value => value ? new Date(value).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : 'ثبت نشده';
function Badge({ title, children, tone = 'neutral', technical = false }) {
  const colors = { neutral: 'border-slate-200 bg-white/80 text-slate-700 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200', blue: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-200', amber: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200', red: 'border-red-200 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/50 dark:text-red-200' };
  return <span className={`inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-xl border px-2.5 py-1 text-xs leading-5 ${colors[tone]}`}>
    {title && <span className="shrink-0 opacity-70">{title}:</span>}
    <bdi className={`min-w-0 break-words ${technical ? 'break-all font-mono text-[11px]' : ''}`}>{children}</bdi>
  </span>;
}

export default function TrophyCard({ trophy, provider, progress, allowTranslation = true }) {
  const element = useRef(null);
  const [visible, setVisible] = useState(false), [texts, setTexts] = useState({}), [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [translate] = useTranslateTextMutation();
  useEffect(() => {
    if (!globalThis.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } });
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError(''); setTexts({});
    (async () => {
      for (const key of ['name', 'description', 'locked_description']) {
        if (trophy[`${key}_fa`]) { setTexts(previous => ({ ...previous, [key]: trophy[`${key}_fa`] })); continue; }
        if (!allowTranslation) continue;
        const text = trophy[key];
        if (!text || /[\u0600-\u06ff]/.test(text)) continue;
        try {
          let promise = translations.get(text);
          if (!promise) {
            promise = translate({ text, sourceLanguage: 'en', targetLanguage: 'fa' }).unwrap().then(result => {
              if (typeof result.translation !== 'string' || !result.translation.trim()) throw new Error('Empty translation');
              return result.translation;
            });
            if (translations.size >= 1000) translations.delete(translations.keys().next().value);
            translations.set(text, promise);
          }
          let translated;
          try { translated = await promise; } catch (failure) { if (translations.get(text) === promise) translations.delete(text); throw failure; }
          if (cancelled) return;
          setTexts(previous => ({ ...previous, [key]: translated }));
        } catch { if (!cancelled) setError('ترجمه کامل نشد؛ متن اصلی نمایش داده می‌شود.'); }
      }
    })();
    return () => { cancelled = true; };
  }, [visible, trophy.name, trophy.description, trophy.locked_description, translate, retry]);
  return <li ref={element} className={`w-[23rem] max-w-[85vw] shrink-0 space-y-3 rounded-xl border-r-4 p-4 ${provider === 'openxbl' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' : 'border-blue-400 bg-blue-50 dark:bg-blue-950'}`}>
    <div className="flex items-center gap-3">
      {trophy.icon_url ? <img src={trophy.icon_url} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-white/70 object-contain dark:bg-slate-900/60" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-slate-900/60"><Trophy strokeWidth={1.75} className={`size-6 ${trophyColors[trophy.achievement_type] || trophyColors.silver}`} /></span>}
      <div className="min-w-0 text-sm"><h3 dir="auto" className="break-words font-semibold">{texts.name || trophy.name_fa || trophy.name}</h3>
        <p dir="ltr" lang="en" className="mt-1 text-xs text-slate-500">{trophy.name_en || trophy.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5"><Badge><span className={`inline-flex items-center gap-1 ${trophyColors[trophy.achievement_type] || trophyColors.silver}`}><Trophy className="size-2.5 shrink-0" />{grades[trophy.achievement_type]}</span></Badge>{trophy.points != null && <Badge tone="blue">{number(trophy.points)} امتیاز</Badge>}{trophy.rarity != null && <Badge title="درصد دریافت">{number(trophy.rarity)}٪</Badge>}</div>
      </div>
    </div>
    <p dir="auto" className="max-h-48 overflow-y-auto overscroll-contain break-words pl-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{texts.description || trophy.description}</p>
    <div className="flex flex-wrap gap-2 text-xs">
      {trophy.rarity_category && <Badge tone="blue">{label(trophy.rarity_category)}</Badge>}
      {trophy.hidden && <Badge tone="amber">اچیومنت مخفی</Badge>}
      {trophy.is_revoked && <Badge tone="red">پس‌گرفته‌شده</Badge>}
    </div>
    <details className="group text-xs leading-6 text-slate-600 dark:text-slate-300">
      <summary aria-label="باز و بسته کردن جزئیات اچیومنت" className="w-fit cursor-pointer list-none text-xl text-blue-600"><span aria-hidden="true" className="block group-open:hidden">+</span><span aria-hidden="true" className="hidden group-open:block">−</span></summary>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        {(trophy.description_en || trophy.description) && <p dir="ltr" lang="en" className="w-full whitespace-pre-wrap">{trophy.description_en || trophy.description}</p>}
        <Badge title="نوع">{label(trophy.source_achievement_type)}</Badge>
        <Badge title="مشارکت">{label(trophy.participation_type)}</Badge>
        <Badge title="زمان تخمینی">{trophy.estimated_time || 'اعلام نشده'}</Badge>
        <Badge title="شروع بازه">{date(trophy.time_window?.start_date)}</Badge>
        <Badge title="پایان بازه">{date(trophy.time_window?.end_date)}</Badge>
        {trophy.locked_description && <Badge title="توضیح پیش از دریافت">{texts.locked_description || trophy.locked_description}</Badge>}
        <Badge title="پلتفرم‌های منبع">{trophy.source_platforms?.join(' / ') || 'اعلام نشده'}</Badge>
        {progress && <>
          <Badge title="وضعیت حساب متصل" tone="blue">{label(progress.progress_state)}</Badge>
          <Badge title="زمان دریافت">{date(progress.unlocked_at)}</Badge>
          {progress.requirements?.map((requirement, index) => <Badge key={requirement.external_id || index} title={`پیشرفت ${number(index + 1)}`}><bdi>{requirement.current ?? '—'} / {requirement.target ?? '—'}</bdi> · {label(requirement.operation_type)} · {label(requirement.value_type)} · {label(requirement.participation_type)}</Badge>)}
        </>}
        <Badge title="شناسهٔ اچیومنت" technical>{trophy.external_id}</Badge>
        {trophy.service_config_id && <Badge title="شناسهٔ سرویس" technical>{trophy.service_config_id}</Badge>}
        {trophy.source_product_id && <Badge title="شناسهٔ محصول منبع" technical>{trophy.source_product_id}</Badge>}
        {trophy.deeplink && <Badge title="لینک مستقیم منبع" technical>{trophy.deeplink}</Badge>}
      </div>
    </details>
    {error && <p role="status" className="text-xs text-amber-700 dark:text-amber-400">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">تلاش دوباره</button></p>}
  </li>;
}
