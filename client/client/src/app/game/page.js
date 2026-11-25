"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import Main from "@/components/shared/layouts/Main";
import GameHero, { GameHeading } from "@/components/games/details/GameHero";
import GameGallery from "@/components/games/details/GameGallery";
import GameDescription from "@/components/games/details/GameDescription";
import GameRatings from "@/components/games/details/GameRatings";
import GameComments from "@/components/games/details/GameComments";
import GameInfo from "@/components/games/details/GameInfo";
import { useGetGameQuery } from "@/services/genre/genreApi";
import "./game-detail.css";

function MobileGameInfo({ game }) {
  const dialogRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 600px)");
    const closeOnDesktop = () => {
      if (!mobile.matches && dialogRef.current?.open) dialogRef.current.close();
    };
    mobile.addEventListener("change", closeOnDesktop);
    return () => {
      mobile.removeEventListener("change", closeOnDesktop);
      animationRef.current?.cancel();
    };
  }, []);

  const open = () => {
    const dialog = dialogRef.current;
    dialog.showModal();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animationRef.current = dialog.animate(
      [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
      { duration: 300, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)" },
    );
  };

  const close = () => {
    const dialog = dialogRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      return;
    }
    const position = window.getComputedStyle(dialog).transform;
    animationRef.current?.cancel();
    const animation = dialog.animate(
      [{ transform: position }, { transform: "translateY(100%)" }],
      { duration: 240, easing: "ease-in", fill: "forwards" },
    );
    animationRef.current = animation;
    animation.onfinish = () => dialog.close();
  };

  return (
    <div className="edge-mobile-game-info">
      <button type="button" className="edge-mobile-info-trigger" aria-haspopup="dialog"
        onClick={open}>اطلاعات بازی</button>
      <dialog ref={dialogRef} className="edge-mobile-info-dialog" aria-labelledby="mobile-game-info-title"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClose={() => { animationRef.current?.cancel(); animationRef.current = null; }}>
        <div className="edge-mobile-info-screen">
          <header>
            <h2 id="mobile-game-info-title">اطلاعات بازی</h2>
            <button type="button" aria-label="بستن اطلاعات بازی" onClick={close}>
              <FiX aria-hidden="true" />
            </button>
          </header>
          <div className="edge-mobile-info-content"><GameInfo game={game} /></div>
        </div>
      </dialog>
    </div>
  );
}

function GameDetailSkeleton({ loading }) {
  return (
    <main className="game-detail" aria-busy={loading} aria-label="جزئیات بازی" dir="rtl">
      <div className="edge-game-body" aria-hidden="true">
        <div className="edge-hero-art edge-loading-block" />
        <div className="edge-heading edge-heading-with-poster">
          <div className="edge-heading-copy">
            <div className="edge-breadcrumb edge-loading-block h-7 w-36" />
            <div className="edge-heading-info grid w-full max-w-sm gap-3 py-3">
              <div className="edge-loading-block h-10 w-full rounded-lg" />
              <div className="edge-loading-block h-5 w-2/3 rounded" />
            </div>
          </div>
          <div className="edge-detail-poster edge-loading-block" />
        </div>
        <div className="edge-slideshow">
          {[0, 1, 2].map((index) => <div key={index} className="edge-slide edge-loading-block" />)}
        </div>
        <div className="grid gap-3 py-6">
          <div className="edge-loading-block h-8 w-1/3 rounded" />
          <div className="edge-loading-block h-4 w-full rounded" />
          <div className="edge-loading-block h-4 w-3/4 rounded" />
        </div>
      </div>
    </main>
  );
}

export default function GameDetail() {
  const id = useSearchParams().get("game_id");
  const { currentData, isFetching, error, refetch } = useGetGameQuery(id, { skip: !id });
  const game = currentData?.data;
  const missing = !id || error?.status === 404;

  return (
    <Main>
      {game ? (
        <main key={id} className="game-detail" dir="rtl">
          <GameHero game={game}>
            <div className="edge-detail-layout">
              <section className="edge-main">
                <GameHeading game={game} />
              </section>
              <GameGallery game={game} />
              <section className="edge-main edge-game-introduction">
                <GameDescription game={game}>
                  <div className="edge-game-feedback">
                    <GameRatings rating={game.rating} />
                    <GameComments reviews={game.reviews} />
                  </div>
                </GameDescription>
              </section>
            </div>
          </GameHero>
          <MobileGameInfo game={game} />
        </main>
      ) : missing || isFetching ? <GameDetailSkeleton loading={isFetching} /> : (
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <p role="alert">دریافت جزئیات بازی انجام نشد.</p>
          <div className="mt-4 flex justify-center gap-4 text-pink-700">
            <Link href="/games">بازگشت به بازی‌ها</Link>
            <button type="button" onClick={refetch}>تلاش دوباره</button>
          </div>
        </main>
      )}
    </Main>
  );
}
