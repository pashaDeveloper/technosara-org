import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiAward, FiMonitor, FiPackage } from "react-icons/fi";
import { FaPlaystation, FaXbox } from "react-icons/fa";
import { asArray, formatNumber, imageUrl } from "./gameDetailMedia";

const consoles = [["playstation", "PlayStation", FaPlaystation], ["xbox", "Xbox", FaXbox]];
const medals = [["platinum", "پلاتین"], ["gold", "طلایی"], ["silver", "نقره‌ای"], ["bronze", "برنزی"]];
const trophyColors = {
  platinum: "text-cyan-600", gold: "text-amber-600",
  silver: "text-slate-500", bronze: "text-orange-600",
};
const trophyDotColors = ["bg-cyan-500", "bg-amber-400", "bg-slate-400", "bg-orange-500"];
const resourcePageSize = 8;
const resourcePhoto = "h-[52px] w-[52px] rounded-lg";
const resourceRow = "flex min-h-[73px] items-center gap-3 px-4 py-2.5";
const resourceList = "edge-game-resource-list overflow-hidden rounded-lg border border-slate-200 bg-white";
const resourceHeader = "flex min-h-[41px] flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 text-xs text-slate-900";

function TrophyCup({ grade, className = "" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 ${trophyColors[grade] ?? "text-slate-500"} ${className}`}>
      <path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3M4 22h16M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zM6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" />
    </svg>
  );
}
const requirementFields = [
  ["processor", "پردازنده"], ["graphics", "کارت گرافیک"], ["memory_text", "حافظه"],
  ["storage_text", "فضای ذخیره‌سازی"], ["os", "سیستم‌عامل"], ["directx", "DirectX"],
  ["network", "شبکه"], ["sound_card", "کارت صدا"], ["notes", "توضیحات"], ["additional_notes", "توضیحات تکمیلی"],
];
const availability = value => value === true ? "دارد" : value === false ? "ندارد" : "";

function SubscriptionStatus({ available }) {
  const subscribed = available === true;

  return (
    <span className="inline-flex align-middle">
      <span className="sr-only">{subscribed ? "دارد" : "ندارد"}</span>
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24"
        className={subscribed ? "text-emerald-700" : "text-red-700"}
        fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d={subscribed ? "m8 12.5 3 3 5-6" : "m9 9 6 6m0-6-6 6"} />
      </svg>
    </span>
  );
}

function Segments({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="mb-4 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-slate-200/50 p-1">
      {options.map(([key, title, Icon]) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-1 text-xs font-semibold text-slate-600 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm">
          {Icon && <Icon aria-hidden="true" />}{title}
        </button>
      ))}
    </div>
  );
}

const rowClass = "rounded-[10px] border border-slate-300 bg-white";
const listClass = `${rowClass} divide-y divide-slate-200 overflow-hidden`;
const listHeading = "bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-950";

function SpecValue({ label, value }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const line = useRef(null);
  const previousHeight = useRef(null);
  const id = useId();
  const tags = Array.isArray(value) && value.length > 1;

  useEffect(() => {
    const element = line.current;
    if (!element || expanded) return;

    const measure = () => setOverflowing(
      element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
    );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, value]);

  useEffect(() => {
    const element = line.current;
    const from = previousHeight.current;
    previousHeight.current = null;
    if (from === null || !element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const to = element.getBoundingClientRect().height;
    const animation = element.animate(
      [{ height: `${from}px`, overflow: "hidden" }, { height: `${to}px`, overflow: "hidden" }],
      { duration: 200, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [expanded]);

  return (
    <dd className="min-w-0 text-left leading-5 text-slate-600">
      <div ref={line} id={id} dir={tags ? "ltr" : "auto"} className={tags
        ? `flex flex-wrap gap-1 overflow-hidden ${expanded ? "" : "max-h-6"}`
        : expanded ? "whitespace-pre-line [overflow-wrap:anywhere]" : "truncate"}>
        {tags ? value.map((item, index) => (
          <span key={`${item}-${index}`} dir="ltr"
            className="inline-flex max-w-full items-baseline gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            <span aria-hidden="true" className="text-sky-700">#</span><bdi className="min-w-0 [overflow-wrap:anywhere]">{item}</bdi>
          </span>
        )) : Array.isArray(value) ? value.join("، ") : value}
      </div>
      {(overflowing || expanded) && (
        <button type="button" aria-expanded={expanded} aria-controls={id}
          aria-label={expanded ? `جمع کردن ${label}` : `نمایش کامل ${label}`}
          onClick={() => {
            previousHeight.current = line.current.getBoundingClientRect().height;
            setExpanded(open => !open);
          }}
          className="absolute bottom-0 left-1/2 z-10 grid h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full border border-slate-300 bg-white text-[11px] leading-none text-slate-600 hover:bg-slate-100 group-last:translate-y-0">
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      )}
    </dd>
  );
}

function Rows({ rows, title, specs = false }) {
  return (
    <section className={listClass}>
      {title && <h3 className={listHeading}>{title}</h3>}
      <dl className="divide-y divide-slate-200">
        {rows.filter(([, value]) => Array.isArray(value) ? value.length > 0 : value).map(([label, value, Icon], index) => (
          <div key={specs ? label : index} className={`grid min-h-9 items-center gap-2.5 px-3 py-1.5 text-xs ${specs ? "group relative grid-cols-[auto_minmax(0,1fr)] last:[&:has(button)]:pb-4" : "grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"}`}>
            <dt className="flex min-w-0 items-center gap-2 font-medium text-slate-900">
              {!specs && Icon && <span className="grid size-5 shrink-0 place-items-center rounded bg-slate-100 text-slate-600"><Icon aria-hidden="true" /></span>}
              <span className={specs ? "truncate text-[13px]" : undefined}>{label}</span>
            </dt>
            {specs ? (
              <SpecValue label={label} value={value} />
            ) : (
              <dd dir="auto" className="min-w-0 whitespace-pre-line break-words text-left leading-5 text-slate-600">
                {Array.isArray(value) ? value.join("، ") : value}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

function Placeholder() {
  return (
    <div aria-hidden="true" className={`${listClass} motion-safe:animate-pulse`}>
      {[0, 1, 2].map(index => (
        <div key={index} className="flex h-9 items-center justify-between gap-3 px-3">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-3 w-24 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function Overview({ game, showTitle = true }) {
  const sizes = asArray(game.storage_sizes).map(row => Number(row?.bytes)).filter(bytes => bytes > 0 && Number.isFinite(bytes));
  const storage = sizes.length ? [...new Set([Math.min(...sizes), Math.max(...sizes)])]
    .map(bytes => formatNumber.format(bytes / 1e9)).join(" تا ") + " گیگابایت" : "";
  const date = game.release_date ? new Date(game.release_date) : null;
  const publishers = asArray(game.publisher_ids).map(item => item?.name_fa || item?.name || item?.name_en).filter(Boolean);
  const rows = [
    ["پلتفرم", game.platformNames],
    ["ژانر", game.genreNames?.filter(name => /(?=\p{Script=Arabic})\p{Letter}/u.test(name))],
    ["شرکت سازنده", game.developerNames],
    ["ناشر", publishers],
    ["حجم بازی", storage],
    ["تاریخ انتشار", date && Number.isFinite(date.valueOf()) ? date.toLocaleDateString("fa-IR", { dateStyle: "long", timeZone: "UTC" }) : ""],
    ["رده سنی", asArray(game.age_ratings).map(item => [item?.system, item?.rating].filter(Boolean).join(" ")).filter(Boolean)],
    ["حالت بازی", game.modeNames],
    ["چندنفرهٔ محلی", availability(game.capability_status?.local_multiplayer)],
    ["چندنفرهٔ آنلاین", availability(game.capability_status?.online_multiplayer)],
    ["گیم پس", <SubscriptionStatus key="game-pass" available={game.has_game_pass} />],
    ["پلاس", <SubscriptionStatus key="ps-plus" available={game.has_ps_plus} />],
  ];
  const offers = asArray(game.offers).filter(item => /^https?:\/\//i.test(item?.store_url) && imageUrl(item.store_url));
  return (
    <>
      <Rows rows={rows} title={showTitle ? "مشخصات بازی" : undefined} specs />
      {offers.length > 0 && (
        <section className={`${listClass} mt-3`}>
          <h3 className={listHeading}>خرید بازی</h3>
          <ul className="divide-y divide-slate-200">
            {offers.map(offer => (
              <li key={offer._id}>
                <a href={imageUrl(offer.store_url)} target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center justify-between gap-2 px-3 py-1.5 text-xs">
                  <bdi className="font-semibold">{offer.store_title || offer.platform_name || offer.provider || "فروشگاه"}</bdi>
                  <bdi className="shrink-0 text-neutral-600">{Number.isFinite(offer.price?.value) ? `${formatNumber.format(offer.price.value)} ${offer.price.currency || ""}` : "مشاهده در فروشگاه"}</bdi>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ResourceIcon({ item, trophy }) {
  const src = imageUrl(item.image || item.icon_url);
  const Icon = trophy ? FiAward : FiPackage;
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden bg-neutral-100 text-xl text-neutral-500 ${resourcePhoto}`}>
      {src ? <Image src={src} alt="" fill unoptimized className="object-cover" /> : <Icon aria-hidden="true" />}
    </span>
  );
}

function ResourceList({ rows, trophy, isXbox, page, setPage }) {
  if (!rows.length) {
    return (
      <>
        <p className="sr-only">{trophy ? "تروفی‌ای برای این پلتفرم ثبت نشده است." : "بستهٔ الحاقی برای این پلتفرم ثبت نشده است."}</p>
        <div dir="rtl" aria-hidden="true" className={`${resourceList} motion-safe:animate-pulse`}>
          <div className={resourceHeader}>
            {trophy && <span className="h-3 w-20 rounded bg-slate-200" />}
            <span className={`ms-auto h-2.5 rounded bg-slate-200 ${trophy ? "w-24" : "w-10"}`} />
          </div>
          <div className="divide-y divide-slate-200">
            {[0, 1, 2].map(index => (
              <div key={index} className={resourceRow}>
                <span className={`h-2.5 w-4 shrink-0 rounded bg-slate-200 ${trophy ? "order-last" : ""}`} />
                <span className={`${resourcePhoto} shrink-0 bg-slate-200`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-3/5 rounded bg-slate-200" />
                  <div className="h-2.5 w-4/5 rounded bg-slate-100" />
                </div>
                {trophy && <span className="h-3 w-8 shrink-0 rounded bg-slate-100" />}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const summary = isXbox
    ? [["Gamerscore", rows.reduce((total, item) => total + (Number.isFinite(item.points) ? item.points : 0), 0)], ["دستاورد", rows.length]]
    : medals.map(([key, label]) => [label, rows.filter(item => item.achievement_type === key).length]);
  const pageCount = Math.ceil(rows.length / resourcePageSize);
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * resourcePageSize;

  return (
    <div className={resourceList}>
      <div dir="rtl" className={resourceHeader}>
        {trophy && <span>دستاوردهای بازی</span>}
        <div dir={isXbox ? "rtl" : "ltr"} className="mr-auto flex flex-wrap items-center justify-end gap-2.5 tabular-nums text-slate-800">
          {trophy ? summary.map(([label, count], index) => (
            <span key={label} title={label} className="inline-flex items-center gap-1">
              {isXbox ? label : <>
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${trophyDotColors[index]}`} />
                <span className="sr-only">{label}</span>
              </>}
              <bdi>{count.toLocaleString("en-US")}</bdi>
            </span>
          )) : <span dir="rtl">{formatNumber.format(rows.length)} مورد</span>}
        </div>
      </div>
      <ol className="divide-y divide-slate-200" start={start + 1}>
        {rows.slice(start, start + resourcePageSize).map((item, index) => {
          const title = item.title_fa || item.name_fa || item.title || item.name;
          const description = item.description_fa || item.short_description || item.description;
          const grade = medals.find(([key]) => key === item.achievement_type)?.[1];
          const text = (
            <>
              <bdi className="block break-words text-right text-[14px] leading-5 text-slate-900">{title}</bdi>
              {description && <p dir="auto" className="mt-0.5 break-words text-right text-[12px] leading-[18px] text-slate-500">{description}</p>}
            </>
          );
          return (
            <li key={item._id} dir="rtl" className={resourceRow}>
              <bdi dir="ltr" className={`min-w-[1rem] shrink-0 text-[11px] tabular-nums text-slate-500 ${trophy ? "order-last text-left" : "text-right"}`}>#{start + index + 1}</bdi>
              <div className="relative shrink-0">
                <ResourceIcon item={item} trophy={trophy} />
                {trophy && !isXbox && <span className="absolute -bottom-1 -left-1 grid h-[17px] w-[17px] place-items-center rounded-full bg-white shadow-sm">
                  {grade && <span className="sr-only">{grade}</span>}
                  <TrophyCup grade={item.achievement_type} />
                </span>}
              </div>
              <div className="min-w-0 flex-1">
                {text}
              </div>
              {trophy && <div dir="ltr" className="min-w-8 shrink-0 text-left text-[12px] leading-tight tabular-nums text-slate-700">
                {Number.isFinite(item.rarity) && <div><span className="block text-[9px] text-slate-500">{isXbox ? "Xbox" : "PSN"}</span>{item.rarity}%</div>}
                {isXbox && Number.isFinite(item.points) && <div>{item.points} G</div>}
              </div>}
            </li>
          );
        })}
      </ol>
      {pageCount > 1 && (
        <nav dir="rtl" aria-label={trophy ? "صفحه‌های تروفی" : "صفحه‌های بسته‌های الحاقی"} className="flex items-center justify-center gap-2 px-2.5 py-2">
          <button type="button" aria-label="صفحهٔ قبلی" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-700 enabled:hover:bg-slate-100 disabled:opacity-40">
            <FiArrowRight aria-hidden="true" />
          </button>
          <span className="sr-only" aria-live="polite">{formatNumber.format(currentPage + 1)} از {formatNumber.format(pageCount)}</span>
          <button type="button" aria-label="صفحهٔ بعدی" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-700 enabled:hover:bg-slate-100 disabled:opacity-40">
            <FiArrowLeft aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}

function Resources({ items, trophy }) {
  const [platform, setPlatform] = useState(() => consoles.find(([key]) => items.some(item => item.consoleFamilies?.includes(key)))?.[0] ?? "playstation");
  const [page, setPage] = useState(0);
  const rows = items.filter(item => item.consoleFamilies?.includes(platform));
  const isXbox = platform === "xbox";
  return (
    <>
      <Segments label="پلتفرم" options={consoles} value={platform} onChange={key => { setPlatform(key); setPage(0); }} />
      <ResourceList rows={rows} trophy={trophy} isXbox={isXbox} page={page} setPage={setPage} />
    </>
  );
}

function System({ requirements, titleId }) {
  const [tier, setTier] = useState(() => requirements?.recommended && !requirements.minimum ? "recommended" : "minimum");
  const data = requirements?.[tier];
  const rows = [
    ...requirementFields.map(([key, label]) => [label, typeof data?.[key] === "string" ? data[key] : ""]),
    ...asArray(data?.other).map(item => [item?.label || "مشخصات", item?.value]),
  ];
  return (
    <>
      <h3 id={titleId} className="mb-3 text-sm font-bold">سیستم موردنیاز PC</h3>
      <Segments label="سطح سیستم" options={[["minimum", "حداقل سیستم"], ["recommended", "سیستم پیشنهادی"]]} value={tier} onChange={setTier} />
      <div className={`${rowClass} mb-2 flex items-center gap-3 px-3 py-3 text-xs font-semibold`}>
        <FiMonitor aria-hidden="true" className="text-xl text-neutral-600" />{tier === "minimum" ? "حداقل سخت‌افزار" : "سخت‌افزار پیشنهادی"}
      </div>
      {rows.some(([, value]) => value) ? <Rows rows={rows} /> : <Placeholder />}
    </>
  );
}

export function DesktopGameInfo({ game }) {
  return (
    <section className="edge-desktop-game-info" aria-label="اطلاعات بازی">
      <div className="edge-game-info-card edge-game-info-overview">
        <Overview game={game} />
      </div>
      <section className="edge-game-info-card" aria-labelledby="desktop-game-dlc-title">
        <h3 id="desktop-game-dlc-title">بسته‌های الحاقی</h3>
        <Resources items={asArray(game.dlc)} />
      </section>
      <section className="edge-game-info-card" aria-labelledby="desktop-game-trophies-title">
        <h3 id="desktop-game-trophies-title">تروفی‌ها</h3>
        <Resources items={asArray(game.trophies)} trophy />
      </section>
      <section className="edge-game-info-card" aria-labelledby="desktop-game-system-title">
        <System requirements={game.pc_requirements} titleId="desktop-game-system-title" />
      </section>
    </section>
  );
}

const mobileTabs = [
  ["info", "مشخصات بازی"],
  ["dlc", "بسته‌های الحاقی"],
  ["trophies", "تروفی‌ها"],
  ["system", "سیستم"],
];

export default function GameInfoSheet({ game }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const [tab] = mobileTabs[active];

  return (
    <div className="edge-mobile-specs-frame flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <section className="edge-game-info-card edge-game-info-overview shrink-0">
        <div role="tablist" aria-label="بخش‌های اطلاعات بازی" className="grid grid-cols-4 divide-x divide-x-reverse divide-slate-200 border-b border-slate-200 bg-slate-50">
          {mobileTabs.map(([key, label], index) => (
            <button key={key} id={`${id}-${key}`} type="button" role="tab"
              aria-selected={active === index} aria-controls={`${id}-panel`} tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={event => {
                const moves = { ArrowLeft: (index + 1) % mobileTabs.length, ArrowRight: (index + mobileTabs.length - 1) % mobileTabs.length, Home: 0, End: mobileTabs.length - 1 };
                const next = moves[event.key];
                if (typeof next !== "number") return;
                event.preventDefault();
                setActive(next);
                event.currentTarget.parentElement.children[next]?.focus();
              }}
              className="min-h-[44px] min-w-0 px-1 text-xs text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 aria-selected:bg-blue-50 aria-selected:text-blue-800">
              {label}
            </button>
          ))}
        </div>
        <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}
          className={tab === "info" ? "edge-mobile-specs-panel" : "p-2.5"}>
          {tab === "info" && <Overview game={game} showTitle={false} />}
          {tab === "dlc" && <Resources key="dlc" items={asArray(game.dlc)} />}
          {tab === "trophies" && <Resources key="trophies" items={asArray(game.trophies)} trophy />}
          {tab === "system" && <System requirements={game.pc_requirements} />}
        </div>
      </section>
    </div>
  );
}
