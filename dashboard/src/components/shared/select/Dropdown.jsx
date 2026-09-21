import React, { useEffect, useId, useRef, useState } from 'react';

const EMPTY = [];

// loadOptions({ search, page, limit, signal }) => { options: [{ value, label }], hasMore }
export default function Dropdown({ value, onChange, onBlur, options = EMPTY, loadOptions,
  selectedOption, label, disabled = false, pageSize = 20, error, inputRef, inputComponent: Input = 'input', optionIcon: OptionIcon }) {
  const id = useId();
  const root = useRef(null);
  const input = useRef(null);
  const request = useRef(null);
  const busy = useRef(false);
  const version = useRef(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState(null);
  const selected = [selectedOption, picked, ...options, ...items].find(item => item && item.value === value);

  async function fetchPage(next, generation = version.current) {
    if (busy.current) return;
    busy.current = true;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setFailure(false);
    try {
      let result;
      if (loadOptions) result = await loadOptions({ search: search.trim(), page: next, limit: pageSize, signal: controller.signal });
      else {
        const filtered = options.filter(item => (item.searchText || item.label).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
        result = { options: filtered.slice((next - 1) * pageSize, next * pageSize), hasMore: next * pageSize < filtered.length };
      }
      if (generation !== version.current || controller.signal.aborted) return;
      setItems(previous => [...new Map([...(next === 1 ? [] : previous), ...result.options].map(item => [item.value, item])).values()]);
      setHasMore(result.hasMore);
      setPage(next);
    } catch (err) {
      if (!controller.signal.aborted && generation === version.current) setFailure(true);
    } finally {
      if (generation === version.current) { busy.current = false; setLoading(false); }
    }
  }

  useEffect(() => {
    const generation = ++version.current;
    request.current?.abort();
    busy.current = false;
    setItems([]); setPage(0); setHasMore(false); setActive(-1); setFailure(false);
    setLoading(open);
    if (!open) return;
    const timer = setTimeout(() => fetchPage(1, generation), loadOptions ? 300 : 0);
    return () => { clearTimeout(timer); ++version.current; request.current?.abort(); };
  }, [open, search, loadOptions, options, pageSize]);

  useEffect(() => {
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { if (active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, id]);

  function choose(item) {
    setPicked(item); onChange(item?.value || ''); setOpen(false); setSearch(''); input.current?.focus();
  }

  return <div ref={root} className="relative flex flex-col gap-2" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); onBlur?.(); }
  }}>
    <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
    <div className={`flex items-center gap-2 rounded-xl border px-3 shadow-sm transition-colors motion-reduce:transition-none ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'} ${error ? 'border-red-400 ring-2 ring-red-500/10' : open ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`}>
      <svg aria-hidden="true" className={`h-5 w-5 shrink-0 ${open ? 'text-blue-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>
      {OptionIcon && selected && !open && <OptionIcon option={selected} />}
      <Input id={id} ref={element => { input.current = element; inputRef?.(element); }} role="combobox"
        autoComplete="off" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined} aria-invalid={!!error}
        disabled={disabled} value={open ? search : (selected?.label || '')} placeholder="جست‌وجو و انتخاب…"
        className="!min-w-0 !w-full !border-0 !rounded-none !bg-transparent !px-0 !py-3 !text-sm !text-slate-800 dark:!text-slate-100 !shadow-none !outline-none !ring-0 placeholder:!text-slate-400 disabled:cursor-not-allowed" onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
        onChange={event => { setSearch(event.target.value); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive(previous => Math.max(0, Math.min(items.length - 1, previous + (event.key === 'ArrowDown' ? 1 : -1))));
            if (event.key === 'ArrowDown' && active >= items.length - 1 && hasMore && !failure) fetchPage(page + 1);
          }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (items[active]) choose(items[active]); }
        }} />
      {value && <button type="button" disabled={disabled} aria-label={`پاک کردن ${label}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" onClick={() => choose(null)}>×</button>}
      <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
    {error && <span role="alert" className="text-red-500 text-sm">{error}</span>}
    {open && <div className="absolute top-full inset-x-0 z-[60] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
      <div id={`${id}-list`} role="listbox" aria-label={label} aria-busy={loading}
        className="max-h-56 overflow-y-auto overscroll-contain space-y-1 [scrollbar-width:thin]" onScroll={event => {
          const el = event.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 40 && hasMore && !failure) fetchPage(page + 1);
        }}>
        {items.map((item, index) => <div key={item.value} id={`${id}-${index}`} role="option"
          aria-selected={item.value === value} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors motion-reduce:transition-none ${item.value === value ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-500/15 dark:text-blue-300' : active === index ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
          onPointerDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(item)}>
          <span className="flex min-w-0 items-center gap-2 break-words">{OptionIcon && <OptionIcon option={item} />}{item.label}</span>
          {item.value === value && <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>)}
      </div>
      {loading && <p role="status" className="flex items-center justify-center gap-2 p-4 text-xs text-slate-500 dark:text-slate-400"><span aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none rounded-full border-2 border-slate-200 border-t-blue-500" />در حال دریافت…</p>}
      {failure ? <button type="button" className="w-full rounded-lg bg-red-50 p-3 text-sm text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300" onClick={() => fetchPage(page + 1)}>دریافت ناموفق بود؛ تلاش دوباره</button>
        : !loading && !items.length ? <div className="px-3 py-7 text-center"><p className="text-sm font-medium text-slate-600 dark:text-slate-300">گزینه‌ای پیدا نشد</p><p className="mt-1 text-xs text-slate-400">عبارت دیگری را جست‌وجو کنید</p></div>
        : hasMore && !loading && <button type="button" className="mt-1 w-full rounded-lg border-t border-slate-100 p-3 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-slate-800 dark:text-blue-400 dark:hover:bg-blue-500/10" onClick={() => fetchPage(page + 1)}>نمایش بیشتر</button>}
    </div>}
  </div>;
}
