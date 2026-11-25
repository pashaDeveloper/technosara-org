"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineAdjustments, HiOutlineChevronDown, HiOutlineX, HiOutlineRefresh } from "react-icons/hi";
import { useGetBrandsQuery } from "@/services/brand/brandApi";
import { useGetCategoriesQuery } from "@/services/category/categoryApi";
import { useGetStoresQuery } from "@/services/store/storeApi";
import { clearFilter, setBrand, setCategory, setStore } from "@/features/filter/filterSlice";

export default function FilterSidebar() {
  const brands = useGetBrandsQuery();
  const categories = useGetCategoriesQuery();
  const stores = useGetStoresQuery();
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = useSelector((state) => state.filter);
  const [active, setActive] = useState(null);
  const dialog = useRef(null);
  const groups = [
    { key: "category", title: "دسته‌بندی", query: categories, action: setCategory },
    { key: "brand", title: "برند", query: brands, action: setBrand },
    { key: "store", title: "فروشگاه", query: stores, action: setStore },
  ];
  const selected = groups.find((group) => group.key === active);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setActive(null); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!active) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  const choose = (group, value) => {
    dispatch(group.action(value));
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(group.key, value);
    else params.delete(group.key);
    for (const key of ["category", "brand", "store"]) {
      if (["null", "undefined", ""].includes(params.get(key))) params.delete(key);
    }
    router.replace(`/products${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <aside className="col-span-12 min-w-0 md:col-span-4 lg:col-span-3" dir="rtl" aria-label="فیلتر محصولات">
      <section className="hidden flex-col gap-y-4 md:sticky md:top-4 md:flex">
        <div className="flex items-center justify-between rounded border px-4 py-2">
          <h2 className="text-lg">پاک کردن فیلترها</h2>
          <button type="button" aria-label="پاک کردن فیلترها" onClick={() => { dispatch(clearFilter()); router.replace("/products", { scroll: false }); }} className="rounded-secondary border p-1">
            <HiOutlineRefresh className="h-5 w-5" />
          </button>
        </div>
        {groups.map((group) => (
          <section key={group.key} className="flex max-h-96 flex-col gap-y-4 overflow-y-auto rounded-xl border px-4 py-2 scrollbar-hide">
            <h2 className="text-lg">انتخاب {group.title}</h2>
            {group.query.isLoading ? <p role="status" className="py-3 text-sm text-gray-500">در حال دریافت گزینه‌ها…</p> : group.query.isError ? (
              <button type="button" onClick={group.query.refetch} className="py-3 text-sm text-pink-600">تلاش دوباره</button>
            ) : (
              <fieldset className="flex flex-col gap-y-2.5">
                <legend className="sr-only">{group.title}</legend>
                {[{ _id: "", title: "همه" }, ...(group.query.data?.data || [])].map((item) => (
                  <label key={item._id} className="flex cursor-pointer items-center gap-x-1.5 text-sm">
                    <input type="radio" name={`desktop-filter-${group.key}`} value={item._id} checked={(filter[group.key] || "") === item._id} onChange={() => choose(group, item._id)} className="rounded-secondary border-gray-300 text-gray-500 focus:ring-gray-400" />
                    {item.title}
                  </label>
                ))}
              </fieldset>
            )}
          </section>
        ))}
      </section>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <span className="ml-2 flex items-center gap-2 text-sm font-medium"><HiOutlineAdjustments className="h-5 w-5" /> فیلترها</span>
        {groups.map((group) => {
          const value = filter[group.key];
          const item = group.query.data?.data?.find((entry) => entry._id === value);
          return (
            <button key={group.key} type="button" aria-haspopup="dialog" aria-expanded={active === group.key} onClick={() => setActive(group.key)} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${value ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-700 hover:border-pink-300"}`}>
              {item?.title || group.title}<HiOutlineChevronDown className="h-4 w-4" />
            </button>
          );
        })}
        {groups.some((group) => filter[group.key]) && (
          <button type="button" onClick={() => { dispatch(clearFilter()); router.replace("/products", { scroll: false }); }} className="px-2 py-2 text-xs text-pink-600">پاک کردن فیلترها</button>
        )}
      </div>

      <dialog ref={dialog} aria-labelledby="product-filter-title" onClose={() => setActive(null)} onClick={(event) => { if (event.target === event.currentTarget) setActive(null); }} className="filter-sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-3xl border-0 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
        <div className="mx-auto flex max-h-[85dvh] max-w-2xl flex-col" dir="rtl">
          <div aria-hidden="true" className="mx-auto mb-2 mt-3 h-1 w-10 shrink-0 rounded-full bg-gray-200" />
          <header className="flex shrink-0 items-center justify-between border-b px-5 pb-4 pt-2">
            <h2 id="product-filter-title" className="text-lg font-bold">انتخاب {selected?.title}</h2>
            <button type="button" aria-label="بستن فیلترها" onClick={() => setActive(null)} className="rounded-full bg-gray-100 p-2 hover:bg-gray-200"><HiOutlineX className="h-5 w-5" /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
            {selected?.query.isLoading ? <p role="status" className="py-8 text-center text-sm text-gray-500">در حال دریافت گزینه‌ها…</p> : selected?.query.isError ? (
              <div role="status" className="py-6 text-center text-sm"><p>دریافت فیلترها انجام نشد.</p><button type="button" onClick={selected.query.refetch} className="mt-3 text-pink-600">تلاش دوباره</button></div>
            ) : selected && (
              <fieldset>
                <legend className="sr-only">{selected.title}</legend>
                {[{ _id: "", title: "همه" }, ...(selected.query.data?.data || [])].map((item) => (
                  <label key={item._id} className="flex cursor-pointer items-center justify-between gap-3 border-b border-gray-100 py-4 text-sm last:border-0">
                    {item.title}
                    <input type="radio" name={`filter-${selected.key}`} value={item._id} checked={(filter[selected.key] || "") === item._id} onChange={() => choose(selected, item._id)} className="h-5 w-5 border-gray-300 text-pink-600 focus:ring-pink-500" />
                  </label>
                ))}
              </fieldset>
            )}
          </div>
          <footer className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setActive(null)} className="w-full rounded-xl bg-pink-600 py-3 text-sm font-medium text-white transition-colors hover:bg-pink-700">مشاهده محصولات</button>
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
