import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import ProgressiveGameImage from "./ProgressiveGameImage";

function centerSlide(track, slide, behavior = "instant") {
  const viewport = track.getBoundingClientRect();
  const image = slide.getBoundingClientRect();
  track.scrollBy({
    left: image.left + image.width / 2 - viewport.left - viewport.width / 2,
    behavior,
  });
}

function wrap(position, count) {
  return (position % count + count) % count;
}

export default function GameSlideshow({ shots, alt, onOpen, paused }) {
  const carouselRef = useRef(null);
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const count = shots.length;
  const buffer = count > 1 ? 3 : 0;
  const positions = Array.from({ length: count + 2 * buffer }, (_, index) => index - buffer);

  useEffect(() => {
    const track = trackRef.current;
    const align = () => {
      if (track.clientWidth) {
        activeRef.current = Math.min(activeRef.current, count - 1);
        setActive(activeRef.current);
        centerSlide(track, track.children[activeRef.current + buffer]);
      }
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(track);
    return () => {
      observer.disconnect();
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [count, buffer]);

  const settle = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const track = trackRef.current;
      if (!track?.clientWidth) return;
      const viewport = track.getBoundingClientRect();
      const center = viewport.left + viewport.width / 2;
      const nearest = [...track.children].reduce((best, slide, index) => {
        const rect = slide.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - center);
        return distance < best.distance ? { index, distance } : best;
      }, { index: buffer, distance: Infinity });
      const position = nearest.index - buffer;
      const next = wrap(position, count);
      activeRef.current = next;
      setActive(next);
      if (position !== next) centerSlide(track, track.children[next + buffer]);
    }, 120);
  };

  const goTo = useCallback((position) => {
    const track = trackRef.current;
    const next = wrap(position, count);
    activeRef.current = next;
    setActive(next);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    centerSlide(track, track.children[position + buffer], behavior);
  }, [buffer, count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canHover = window.matchMedia("(hover: hover)");
    const timer = window.setInterval(() => {
      const carousel = carouselRef.current;
      if (document.hidden || reducedMotion.matches || carousel.matches(":focus-within") ||
          (canHover.matches && carousel.matches(":hover")) || timerRef.current) return;
      goTo(activeRef.current + 1);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [count, goTo, paused]);

  return (
    <div ref={carouselRef} className="edge-carousel">
      <div className="edge-carousel-stage">
        <div ref={trackRef} className="edge-slideshow" aria-label="اسلاید تصاویر بازی" onScroll={count > 1 ? settle : undefined}>
          {positions.map((position) => {
            const index = wrap(position, count);
            const current = position === active;
            return (
              <button type="button" className="edge-slide" key={position} tabIndex={current ? 0 : -1}
                aria-label={alt(index)} aria-current={current || undefined}
                onClick={(event) => {
                  if (current) {
                    onOpen(index, event);
                  } else {
                    centerSlide(trackRef.current, event.currentTarget,
                      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");
                  }
                }}
                onKeyDown={(event) => {
                  if (count < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                  event.preventDefault();
                  const next = wrap(active + (event.key === "ArrowLeft" ? 1 : -1), count);
                  const slide = trackRef.current.children[next + buffer];
                  activeRef.current = next;
                  setActive(next);
                  slide.focus({ preventScroll: true });
                  centerSlide(trackRef.current, slide);
                }}>
                <ProgressiveGameImage {...shots[index]} alt="" loading={position >= -1 && position <= 1 ? "eager" : "lazy"} />
              </button>
            );
          })}
        </div>
        {count > 1 && <>
          <button type="button" className="edge-carousel-arrow edge-carousel-next" aria-label="تصویر بعدی" onClick={() => goTo(activeRef.current + 1)}><FiChevronLeft /></button>
          <button type="button" className="edge-carousel-arrow edge-carousel-prev" aria-label="تصویر قبلی" onClick={() => goTo(activeRef.current - 1)}><FiChevronRight /></button>
        </>}
      </div>
      {count > 1 && <div className="edge-carousel-indicators">
        {shots.map((_, index) => (
          <button type="button" key={index} aria-label={alt(index)} aria-current={index === active || undefined} onClick={() => goTo(index)} />
        ))}
      </div>}
    </div>
  );
}
