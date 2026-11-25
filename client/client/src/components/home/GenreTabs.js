"use client";

import Link from "next/link";
import { useGetGenresQuery } from "@/services/genre/genreApi";
import Container from "../shared/Container";
import GameCatalog from "./GameCatalog";
import HorizontalScroll from "../shared/HorizontalScroll";

export default function GenreTabs() {
  const { data, isLoading, isError, refetch } = useGetGenresQuery();
  const genres = (data?.data || []).slice(0, 10);

  return (
    <Container className="-mt-12">
      <section dir="rtl" aria-label="ژانر بازی‌ها" className="relative -mx-4 bg-gray-100 md:mx-0 md:rounded-md">
        <HorizontalScroll label="ژانر بازی‌ها" scrollbarClassName="mt-3 mb-3" className="flex min-h-20 items-center gap-6 overflow-x-auto overscroll-x-contain px-5 md:min-h-[84px] md:justify-between md:gap-7 md:px-9">
          {isLoading || (!isError && !genres.length) ? Array.from({ length: 10 }, (_, index) => (
            <div key={index} aria-hidden="true" className="h-4 w-20 shrink-0 animate-pulse rounded bg-gray-200" />
          )) : genres.map((genre, index) => (
            <Link key={genre._id} href={`/games?genre=${encodeURIComponent(genre._id)}`} title={genre.description} className={`relative shrink-0 whitespace-nowrap py-2 text-lg font-black leading-7 transition-colors hover:text-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500 md:text-xl md:leading-7 md:text-gray-700 ${index === 0 ? "text-sky-400 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-sky-400 after:content-[''] md:after:hidden" : "text-gray-700"}`}>
              {genre.name_fa || genre.name}
            </Link>
          ))}
          {isError && <button type="button" onClick={refetch} className="shrink-0 text-sm text-gray-500">دریافت ژانرها؛ تلاش دوباره</button>}
        </HorizontalScroll>
      </section>
      <GameCatalog />
    </Container>
  );
}
