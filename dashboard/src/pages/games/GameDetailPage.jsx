import React, { useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiSearch, FiShoppingBag, FiUser, FiUsers, FiHeadphones, FiGlobe, FiClock, FiCheck, FiCreditCard, FiLock, FiPlay, FiGift, FiTag, FiSmartphone, FiMonitor, FiSun, FiThumbsUp, FiInstagram, FiYoutube, FiHardDrive } from 'react-icons/fi';
import { SiPlaystation } from 'react-icons/si';
import { TbBrandXbox, TbDeviceGamepad2 } from 'react-icons/tb';

const array = value => { if (Array.isArray(value)) return value; try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const faNumber = value => String(value).replace(/[0-9]/g, digit => '\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9'[Number(digit)]);
const object = value => { if (value && typeof value === 'object') return value; try { return JSON.parse(value || '{}') || {}; } catch { return {}; } };
const name = value => typeof value === 'string' ? value : value?.name_fa || value?.name || value?.title || value?.name_en || '';
const imageUrl = value => { const raw = typeof value === 'string' ? value : value?.url || value?.image || value?.src; try { const parsed = new URL(raw, window.location.origin); return raw && ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; } };
const resolve = (ids, options) => array(ids).map(id => typeof id === 'object' ? id : options?.data?.data?.find(item => String(item._id) === String(id))).filter(Boolean).map(name);
const demoDescription = "\u062a\u0648\u0636\u06cc\u062d\u0627\u062a \u0628\u0627\u0632\u06cc \u067e\u0633 \u0627\u0632 \u062a\u06a9\u0645\u06cc\u0644 \u0641\u0631\u0645 \u062f\u0631 \u0627\u06cc\u0646 \u0628\u062e\u0634 \u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f.";

function TournamentIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M3 21V12h6v9m0 0V7h6v14m0 0V15h6v6H3ZM12 1l1 2 2 .3-1.5 1.5.4 2.1L12 6l-1.9.9.4-2.1L9 3.3l2-.3 1-2Z" /></svg>;
}

function ImageSizeBadge({ src }) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    if (!src) return;
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) setSize({ src, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = src;
    return () => { image.onload = null; };
  }, [src]);
  if (!src || size?.src !== src) return null;
  return <span className="edge-banner-size" dir="ltr" aria-label={`ابعاد بنر: ${faNumber(size.width)} در ${faNumber(size.height)} پیکسل`}><FiMonitor />{faNumber(size.width)} × {faNumber(size.height)} پیکسل</span>;
}

function Header() {
  const [category, setCategory] = useState('دسته‌بندی');
  return <header className="edge-site-header">
    <div className="edge-discount">۳۲٪ تخفیف در آخر هفته‌ها</div>
    <div className="edge-header-main"><a className="edge-logo" href="#top" aria-label="صفحه اصلی اج">edge<span /></a><nav className="edge-top-links" aria-label="منوی اصلی">{['خانه', 'مجله', 'درباره ما', 'تماس با ما'].map((text, index) => <button type="button" key={text} className={index === 0 ? 'active' : ''}>{text}</button>)}</nav><div className="edge-search"><FiSearch /><input type="search" placeholder="جست‌وجو…" aria-label="جست‌وجوی بازی‌ها" /><select aria-label="دسته‌بندی جست‌وجو" value={category} onChange={event => setCategory(event.target.value)}>{['دسته‌بندی', 'بازی‌ها', 'گیفت‌کارت', 'نرم‌افزار'].map(item => <option key={item}>{item}</option>)}</select></div><div className="edge-account"><button type="button" className="edge-cart" aria-label="سبد خرید"><FiShoppingBag /><i /></button><span className="edge-divider" /><FiUser /><button type="button" className="edge-user">یونا جکسون <FiChevronDown /></button><span className="edge-divider" /><span className="edge-membership">۱۲ روز باقی‌مانده</span></div></div>
    <div className="edge-header-bottom"><nav className="edge-categories" aria-label="دسته‌بندی محصولات">{[[SiPlaystation, 'پلی‌استیشن', true], [TbBrandXbox, 'ایکس‌باکس', true], [TbDeviceGamepad2, 'نینتندو', true], [FiSmartphone, 'نرم‌افزار', true], [FiTag, 'تخفیف‌های روزانه'], [TournamentIcon, 'مسابقات'], [FiUsers, 'پشتیبانی']].map(([Icon, text, chevron]) => <button type="button" className={text === 'مسابقات' ? 'active edge-sparkles' : ''} key={text}><Icon /><span>{text}</span>{text === 'پلی‌استیشن' && <small>۱۲۰۰</small>}{chevron && <FiChevronDown className="edge-chevron" />}</button>)}</nav><div className="edge-sale"><span className="edge-fire">♨</span><span>پایان حراج تابستانی تا</span><time>۱۲:۲۳:۱۵</time></div></div>
  </header>;
}

function PurchaseCard() {
  const [edition, setEdition] = useState('کلکسیونی');
  const [notice, setNotice] = useState('');
  return <section className="edge-panel edge-purchase" aria-label="گزینه‌های خرید"><div className="edge-editions" role="group" aria-label="نسخه بازی">{['کلکسیونی', 'استاندارد', 'ویژه'].map(item => <button type="button" key={item} aria-pressed={edition === item} onClick={() => setEdition(item)}>{item}</button>)}</div><div className="edge-price-row"><div><del>۳۷۹٫۰۷ دلار</del><strong>۲۷۱٫۱۵ دلار</strong></div><div className="edge-price-tags"><span>۳۱٪ تخفیف</span><small><FiClock />۲۰ ساعت و ۴۰ دقیقه</small></div></div><button type="button" className="edge-buy edge-sparkles" onClick={() => setNotice('این صفحه پیش‌نمایش است؛ پرداخت فعال نیست.')}>خرید بازی <FiArrowRight /></button><button type="button" className="edge-add" onClick={() => setNotice('این صفحه پیش‌نمایش است؛ سبد خرید تغییری نکرده است.')}>افزودن به سبد خرید <FiShoppingBag /></button>{notice && <p className="edge-notice" role="status">{notice}</p>}<div className="edge-benefits"><div><span><FiCheck /></span>قابل فعال‌سازی در بریتانیا</div><div><FiCreditCard />۹٪ بازگشت وجه</div><div><FiLock />موجود در فروشگاه</div></div><div className="edge-service"><span><FiHeadphones /></span><div>خدمات پشتیبانی مشتریان<small>پشتیبانی شبانه‌روزی برای آسودگی خیال شما</small></div></div></section>;
}

function MobileScreenshots({ shots, onSelect }) {
  const track = useRef(null);
  const timer = useRef(null);
  const items = shots.length ? shots : [0, 1, 2, 3, 4];
  const loop = items.length > 1;
  const slides = loop ? [items.at(-1), ...items, items[0]] : items;
  const sourceKey = JSON.stringify(shots);
  useEffect(() => {
    const element = track.current;
    const center = () => {
      if (element.clientWidth) element.children[loop ? 1 : 0]?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    };
    const observer = new ResizeObserver(center);
    observer.observe(element);
    center();
    return () => { observer.disconnect(); clearTimeout(timer.current); };
  }, [sourceKey, loop]);
  function settle() {
    clearTimeout(timer.current);
    if (!loop) return;
    timer.current = setTimeout(() => {
      const element = track.current;
      const bounds = element.getBoundingClientRect();
      const middle = bounds.left + bounds.width / 2;
      const nearest = [...element.children].reduce((best, slide, index) => {
        const rect = slide.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - middle);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 1, distance: Infinity }).index;
      const target = nearest === 0 ? items.length : nearest === slides.length - 1 ? 1 : null;
      if (target !== null) element.children[target].scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    }, 150);
  }
  return <div ref={track} className="edge-mobile-gallery" aria-label="اسلاید تصاویر بازی" onScroll={settle}>{slides.map((shot, index) => {
    const original = loop ? (index - 1 + items.length) % items.length : index;
    return <button type="button" className={`edge-mobile-slide ${shots.length ? '' : 'edge-reference-gallery'}`} key={`${shot}-${index}`} aria-label={`نمایش تصویر ${faNumber(original + 1)}`} onClick={() => onSelect(original)}>{shots.length && <img src={shot} alt={`تصویر ${faNumber(original + 1)} بازی`} loading="lazy" />}<span className="edge-slide-count">{faNumber(original + 1)} / {faNumber(items.length)}</span></button>;
  })}</div>;
}

function Gallery({ game }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const shots = array(game.screenshots).map(imageUrl).filter(Boolean);
  const selected = shots[index] || shots[0];
  return <><details className="edge-panel edge-gallery-panel" open><summary>تصاویر بازی <FiChevronUp /></summary><div className="edge-gallery"><div className="edge-thumbnails">{(shots.length ? shots : [0, 1, 2, 3, 4]).map((shot, i) => <button type="button" aria-label={`نمایش تصویر ${faNumber(i + 1)}`} aria-pressed={i === index} onClick={() => setIndex(i)} key={`${shot}-${i}`} className={!shots.length ? `edge-reference-thumb edge-thumb-${i}` : ''}>{shots.length ? <img src={shot} alt={`تصویر ${faNumber(i + 1)}`} /> : i === 0 ? <span>۱۴:۱۲</span> : null}</button>)}</div><button type="button" className={`edge-gallery-main ${!selected ? 'edge-reference-gallery' : ''}`} aria-label="نمایش تصویر بزرگ" onClick={() => setLightbox(true)}>{selected && <img src={selected} alt={`${game.title || 'بازی'}؛ تصویر بازی`} />}<span className="edge-play-label"><FiPlay /> <span>۱۲:۳۴ - ۱۴:۱۲</span></span></button></div><MobileScreenshots shots={shots} onSelect={next => { setIndex(next); setLightbox(true); }} /></details>{lightbox && <div className="edge-lightbox" role="dialog" aria-modal="true" aria-label="تصویر بازی" onClick={() => setLightbox(false)} onKeyDown={event => { if (event.key === 'Escape') setLightbox(false); }}><button autoFocus type="button" aria-label="بستن تصویر" onClick={() => setLightbox(false)}>×</button>{selected ? <img src={selected} alt="تصویر بازی" /> : <div className="edge-reference-gallery" />}</div>}</>;
}

function Reviews() {
  return <details className="edge-panel edge-reviews" open><summary>دیدگاه‌ها <span className="edge-count">۲۳۴</span><FiChevronUp /></summary><div className="edge-review-grid"><div className="edge-review-score"><div><strong>۴٫۸</strong><span><b>★★★★★</b><small>۲۳۴ دیدگاه</small></span></div>{[[5, 94], [4, 5], [3, 0], [2, 0], [1, 0]].map(([stars, percent]) => <div className="edge-rating-row" key={stars}><span>{faNumber(stars)} <em>({faNumber(percent)}٪)</em></span><i><b style={{ width: `${percent}%` }} /></i></div>)}</div><div className="edge-review-comments">{[['جاناتان آدامز', '120'], ['جیسون تاد', '12']].map(([person, likes]) => <article key={person}><header><FiUser /><span>{person}<small>۱۰ دقیقه پیش</small></span><span className="edge-likes"><FiThumbsUp />{faNumber(likes)}</span></header><div className="edge-review-title">یک بازی فوق‌العاده <b>★★★★★</b></div><p>بلک آپس ۶ یک شاهکار است. داستان پرهیجان و پر از اتفاق‌های غیرمنتظره، از ابتدا تا انتها شما را درگیر می‌کند. بخش چندنفره با نقشه‌های متنوع و متعادل، تجربه‌ای جذاب و به‌یادماندنی می‌سازد.</p></article>)}</div></div></details>;
}

function SidebarExtras() {
  return <><section className="edge-league"><h2>پخش زنده لیگ کال آو دیوتی <span><button type="button" aria-label="مسابقه قبلی"><FiChevronLeft /></button><button type="button" aria-label="مسابقه بعدی"><FiChevronRight /></button></span></h2><div className="edge-match"><div><b className="edge-team-logo">ϟ</b><small>آتلانتا فیز</small></div><div><span className="edge-live">● زنده</span><strong dir="ltr">۳ : ۱</strong></div><div><b className="edge-team-logo edge-team-two">ϟ</b><small>اپتیک تگزاس</small></div></div><div className="edge-tournament"><div><b>کال آو دیوتی<br /><small>لیگ</small></b><span>به‌زودی</span></div><div><span>مجموع جوایز<strong>۲۰٬۰۰۰ دلار</strong></span><span>تاریخ<strong>۱ دی ۱۴۰۳</strong></span><span>تیم‌ها<strong>۱۰</strong></span></div></div></section><section className="edge-bundles"><h2>بسته‌ها <span><button type="button" aria-label="بسته قبلی"><FiChevronLeft /></button><button type="button" aria-label="بسته بعدی"><FiChevronRight /></button></span></h2>{[['CP', '۲۴۰۰ امتیاز کال آو دیوتی', '۱۹٫۹۹ دلار'], ['CP', '۱۶۰۰ امتیاز کال آو دیوتی', '۱۰٫۹۹ دلار'], ['ϟ', 'لیگ کال آو دیوتی (فیز)', '۹٫۹۹ دلار']].map(([icon, text, price]) => <div className="edge-bundle" key={text}><span>{icon}</span><strong>{text}</strong><b>{price}</b><button type="button">خرید بازی</button></div>)}</section></>;
}

export default function GameDetailPage({ game = {}, platforms, genres, modes }) {
  const genreNames = resolve(game.genre_ids, genres);
  const platformNames = resolve(game.platform_ids, platforms);
  const modeNames = resolve(game.game_mode_ids, modes);
  const title = game.title || 'Call of Duty: Black Ops 6';
  const banner = (game.detail_banner !== game.image ? imageUrl(game.detail_banner) : '') || imageUrl(game.detail_gif);
  const date = game.release_date && !Number.isNaN(Date.parse(game.release_date)) ? new Date(game.release_date).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '۳ آبان ۱۴۰۳';
  const sizes = array(game.storage_sizes).map(row => Number(row.bytes)).filter(bytes => Number.isFinite(bytes) && bytes > 0);
  const formatSize = bytes => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(bytes / 1e9);
  const storage = sizes.length ? `${formatSize(Math.min(...sizes))}${Math.max(...sizes) !== Math.min(...sizes) ? ` تا ${formatSize(Math.max(...sizes))}` : ''} گیگابایت` : 'ثبت نشده';
  return <main className="edge-page" dir="rtl" id="top"><Header /><div className="edge-game-body"><ImageSizeBadge src={banner} /><div className="edge-hero-art" style={banner ? { backgroundImage: `url("${banner}")` } : undefined} /><div className="edge-detail-layout"><section className="edge-main"><div className={`edge-heading ${imageUrl(game.detail_poster) ? "edge-heading-with-poster" : ""}`} >{imageUrl(game.detail_poster) && <img className="edge-detail-poster" src={imageUrl(game.detail_poster)} alt={title} />}<div className="edge-heading-text"><nav className="edge-breadcrumb" aria-label="مسیر صفحه"><span>محصولات</span><FiChevronRight /><span>{genreNames[0] || 'اکشن'}</span><FiChevronRight /><span>{title}</span></nav><h1 dir="auto">{title}</h1><div className="edge-meta"><span><FiSun />تاریخ انتشار: <b>{date}</b></span><i /><span><FiHardDrive />حجم بازی: <b>{storage}</b></span><i /><span><FiUsers />{modeNames[0] || 'چندنفره آنلاین'} <b>۱ تا ۴ بازیکن</b></span></div></div></div><Gallery game={game} /><details className="edge-panel edge-description-panel" open><summary>معرفی بازی <FiChevronUp /></summary><p dir="auto">{game.short_description || (game.description ? game.description.slice(0, 240) + (game.description.length > 240 ? "…" : "") : demoDescription)}</p></details><details className="edge-panel edge-description-panel edge-full-description" open><summary>توضیحات کامل بازی <FiChevronUp /></summary><p dir="auto">{game.description || demoDescription}</p></details><details className="edge-panel edge-requirements"><summary>سیستم موردنیاز <FiChevronDown /></summary><p>{platformNames.join(' · ') || 'پلی‌استیشن ۵'} · {game.has_persian_subtitles ? 'دارای زیرنویس فارسی' : 'اتصال به اینترنت لازم است.'}</p></details><Reviews /></section><aside className="edge-sidebar"><PurchaseCard /><SidebarExtras /></aside></div></div><footer className="edge-footer"><div><nav>{['بازی‌های محبوب', 'اکشن', 'ماجراجویی', 'گیفت‌کارت', 'آموزش'].map(text => <button type="button" key={text}>{text}</button>)}</nav><a href="#top" className="edge-logo">edge<span /></a><span>قوانین　حریم خصوصی</span></div><div><span>© تمام حقوق برای اج محفوظ است.</span><span>اینجا برای ساختن یک <b>تغییر بزرگ</b></span><span className="edge-socials"><FiInstagram /><FiYoutube /><FiGlobe /></span></div></footer></main>;
}
