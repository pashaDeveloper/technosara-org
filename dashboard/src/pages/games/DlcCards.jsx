import React from 'react';
import { dlcKey } from './dlcFormUtils';

export function dlcPrice(price) {
  if (price?.value == null) return 'قیمت موجود نیست';
  if (price.value === 0) return 'رایگان';
  try { return new Intl.NumberFormat('fa-IR', { style: 'currency', currency: price.currency || 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(price.value); }
  catch { return `${new Intl.NumberFormat('fa-IR').format(price.value)} ${price.currency || ''}`; }
}

export default function DlcCards({ items, results }) {
  return <ul tabIndex={items.length ? 0 : undefined} aria-label="کارت‌های DLC؛ برای دیدن موارد بیشتر افقی اسکرول کنید" className="flex min-w-0 items-start gap-4 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{items.map(item => {
    const result = results[dlcKey(item)];
    const image = result?.content?.image || item.image;
    const title = result?.title || item.title;
    return <li key={dlcKey(item)} className={`w-[23rem] max-w-[85vw] shrink-0 space-y-3 rounded-xl border-r-4 p-4 ${item.provider === 'xbox' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' : 'border-blue-400 bg-blue-50 dark:bg-blue-950'}`}>
      <a href={item.url} target="_blank" rel="noreferrer" className="block aspect-[16/10] overflow-hidden rounded-lg bg-white/70 dark:bg-slate-900/60" aria-label={title}>
        {image ? <img src={image} alt={title} loading="lazy" className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-sm text-slate-400">تصویر موجود نیست</span>}
      </a>
      <div className="min-w-0 space-y-3">
        <h3 dir="auto" className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100"><a href={item.url} target="_blank" rel="noreferrer">{title}</a></h3>
        <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400"><bdi>{dlcPrice(result?.price)}</bdi></p>
        {result?.state === 'error' && <p role="alert" className="text-xs text-red-600">{result.message}</p>}
      </div>
    </li>;
  })}</ul>;
}
