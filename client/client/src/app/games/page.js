"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useGetGamesQuery, useGetGameFiltersQuery } from "@/services/genre/genreApi";
import Main from "@/components/shared/layouts/Main";
import Container from "@/components/shared/Container";
import GameCard from "@/components/shared/GameCard";
import GameFilters from "@/components/games/GameFilters";
import PlatformBadges from "@/components/games/PlatformBadges";

export default function Games() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = Object.fromEntries(["genre", "developer", "theme", "age", "platform", "has_persian_subtitles", "has_dubbing"]
    .map((key) => [key, params.get(key) || ""]).filter(([, value]) => value));
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  const limit = 24;
  const games = useGetGamesQuery({ ...filters, page, limit });
  const total = games.currentData?.total || 0;
  const pageCount = Math.ceil(total / limit);
  const options = useGetGameFiltersQuery();

  const change = (key, value) => {
    const next = new URLSearchParams(params.toString());
    if (key !== "page") next.delete("page");
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/games${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const reset = () => router.replace("/games", { scroll: false });

  return (
    <Main>
      <Container className="pt-8 pb-28 md:pb-8">
        <div dir="rtl" className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold md:text-3xl">بازی‌ها</h1>
          {!games.isFetching && total > 0 && <p role="status" className="text-sm text-gray-500">{total.toLocaleString("fa-IR")} بازی</p>}
        </div>
        <section dir="rtl" className="grid grid-cols-12 gap-6 pb-12 md:gap-8">
          <GameFilters options={options.data?.data} filter={filters} onChange={change} reset={reset} isLoading={options.isLoading} isError={options.isError} refetch={options.refetch} resultCount={total} resultsLoading={games.isFetching} />
          <div aria-busy={games.isFetching} className="col-span-12 min-w-0 md:col-span-8 lg:col-span-9">
            <PlatformBadges platforms={options.data?.data?.platforms} value={filters.platform || ""} onChange={(value) => change("platform", value)} />
            {games.isFetching ? (
              <div aria-hidden="true" className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3 motion-reduce:[&>*]:animate-none">
                {Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-lg bg-gray-100" />)}
              </div>
            ) : games.isError ? (
              <div role="alert" className="rounded-xl border p-8 text-center text-sm">
                <p>دریافت بازی‌ها انجام نشد.</p>
                <button type="button" onClick={games.refetch} className="mt-4 text-pink-600">تلاش دوباره</button>
              </div>
            ) : !games.currentData?.data?.length ? (
              <p role="status" className="rounded-xl border p-8 text-center text-sm">بازی‌ای پیدا نشد.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3">
                {games.currentData.data.map((game) => <GameCard key={game._id} game={game} />)}
              </div>
            )}
            {!games.isFetching && pageCount > 1 && (
              <nav aria-label="صفحه‌های بازی‌ها" className="mt-6 flex items-center justify-center gap-4 text-sm">
                <button type="button" className="rounded border px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => change("page", page - 1)}>قبلی</button>
                <span>{page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}</span>
                <button type="button" className="rounded border px-3 py-2 disabled:opacity-40" disabled={page >= pageCount} onClick={() => change("page", page + 1)}>بعدی</button>
              </nav>
            )}
          </div>
        </section>
      </Container>
    </Main>
  );
}
