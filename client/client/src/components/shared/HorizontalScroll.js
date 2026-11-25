"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function HorizontalScroll({ children, className = "", label, scrollbarClassName = "" }) {
  const railId = useId();
  const rail = useRef(null);
  const track = useRef(null);
  const dragging = useRef(null);
  const [thumb, setThumb] = useState({ width: 100, position: 0 });

  useEffect(() => {
    const element = rail.current;
    const update = () => {
      const width = Math.min(100, element.clientWidth / element.scrollWidth * 100);
      const maximum = element.scrollWidth - element.clientWidth;
      const progress = maximum > 0 ? Math.min(1, Math.abs(element.scrollLeft) / maximum) : 0;
      setThumb({ width, position: progress * (100 - width) });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => { element.removeEventListener("scroll", update); observer.disconnect(); };
  }, [children]);

  const move = (event) => {
    if (!dragging.current) return;
    const element = rail.current;
    const bounds = track.current.getBoundingClientRect();
    const thumbWidth = bounds.width * thumb.width / 100;
    const available = bounds.width - thumbWidth;
    if (available <= 0) return;
    const left = Math.max(0, Math.min(available, event.clientX - bounds.left - dragging.current.offset));
    const rtl = getComputedStyle(element).direction === "rtl";
    const progress = rtl ? 1 - left / available : left / available;
    element.scrollLeft = (rtl ? -1 : 1) * progress * (element.scrollWidth - element.clientWidth);
  };

  const start = (event) => {
    const bounds = track.current.getBoundingClientRect();
    const thumbWidth = bounds.width * thumb.width / 100;
    const thumbLeft = bounds.width * (100 - thumb.position - thumb.width) / 100;
    const pointer = event.clientX - bounds.left;
    dragging.current = { offset: pointer >= thumbLeft && pointer <= thumbLeft + thumbWidth
      ? pointer - thumbLeft : thumbWidth / 2 };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    move(event);
  };

  return (
    <div className="min-w-0 max-w-full">
      <div id={railId} ref={rail} tabIndex={0} aria-label={label} className={`arrowless-scroll flex overflow-x-auto overscroll-x-contain ${className}`}>
        {children}
      </div>
      {thumb.width < 100 && <div ref={track} role="scrollbar" aria-controls={railId} aria-label="پیمایش افقی" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(thumb.position / (100 - thumb.width) * 100)} tabIndex={0}
        onPointerDown={start} onPointerMove={move} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            rail.current.scrollBy({ left: event.key === "ArrowLeft" ? -120 : 120, behavior: "smooth" });
          }
        }}
        className={`relative mx-3 h-3 touch-none cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${scrollbarClassName}`}>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gray-200" />
        <div className="pointer-events-none absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gray-400" style={{ width: `${thumb.width}%`, right: `${thumb.position}%` }} />
      </div>}
      <style jsx>{`
        .arrowless-scroll { scrollbar-width: none !important; -ms-overflow-style: none; }
        .arrowless-scroll::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      `}</style>
    </div>
  );
}
