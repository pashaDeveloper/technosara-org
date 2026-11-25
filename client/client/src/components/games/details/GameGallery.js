import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { asArray, formatNumber, gameImage } from "./gameDetailMedia";
import GameSlideshow from "./GameSlideshow";
import ProgressiveGameImage from "./ProgressiveGameImage";

const sampleNews = [
  "رویداد آخر هفته با چالش‌های تازه در راه است",
  "جزئیات فصل بعد به‌زودی منتشر می‌شود",
  "بستهٔ محتوایی تازه در دست ساخت است",
  "نقشهٔ تازه‌ای برای بخش چندنفره معرفی شد",
  "چالش‌های روزانه با پاداش‌های تازه بازمی‌گردند",
  "حالت تمرینی در به‌روزرسانی بعدی گسترش می‌یابد",
  "مرحلهٔ آزمایشی فصل جدید به‌زودی آغاز می‌شود",
  "فهرست مأموریت‌های هفتگی به‌روز شد",
  "مسابقات دوستانهٔ آخر هفته در راه‌اند",
  "تصاویر تازه‌ای از محیط‌های بازی منتشر شد",
  "جوایز رویداد بعدی به‌زودی معرفی می‌شوند",
  "مسیرهای تازه‌ای به بخش مسابقه اضافه می‌شوند",
];

export default function GameGallery({ game }) {
  const shots = asArray(game.screenshots).map((shot) => gameImage(shot)).filter(({ src }) => src);
  const [selected, setSelected] = useState(0);
  const [opened, setOpened] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const index = Math.min(selected, shots.length - 1);
  const alt = (position) => `تصویر ${formatNumber.format(position + 1)} از ${game.title}`;

  useEffect(() => {
    if (opened && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [opened]);

  if (!shots.length) {
    return (
      <div aria-hidden="true" className="edge-slideshow">
        {[0, 1, 2].map((index) => <div key={index} className="edge-slide edge-loading-block" />)}
      </div>
    );
  }

  const open = (position, event) => {
    trigger.current = event.currentTarget;
    setSelected(position);
    setOpened(true);
  };
  const move = (offset) => setSelected((index + offset + shots.length) % shots.length);

  return (
    <>
      <section className="edge-panel edge-gallery-panel" aria-label="تصاویر بازی">
        <GameSlideshow shots={shots} alt={alt} onOpen={open} paused={opened} />
        <div className="edge-news-ticker" aria-label="خبرهای نمونه">
          <div className="edge-news-track">
            {[false, true].map((duplicate) => (
              <div className="edge-news-items" dir="rtl" key={String(duplicate)} aria-hidden={duplicate || undefined}>
                <strong>خبرهای نمونه</strong>
                {sampleNews.map((headline) => <span key={headline}>{headline}</span>)}
              </div>
            ))}
          </div>
        </div>
      </section>
      <dialog ref={dialog} className="game-gallery-dialog" aria-label="تصاویر بازی"
        onClose={() => { setOpened(false); trigger.current?.focus(); }}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current.close(); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(1);
          if (event.key === "ArrowRight") move(-1);
        }}>
        {opened && <div>
          <ProgressiveGameImage className="edge-dialog-image" {...shots[index]} alt={alt(index)} />
          <button type="button" className="game-gallery-close" aria-label="بستن تصویر" onClick={() => dialog.current.close()}><FiX /></button>
          {shots.length > 1 && <>
            <button type="button" className="game-gallery-next" aria-label="تصویر بعدی" onClick={() => move(1)}><FiChevronLeft /></button>
            <button type="button" className="game-gallery-prev" aria-label="تصویر قبلی" onClick={() => move(-1)}><FiChevronRight /></button>
          </>}
        </div>}
      </dialog>
    </>
  );
}
