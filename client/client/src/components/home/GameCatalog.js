"use client";

import Link from "next/link";
import { useGetGamesQuery, useGetGameFiltersQuery } from "@/services/genre/genreApi";
import { useRef, useState } from "react";
import PlatformBadges from "../games/PlatformBadges";
import GameCard from "../shared/GameCard";
import HorizontalScroll from "../shared/HorizontalScroll";
import { HiOutlineChevronLeft } from "react-icons/hi";

export default function GameCatalog() {
  const [platform, setPlatform] = useState("");
  const { currentData, isLoading, isFetching, isError, refetch } = useGetGamesQuery({ limit: 12, ...(platform ? { platform } : {}) });
  const options = useGetGameFiltersQuery();
  const games = currentData?.data || [];
  const rail = useRef(null);

  const advance = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const element = rail.current;
    if (!element) return;
    const remaining = element.scrollWidth - element.clientWidth - Math.abs(element.scrollLeft);
    if (remaining <= 2) return;
    event.preventDefault();
    element.scrollBy({
      left: -Math.min(remaining, element.clientWidth * 0.85),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <section dir="rtl" aria-label="بازی‌ها" className="mt-8 flex min-w-0 max-w-full flex-col gap-5">
      <PlatformBadges platforms={options.data?.data?.platforms} value={platform} onChange={setPlatform} className="w-full" />
      {isLoading || isFetching || (!isError && !games.length) ? (
        <div aria-hidden="true" className="flex gap-3 overflow-x-auto scrollbar-hide motion-reduce:[&>*]:animate-none">
          {Array.from({ length: 7 }, (_, index) => <div key={index} className="aspect-square w-44 shrink-0 animate-pulse rounded-lg bg-gray-100 md:w-56" />)}
        </div>
      ) : isError ? (
        <div role="status" className="rounded-xl border p-8 text-center text-sm text-gray-500">
          <p>دریافت بازی‌ها انجام نشد.</p>
          <button type="button" onClick={refetch} className="mt-3 text-sky-600">تلاش دوباره</button>
        </div>
      ) : (
        <div className="relative min-w-0">
          <HorizontalScroll railRef={rail} label="فهرست بازی‌ها؛ برای دیدن موارد بیشتر افقی پیمایش کنید" className="games-scroll flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
            {games.map((game) => <GameCard key={game._id} game={game} compact />)}
          </HorizontalScroll>
          <Link href={platform ? `/games?platform=${encodeURIComponent(platform)}` : "/games"} onClick={advance}
            aria-label="بازی‌های بعدی یا نمایش همه در انتهای ردیف"
            className="absolute left-0 top-[88px] z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-gray-600 shadow-sm transition-colors hover:bg-pink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 md:top-28">
            <HiOutlineChevronLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
        </div>
      )}
    </section>
  );
}
