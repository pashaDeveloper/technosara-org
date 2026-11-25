import Link from "next/link";
import { useEffect, useRef } from "react";
import { FiBriefcase, FiChevronLeft, FiHardDrive, FiSun, FiUsers } from "react-icons/fi";
import { asArray, formatNumber, gameImage, imageUrl } from "./gameDetailMedia";
import ProgressiveGameImage from "./ProgressiveGameImage";

export function GameHeading({ game }) {
  const metaFrameRef = useRef(null);
  const poster = gameImage(imageUrl(game.detail_poster) ? game.detail_poster : game.image, game.image);
  const developers = game.developerNames?.join("، ");
  const date = game.release_date && Number.isFinite(new Date(game.release_date).getTime())
    ? new Date(game.release_date).toLocaleDateString("fa-IR", { dateStyle: "long", timeZone: "UTC" })
    : "";
  const sizes = asArray(game.storage_sizes).map((row) => Number(row?.bytes)).filter((bytes) => Number.isFinite(bytes) && bytes > 0);
  const storage = sizes.length
    ? [...new Set([Math.min(...sizes), Math.max(...sizes)])].map((bytes) => formatNumber.format(bytes / 1e9)).join(" تا ")
    : "";
  const mode = game.modeNames?.[0];
  const hasMeta = Boolean(date || storage || developers || mode);

  useEffect(() => {
    const frame = metaFrameRef.current;
    if (!frame) return;
    const row = frame.firstElementChild;
    const fit = () => {
      if (frame.clientWidth && row.offsetWidth) {
        frame.style.setProperty("--edge-meta-scale", Math.min(1, frame.clientWidth / row.offsetWidth));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(row);
    return () => observer.disconnect();
  }, [hasMeta]);

  return (
    <div className="edge-heading edge-heading-with-poster">
      <div className="edge-heading-copy">
        <nav className="edge-breadcrumb" aria-label="مسیر صفحه">
          <Link href="/games">بازی‌ها</Link>
          {game.genreNames?.[0] && <><FiChevronLeft /><span>{game.genreNames[0]}</span></>}
          <FiChevronLeft /><span>{game.title}</span>
        </nav>
        <div className="edge-heading-info">
          <h1 dir="auto">{game.title}</h1>
          {hasMeta && <div className="edge-meta-frame" ref={metaFrameRef}><div className="edge-meta">
            {date && <span><FiSun aria-hidden="true" /><span className="sr-only">تاریخ انتشار</span><b>{date}</b></span>}
            {sizes.length > 0 && <span><FiHardDrive aria-hidden="true" /><span className="sr-only">حجم بازی</span><b>{storage} گیگابایت</b></span>}
            {developers && <span><FiBriefcase aria-hidden="true" /><span className="sr-only">شرکت سازنده</span><bdi className="edge-developer-names">{developers}</bdi></span>}
            {mode && <span><FiUsers aria-hidden="true" /><span className="sr-only">حالت بازی</span>{mode}</span>}
          </div></div>}
        </div>
      </div>
      {poster.src && <ProgressiveGameImage className="edge-detail-poster" {...poster} alt={game.title} />}
    </div>
  );
}

export default function GameHero({ game, children }) {
  const { src: banner, preview } = gameImage([game.detail_banner, game.detail_gif, ...asArray(game.screenshots)].find(imageUrl));
  const artworkRef = useRef(null);

  useEffect(() => {
    const artwork = artworkRef.current;
    const viewport = artwork?.parentElement;
    if (!viewport) return;
    let frame;
    const renderPosition = () => {
      frame = undefined;
      const bounds = viewport.getBoundingClientRect();
      const scroll = Math.max(window.scrollY, -bounds.top, 0);
      const offset = Math.min(bounds.height * 0.2, scroll * 0.55);
      artwork.style.setProperty("--hero-scroll-offset", `${offset}px`);
    };
    const queuePosition = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(renderPosition);
    };
    renderPosition();
    window.addEventListener("scroll", queuePosition, { capture: true, passive: true });
    window.addEventListener("resize", queuePosition);
    return () => {
      window.removeEventListener("scroll", queuePosition, true);
      window.removeEventListener("resize", queuePosition);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [banner]);

  return (
    <div className="edge-game-body">
      <div aria-hidden="true" className={`edge-hero-art ${banner ? "" : "edge-empty-banner"}`}>
        {banner && <div ref={artworkRef} className="edge-hero-image">
          <ProgressiveGameImage src={banner} preview={preview} alt="" />
        </div>}
      </div>
      {children}
    </div>
  );
}

