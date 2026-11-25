"use client";

import Link from "next/link";
import { useGetGamesQuery, useGetGameFiltersQuery } from "@/services/genre/genreApi";
import { useState } from "react";
import PlatformBadges from "../games/PlatformBadges";
import GameCard from "../shared/GameCard";
import HorizontalScroll from "../shared/HorizontalScroll";
import { HiOutlineArrowLeft } from "react-icons/hi";

export default function GameCatalog() {
  const [platform, setPlatform] = useState("");
  const { currentData, isLoading, isFetching, isError, refetch } = useGetGamesQuery({ limit: 12, ...(platform ? { platform } : {}) });
  const options = useGetGameFiltersQuery();
  const games = currentData?.data || [];

  return (
    <section dir="rtl" aria-label="بازی‌ها" className="mt-8 flex min-w-0 max-w-full flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3 md:flex-nowrap">
        <PlatformBadges platforms={options.data?.data?.platforms} value={platform} onChange={setPlatform} className="min-w-0 flex-1 basis-full md:basis-auto" />
        <Link href={platform ? `/games?platform=${encodeURIComponent(platform)}` : "/games"} aria-label="نمایش همه بازی‌ها" title="نمایش همه بازی‌ها" className="mr-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50 md:mr-0">
          <HiOutlineArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
      </header>
      {isLoading || isFetching || (!isError && !games.length) ? (
        <div aria-hidden="true" className="flex gap-3 overflow-x-auto scrollbar-hide motion-reduce:[&>*]:animate-none">
          {Array.from({ length: 7 }, (_, index) => <div key={index} className="h-64 w-36 shrink-0 animate-pulse rounded-lg bg-gray-100 md:w-40" />)}
        </div>
      ) : isError ? (
        <div role="status" className="rounded-xl border p-8 text-center text-sm text-gray-500">
          <p>دریافت بازی‌ها انجام نشد.</p>
          <button type="button" onClick={refetch} className="mt-3 text-sky-600">تلاش دوباره</button>
        </div>
      ) : (
        <HorizontalScroll label="فهرست بازی‌ها؛ برای دیدن موارد بیشتر افقی پیمایش کنید" className="games-scroll flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
          {games.map((game) => <GameCard key={game._id} game={game} compact />)}
        </HorizontalScroll>
      )}
    </section>
  );
}
