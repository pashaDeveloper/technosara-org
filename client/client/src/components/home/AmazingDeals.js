"use client";

import StarRating from "@/components/shared/StarRating";


import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { TbDiscount2 } from "react-icons/tb";
import { useGetProductsQuery } from "@/services/product/productApi";
import { formatToman } from "@/libs/currency";

export default function AmazingDeals() {
  const { data } = useGetProductsQuery({ condition: "stock", limit: 12 });
  const rail = useRef(null);
  const [navigation, setNavigation] = useState({ next: false, previous: false });
  const products = (data?.data || []).filter(
    (product) => product.campaign?.state !== "sold-out"
  );
  const offers = products.filter((product) =>
    ["discount", "on-sale"].includes(product.campaign?.state)
  );
  const items = (offers.length ? offers : products).slice(0, 12);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const updateNavigation = () => {
      const firstCard = element.querySelector("a");
      const distance = Math.abs(element.scrollLeft);
      const maximum = element.scrollWidth - element.clientWidth;
      setNavigation({
        next: maximum > 1 && distance < maximum - 1,
        previous: Boolean(firstCard &&
          firstCard.getBoundingClientRect().left >= element.getBoundingClientRect().right - 1),
      });
    };
    updateNavigation();
    element.addEventListener("scroll", updateNavigation, { passive: true });
    const observer = new ResizeObserver(updateNavigation);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", updateNavigation);
      observer.disconnect();
    };
  }, [items.length]);

  const scrollProducts = (direction) => {
    const element = rail.current;
    if (!element) return;
    const card = element.querySelector("a");
    const step = card ? card.getBoundingClientRect().width + 2 : 182;
    element.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <section dir="rtl" aria-label="کالای استوک" className="mx-auto w-full max-w-7xl md:px-4">
      <div className="relative">
      <div className="relative flex flex-col overflow-hidden bg-gradient-to-l from-pink-600 to-pink-400 pb-3 md:flex-row md:rounded-2xl md:py-4 md:pr-4">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-4 text-white md:w-40 md:flex-col md:justify-center md:px-2 md:py-6">
          <div className="flex items-center gap-2 md:flex-col md:gap-4">
            <TbDiscount2 aria-hidden="true" className="h-8 w-8 md:h-16 md:w-16" />
            <h2 className="text-lg font-black md:text-xl">کالای استوک</h2>
          </div>
          <span className="hidden rounded-lg bg-white/15 px-3 py-1.5 text-xs md:block">پیشنهادهای ویژه</span>
          <Link href="/products" className="flex shrink-0 items-center gap-1 text-xs font-medium md:rounded-lg md:bg-white md:px-3 md:py-2 md:text-pink-700">
            مشاهده همه <HiOutlineChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </header>

        <div ref={rail} tabIndex={0} aria-label="محصولات پیشنهادی؛ برای دیدن محصولات بیشتر پیمایش کنید" className="flex min-w-0 flex-1 snap-x snap-mandatory gap-0.5 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          {!items.length ? Array.from({ length: 6 }, (_, index) => (
            <div key={index} aria-hidden="true" className="flex w-[148px] shrink-0 flex-col gap-4 bg-white p-3 md:first:rounded-r-xl md:[&:nth-last-child(2)]:rounded-l-xl md:w-[180px]">
              <div className="h-32 animate-pulse rounded-lg bg-pink-50" />
              <div className="h-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-5 animate-pulse rounded bg-pink-50" />
            </div>
          )) : items.map((product) => (
            <Link key={product._id} href={`/product?product_id=${encodeURIComponent(product._id)}&product_title=${encodeURIComponent(product.title)}`} className="group flex w-[148px] shrink-0 snap-start flex-col bg-white p-3 md:first:rounded-r-xl md:[&:nth-last-child(2)]:rounded-l-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pink-700 md:w-[180px] md:p-4">
              <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-md">
                <Image src={product.thumbnail?.url || "/logo.png"} alt={product.title} fill unoptimized className="scale-105 object-cover transition-transform group-hover:scale-110" />
              </div>
              <h3 className="mb-3 truncate text-xs leading-5 text-gray-800 md:text-sm md:leading-6">{product.title}</h3>
              <p title={product.summary} className="mb-3 line-clamp-1 text-xs leading-5 text-gray-500">{product.summary}</p>
              <div className="mt-auto flex flex-col gap-2">
                <StarRating reviews={product.reviews} />
                <span className="w-fit max-w-full truncate rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-medium text-pink-700">{product.campaign?.title || "پیشنهاد ویژه"}</span>
                <span className="whitespace-nowrap text-left text-xs font-bold text-slate-900 md:text-sm">{formatToman(product.price)}</span>
              </div>
            </Link>
          ))}
          <div aria-hidden="true" className="hidden shrink-0 md:block md:w-4" />
        </div>
      </div>
        {items.length > 0 && navigation.next && (
          <button type="button" aria-label="نمایش محصولات بعدی" onClick={() => scrollProducts(-1)} className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden h-10 w-10 items-center justify-center rounded-full border bg-white text-gray-600 shadow-sm transition-colors hover:bg-pink-50 md:flex">
            <HiOutlineChevronLeft className="h-5 w-5" />
          </button>
        )}
        {items.length > 0 && navigation.previous && (
          <button type="button" aria-label="نمایش محصولات قبلی" onClick={() => scrollProducts(1)} className="absolute right-44 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 hidden h-10 w-10 items-center justify-center rounded-full border bg-white text-gray-600 shadow-sm transition-colors hover:bg-pink-50 md:flex">
            <HiOutlineChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  );
}
