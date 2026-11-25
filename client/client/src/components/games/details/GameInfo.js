import { useEffect, useId, useRef, useState } from "react";
import { FiArrowLeft, FiAward, FiChevronLeft, FiChevronRight, FiGrid, FiMonitor, FiUsers } from "react-icons/fi";
import { FaMedal, FaPlaystation, FaTrophy, FaXbox } from "react-icons/fa";
import { formatNumber, imageUrl } from "./gameDetailMedia";

const grades = { platinum: "پلاتین", gold: "طلا", silver: "نقره", bronze: "برنز", standard: "Gamerscore" };
const providers = { playstation: "PlayStation", xbox: "Xbox", steam: "Steam" };
const consoles = [["xbox", FaXbox], ["playstation", FaPlaystation]];

function GameOffers({ offers }) {
  const links = (offers || []).filter((offer) => /^https?:\/\//i.test(offer.store_url) && imageUrl(offer.store_url));
  const [selected, setSelected] = useState(0);
  if (!links.length) return null;
  const offer = links[selected] || links[0];
  const label = (item) => item.store_title || item.platform_name || providers[item.provider] || "فروشگاه";
  return (
    <section className="edge-panel edge-purchase" aria-label="گزینه‌های خرید">
      {links.length > 1 && <div className="edge-editions" role="group" aria-label="گزینه خرید">
        {links.map((item, index) => <button key={item._id} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}>{label(item)}</button>)}
      </div>}
      <div className="edge-price-row">
        <span dir="auto">{label(offer)}</span>
        {Number.isFinite(offer.price?.value) && <strong dir="auto">{formatNumber.format(offer.price.value)} {offer.price.currency}</strong>}
      </div>
      <a className="edge-buy edge-sparkles" href={imageUrl(offer.store_url)} target="_blank" rel="noopener noreferrer">خرید بازی <FiArrowLeft /></a>
    </section>
  );
}

function ResourceRowText({ title, description }) {
  const id = useId();
  const frameRef = useRef(null);
  const titleRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (expanded || description) return;
    const frame = frameRef.current;
    const text = titleRef.current;
    const measure = () => setOverflows(text.scrollWidth > frame.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [description, expanded, title]);

  return (
    <div ref={frameRef} className="edge-resource-row-text" data-expanded={expanded}>
      <div id={id} className="edge-resource-copy">
        <span ref={titleRef} className="edge-resource-title" dir="auto">{title}</span>
        {expanded && description && <p dir="auto">{description}</p>}
      </div>
      {(expanded || overflows || description) && (
        <button type="button" aria-expanded={expanded} aria-controls={id}
          aria-label={expanded ? "جمع‌کردن ردیف" : "نمایش متن کامل ردیف"} onClick={() => setExpanded(!expanded)}>
          {expanded ? "−" : "+"}
        </button>
      )}
    </div>
  );
}

function GameResources({ rows, trophies }) {
  const id = useId();
  const pageSize = 6;
  const [page, setPage] = useState(0);
  const [selectedConsole, setSelectedConsole] = useState(null);
  const platform = selectedConsole ?? consoles.find(([key]) => rows?.some((row) => row.consoleFamilies?.includes(key)))?.[0] ?? "xbox";
  const items = rows?.filter((item) => item.consoleFamilies?.includes(platform)) ?? [];
  const count = items.length;
  const pageCount = Math.ceil(count / pageSize);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const select = (key) => {
    setSelectedConsole(key);
    setPage(0);
  };
  return (
    <section className="edge-resource-table">
      <header><h2>{trophies ? "تروفی" : "DLC"}</h2><span>{formatNumber.format(count)} مورد</span></header>
      <div className="edge-resource-platforms" role="tablist" aria-label={trophies ? "پلتفرم تروفی" : "پلتفرم DLC"}>
        {consoles.map(([key, Icon], index) => (
          <button key={key} id={`${id}-${key}`} type="button" role="tab" data-platform={key} aria-selected={platform === key}
            aria-controls={`${id}-items`} tabIndex={platform === key ? 0 : -1} onClick={() => select(key)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
              select(consoles[next][0]);
              event.currentTarget.parentElement.children[next].focus();
            }}><Icon aria-hidden="true" />{providers[key]}</button>
        ))}
      </div>
      <div id={`${id}-items`} role="tabpanel" aria-labelledby={`${id}-${platform}`}>
        {!count && <span className="sr-only">{trophies ? "تروفی ثبت نشده است." : "محتوای اضافه‌ای ثبت نشده است."}</span>}
        <ul aria-hidden={count === 0 || undefined}>
          {count ? items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((item) => {
            const src = imageUrl(item.image || item.icon_url);
            const title = item.title_fa || item.name_fa || item.title || item.name;
            const description = item.description_fa || item.short_description || item.description;
            const grade = platform === "playstation" ? grades[item.achievement_type] : null;
            const points = Number.isFinite(item.points) ? formatNumber.format(item.points) : null;
            const GradeIcon = item.achievement_type === "platinum" ? FaTrophy : item.achievement_type === "standard" ? FiAward : FaMedal;
            return (
              <li className="edge-resource-row" key={item._id}>
                <span className="edge-resource-badge" aria-hidden="true">
                  {src ? <img src={src} alt="" loading="lazy" /> : trophies ? <FiAward /> : "DLC"}
                </span>
                {trophies ? (
                  <div className="edge-resource-copy">
                    <span className="edge-resource-title" dir="auto">{title}</span>
                    {description && <p dir="auto">{description}</p>}
                  </div>
                ) : (
                  <ResourceRowText title={title} description={description} />
                )}
                {trophies && (grade || points) && (
                  <span className={`edge-resource-value edge-trophy-${item.achievement_type}`}>
                    {grade && <GradeIcon aria-hidden="true" />}
                    {[grade, points].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            );
          }) : [0, 1, 2].map((index) => (
            <li className="edge-resource-row" key={index}>
              <span className="edge-resource-badge">{trophies ? <FiAward /> : "DLC"}</span>
              <span className="edge-resource-skeleton-line" />
              {trophies && <span className="edge-resource-skeleton-line edge-resource-skeleton-value" />}
            </li>
          ))}
        </ul>
        {pageCount > 1 && (
          <nav className="edge-resource-pagination" aria-label={trophies ? "صفحه‌های تروفی" : "صفحه‌های DLC"}>
            <button type="button" aria-label="صفحهٔ قبل" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              <FiChevronRight aria-hidden="true" />
            </button>
            <span aria-live="polite">{formatNumber.format(currentPage + 1)} از {formatNumber.format(pageCount)}</span>
            <button type="button" aria-label="صفحهٔ بعد" disabled={currentPage + 1 === pageCount} onClick={() => setPage(currentPage + 1)}>
              <FiChevronLeft aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}

export default function GameInfo({ game }) {
  const facts = [
    ["پلتفرم", game.platformNames, FiMonitor],
    ["ژانر", game.genreNames, FiGrid],
    ["حالت بازی", game.modeNames, FiUsers],
  ];
  const availableFacts = facts.filter(([, values]) => values?.length);
  return (
    <div className="edge-game-info">
      <section className="edge-resource-table edge-game-facts">
        <bg><h2>اطلاعات بازی</h2></bg>
        {availableFacts.length ? (
          <dl>
            {availableFacts.map(([label, values, Icon]) => (
              <div className="edge-resource-row" key={label}>
                <dt><span className="edge-resource-badge"><Icon aria-hidden="true" /></span>{label}</dt>
                <dd className="edge-resource-value"><ResourceRowText title={values.join("، ")} /></dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            <span className="sr-only">اطلاعات بازی ثبت نشده است.</span>
            {facts.map(([label, , Icon]) => (
              <div className="edge-resource-row" key={label} aria-hidden="true">
                <span className="edge-resource-badge"><Icon /></span>
                <span className="edge-resource-skeleton-line" />
              </div>
            ))}
          </>
        )}
        <GameOffers offers={game.offers} />
      </section>
      <GameResources rows={game.dlc} />
      <GameResources rows={game.trophies} trophies />
    </div>
  );
}
