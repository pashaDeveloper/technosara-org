"use client";

import { useEffect, useRef, useState } from "react";
import Rows from "@/components/shared/skeletonLoading/Rows";
import { HiOutlineAdjustments, HiOutlineX, HiOutlineCheck, HiOutlineSearch } from "react-icons/hi";

const languageOptions = [
  { id: "has_persian_subtitles", title: "زیرنویس دارد" },
  { id: "has_dubbing", title: "دوبله دارد" },
];

function LanguageFilters({ filter, onChange }) {
  return <fieldset className="flex flex-col gap-y-2.5">
    <legend className="sr-only">زیرنویس و دوبله</legend>
    {languageOptions.map(({ id, title }) => (
      <label key={id} className="flex cursor-pointer items-center gap-x-1.5 text-sm">
        <input type="checkbox" checked={filter[id] === "true"} onChange={(event) => onChange(id, event.target.checked ? "true" : "")} className="rounded-secondary border-gray-300 text-gray-500 focus:ring-gray-400" />
        {title}
      </label>
    ))}
  </fieldset>;
}

export default function GameFilters({ options, filter, onChange, reset, isLoading, isError, refetch, resultCount = 0, resultsLoading = false }) {
  const [active, setActive] = useState(null);
  const dialog = useRef(null);
  const [tab, setTab] = useState("genre");
  const [search, setSearch] = useState("");
  const query = { isLoading, isError, refetch };
  const groups = [
    { key: "genre", title: "ژانر", options: options?.genres, query },
    { key: "developer", title: "شرکت سازنده", options: options?.developers, query },
    { key: "theme", title: "تم", options: options?.themes, query },
    { key: "age", title: "رده سنی", options: options?.ages, query },
    { key: "language", title: "زیرنویس و دوبله" },
  ];


  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const close = () => { if (desktop.matches) setActive(null); };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    if (!active) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, [active]);

  const choose = (group, value) => onChange(group.key, value);
  const selectedGroup = groups.find((group) => group.key === tab);
  const normalize = (value) => value.normalize("NFKC").replaceAll("ي", "ی").replaceAll("ك", "ک").toLowerCase();
  const visibleOptions = (selectedGroup.options || []).filter((item) => tab !== "developer" || normalize(item.title).includes(normalize(search.trim())));
  return (
    <aside className="col-span-12 min-w-0 h-0 md:h-auto md:col-span-4 lg:col-span-3" dir="rtl" aria-label="فیلتر بازی‌ها">
      <section className="hidden flex-col gap-y-4 md:sticky md:top-4 md:flex">
        <div className="flex items-center justify-between rounded border px-4 py-2">
          <h2 className="text-lg">فیلترها</h2>
          <button type="button" aria-label="پاک کردن فیلترها" onClick={() => { reset() }} className="rounded-secondary border p-1">
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>
        {groups.map((group) => (
          <section key={group.key} className="flex max-h-96 flex-col gap-y-4 overflow-y-auto rounded-xl border px-4 py-2 scrollbar-hide">
            <h2 className="text-lg">{group.key === "language" ? group.title : `انتخاب ${group.title}`}</h2>
            {group.key === "language" ? <LanguageFilters filter={filter} onChange={onChange} /> : group.query.isLoading ? <Rows count={2} /> : group.query.isError ? (
              <button type="button" onClick={group.query.refetch} className="py-3 text-sm text-pink-600">تلاش دوباره</button>
            ) : !group.options?.length ? <Rows count={2} /> : (
              <fieldset className="flex flex-col gap-y-2.5">
                <legend className="sr-only">{group.title}</legend>
                {[{ id: "", title: "همه" }, ...(group.options || [])].map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center gap-x-1.5 text-sm">
                    <input type="radio" name={`desktop-filter-${group.key}`} value={item.id} checked={(filter[group.key] || "") === item.id} onChange={() => choose(group, item.id)} className="rounded-secondary border-gray-300 text-gray-500 focus:ring-gray-400" />
                    {item.title}
                  </label>
                ))}
              </fieldset>
            )}
          </section>
        ))}
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
        <button type="button" aria-haspopup="dialog" aria-expanded={Boolean(active)} onClick={() => setActive("all")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-pink-700">
          <HiOutlineAdjustments className="h-5 w-5" /> فیلتر
        </button>
      </div>
      <dialog ref={dialog} aria-labelledby="game-filter-title" onClose={() => setActive(null)} onClick={(event) => { if (event.target === event.currentTarget) setActive(null); }} className="filter-sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-3xl border-0 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
        <div className="mx-auto flex max-h-[85dvh] max-w-2xl flex-col" dir="rtl">
          <div aria-hidden="true" className="mx-auto mb-2 mt-3 h-1 w-10 shrink-0 rounded-full bg-gray-200" />
          <header className="flex shrink-0 items-center justify-between border-b px-5 pb-4 pt-2">
            <h2 id="game-filter-title" className="text-lg font-bold">فیلتر بازی‌ها</h2>
            <button type="button" aria-label="پاک کردن فیلترها" title="پاک کردن فیلترها" onClick={reset} className="mr-auto ml-2 rounded-full p-2 text-gray-500 hover:bg-gray-100"><HiOutlineX className="h-5 w-5" /></button>
            <button type="button" aria-label="بستن فیلترها" onClick={() => setActive(null)} className="rounded-full bg-gray-100 p-2 hover:bg-gray-200"><HiOutlineX className="h-5 w-5" /></button>
          </header>
          <div role="tablist" aria-label="انواع فیلتر" className="flex shrink-0 gap-1 overflow-x-auto border-b px-4 pt-2 scrollbar-hide">
            {groups.map((group) => (
              <button key={group.key} id={`tab-${group.key}`} type="button" role="tab" aria-selected={tab === group.key} aria-controls={`panel-${group.key}`} tabIndex={tab === group.key ? 0 : -1}
                onClick={() => setTab(group.key)} onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const index = groups.findIndex((item) => item.key === tab);
                  const next = event.key === "Home" ? 0 : event.key === "End" ? groups.length - 1 : (index + (event.key === "ArrowLeft" ? 1 : -1) + groups.length) % groups.length;
                  setTab(groups[next].key);
                  document.getElementById(`tab-${groups[next].key}`)?.focus();
                }} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-bold transition-colors ${tab === group.key ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {group.title}{(group.key === "language" ? languageOptions.some(({ id }) => filter[id] === "true") : filter[group.key]) && <span aria-label="فیلتر فعال" className="h-1.5 w-1.5 rounded-full bg-pink-500" />}
              </button>
            ))}
          </div>
          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="min-h-[240px] min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            {tab === "language" ? <LanguageFilters filter={filter} onChange={onChange} /> : isLoading ? <Rows count={2} /> : isError ? (
              <div role="status" className="py-6 text-center text-sm"><p>دریافت فیلترها انجام نشد.</p><button type="button" onClick={refetch} className="mt-3 text-pink-600">تلاش دوباره</button></div>
            ) : <>
              {tab === "developer" && <label className="mb-5 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3">
                <HiOutlineSearch aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-400" />
                <span className="sr-only">جست‌وجوی سازنده</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام شرکت سازنده…" className="w-full !border-0 !bg-transparent py-3 text-sm !shadow-none !ring-0" />
              </label>}
              <div className="flex flex-wrap gap-2.5">
                {[{ id: "", title: "همه" }, ...visibleOptions].map((item) => {
                  const checked = (filter[tab] || "") === item.id;
                  return <button key={item.id} type="button" aria-pressed={checked} onClick={() => choose(selectedGroup, item.id)} className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm transition-colors ${checked ? "border-pink-300 bg-pink-50 font-medium text-pink-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"}`}>
                    {checked && <HiOutlineCheck aria-hidden="true" className="h-4 w-4" />}{item.title}
                  </button>;
                })}
              </div>
              {!visibleOptions.length && <div className="mt-4"><Rows count={2} /></div>}
            </>}
          </div>          <footer className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setActive(null)} className="w-full rounded-xl bg-pink-600 py-3 text-sm font-medium text-white transition-colors hover:bg-pink-700">{resultsLoading ? "در حال دریافت بازی‌ها…" : `نمایش ${resultCount.toLocaleString("fa-IR")} بازی`}</button>
          </footer>
        </div>
      </dialog>
      <style jsx>{`
        .filter-sheet[open] { animation: slide-up 240ms ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .filter-sheet[open] { animation: none; } }
      `}</style>
    </aside>
  );
}
