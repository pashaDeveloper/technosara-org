import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FiArrowRight, FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiSearch, FiShoppingBag, FiUser, FiUsers, FiHeadphones, FiGlobe, FiClock, FiCheck, FiCreditCard, FiLock, FiPlay, FiGift, FiTag, FiSmartphone, FiMonitor, FiSun, FiThumbsUp, FiInstagram, FiYoutube, FiHardDrive } from 'react-icons/fi';
import Trophy from '../../components/icons/Trophy';
import { SiPlaystation } from 'react-icons/si';
import { TbBrandXbox, TbDeviceGamepad2 } from 'react-icons/tb';

const array = value => { if (Array.isArray(value)) return value; try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const faNumber = value => String(value).replace(/[0-9]/g, digit => '\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9'[Number(digit)]);
const object = value => { if (value && typeof value === 'object') return value; try { return JSON.parse(value || '{}') || {}; } catch { return {}; } };
const name = value => typeof value === 'string' ? value : value?.name_fa || value?.name || value?.title || value?.name_en || '';
const imageUrl = value => { const raw = typeof value === 'string' ? value : value?.url || value?.image || value?.src; try { const parsed = new URL(raw, window.location.origin); return raw && ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; } };
const resolve = (ids, options) => array(ids).map(id => typeof id === 'object' ? id : options?.data?.data?.find(item => String(item._id) === String(id))).filter(Boolean).map(name);
function Skeleton({ className = '', lines = 0 }) {
  return <span className={`edge-skeleton ${lines ? 'edge-skeleton-text' : ''} ${className}`} role="img" aria-label={'\u062f\u0627\u062f\u0647 \u0648\u0627\u0631\u062f \u0646\u0634\u062f\u0647'}>{Array.from({ length: lines }, (_, index) => <span key={index} />)}</span>;
}


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
    <div className="edge-header-bottom"><nav className="edge-categories" aria-label="دسته‌بندی محصولات">{[[SiPlaystation, 'پلی‌استیشن', true], [TbBrandXbox, 'ایکس‌باکس', true], [TbDeviceGamepad2, 'نینتندو', true], [FiSmartphone, 'نرم‌افزار', true], [FiTag, 'تخفیف‌های روزانه'], [TournamentIcon, 'مسابقات'], [FiUsers, 'پشتیبانی']].map(([Icon, text, chevron]) => <button type="button" className={text === 'مسابقات' ? 'active edge-sparkles' : ''} key={text}><Icon /><span>{text}</span>{text === 'پلی‌استیشن' && <small>۱۲۰۰</small>}{chevron && <FiChevronDown className="edge-chevron" />}</button>)}</nav></div>
  </header>;
}

function PurchaseCard() {
  const [edition, setEdition] = useState('کلکسیونی');
  const [notice, setNotice] = useState('');
  return <section className="edge-panel edge-purchase" aria-label="گزینه‌های خرید"><div className="edge-editions" role="group" aria-label="نسخه بازی">{['کلکسیونی', 'استاندارد', 'ویژه'].map(item => <button type="button" key={item} aria-pressed={edition === item} onClick={() => setEdition(item)}>{item}</button>)}</div><div className="edge-price-row"><div><del>۳۷۹٫۰۷ دلار</del><strong>۲۷۱٫۱۵ دلار</strong></div><div className="edge-price-tags"><span>۳۱٪ تخفیف</span><small><FiClock />۲۰ ساعت و ۴۰ دقیقه</small></div></div><button type="button" className="edge-buy edge-sparkles" onClick={() => setNotice('این صفحه پیش‌نمایش است؛ پرداخت فعال نیست.')}>خرید بازی <FiArrowRight /></button><button type="button" className="edge-add" onClick={() => setNotice('این صفحه پیش‌نمایش است؛ سبد خرید تغییری نکرده است.')}>افزودن به سبد خرید <FiShoppingBag /></button>{notice && <p className="edge-notice" role="status">{notice}</p>}</section>;
}

function PurchaseTabs({ game, resources = {}, platforms, genres, modes }) {
  const [tab, setTab] = useState('info');
  const panelRef = useRef(null);
  const panelHeight = useRef(0);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(panel.getBoundingClientRect().height);
      if (height > panelHeight.current) { panelHeight.current = height; panel.style.minHeight = height + 'px'; }
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  const [family, setFamily] = useState('playstation');
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [tab, family]);
  const labels = [['info', '\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0628\u0627\u0632\u06cc \u0648 \u062e\u0631\u06cc\u062f'], ['dlc', 'DLC'], ['trophy', '\u062a\u0631\u0648\u0641\u06cc']];
  const dlc = array(resources.dlc);
  const trophies = array(resources.trophies).flatMap(list => array(list.trophies).map(trophy => ({ ...trophy, provider: list.provider })));
  const allRows = tab === 'dlc' ? dlc : trophies;
  const isFamily = (row, key) => key === 'xbox' ? ['xbox','openxbl'].includes(row.provider) : ['playstation','psn','platprices'].includes(row.provider);
  const families = [['playstation','PlayStation'],['xbox','Xbox']].filter(([key]) => allRows.some(row => isFamily(row, key)));
  const activeFamily = families.some(([key]) => key === family) ? family : families[0]?.[0];
  const rows = allRows.filter(row => isFamily(row, activeFamily));
  const pages = Math.max(1, Math.ceil(rows.length / 3));
  const currentPage = Math.min(page, pages - 1);
  const visibleRows = rows.slice(currentPage * 3, currentPage * 3 + 3);
  const storageSizes = array(game.storage_sizes).map(row => Number(row.bytes)).filter(bytes => Number.isFinite(bytes) && bytes > 0);
  const sizeLabel = bytes => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(bytes / 1e9);
  const storageLabel = storageSizes.length ? `${sizeLabel(Math.min(...storageSizes))}${Math.max(...storageSizes) !== Math.min(...storageSizes) ? ` / ${sizeLabel(Math.max(...storageSizes))}` : ''} \u06af\u06cc\u06af\u0627\u0628\u0627\u06cc\u062a` : '';
  return <section className="edge-panel edge-purchase-tabs">
    <div className="edge-purchase-tablist" role="tablist" aria-label={'\u0628\u062e\u0634\u200c\u0647\u0627\u06cc \u0628\u0627\u0632\u06cc'}>{labels.map(([key, label], index) => <button key={key} id={`purchase-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls={`purchase-panel-${key}`} tabIndex={tab === key ? 0 : -1} onMouseDown={event => event.preventDefault()} onClick={() => setTab(key)} onKeyDown={event => {
      const offset = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0;
      if (!offset && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? labels.length - 1 : (index + offset + labels.length) % labels.length;
      setTab(labels[next][0]); event.currentTarget.parentElement.children[next].focus({ preventScroll: true });
    }}>{key === 'info' ? <><span className="edge-info-label-desktop">{label}</span><span className="edge-info-label-mobile">{'\u0627\u0637\u0644\u0627\u0639\u0627\u062a'}</span></> : label}</button>)}</div>
    <div ref={panelRef} role="tabpanel" id={`purchase-panel-${tab}`} aria-labelledby={`purchase-tab-${tab}`} className="edge-purchase-tabpanel">
      {tab === 'info' ? <><dl className="edge-purchase-info">{[
        ['\u067e\u0644\u062a\u0641\u0631\u0645', resolve(game.platform_ids, platforms)],
        ['\u0698\u0627\u0646\u0631', resolve(game.genre_ids, genres)],
        ['\u062d\u0627\u0644\u062a \u0628\u0627\u0632\u06cc', resolve(game.game_mode_ids, modes)],
        ['\u062d\u062c\u0645 \u0628\u0627\u0632\u06cc', storageLabel ? [storageLabel] : []],
      ].map(([label, values]) => <div key={label}><dt>{label}</dt><dd>{values.length ? values.join(' / ') : <Skeleton className="edge-skeleton-inline" />}</dd></div>)}</dl><PurchaseCard /></> : <><div className="edge-resource-toolbar"><div className="edge-resource-tabs" role="tablist" aria-label="Platform">{families.map(([key,label]) => <button type="button" role="tab" key={key} aria-selected={activeFamily === key} onClick={() => setFamily(key)}>{label}</button>)}</div><span className="edge-resource-pagination"><button type="button" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><FiChevronLeft /></button><button type="button" aria-label="Next page" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}><FiChevronRight /></button></span></div><div className="edge-purchase-items" role="tabpanel">{rows.length ? visibleRows.map((item, index) => {
        const content = item.content || item;
        const src = imageUrl(content.image || content.icon_url || content.icon);
        return <article className={tab === 'trophy' ? 'edge-trophy-item' : 'edge-dlc-item'} key={content._id || `${item.app_id || 'item'}-${index}`}>{src ? <img src={src} alt="" loading="lazy" /> : <Skeleton className="edge-purchase-item-image" />}<div className="edge-resource-copy"><strong dir="auto">{content.title_fa || content.name_fa || content.title || content.name}</strong>{tab === 'dlc' && (content.description_fa || content.short_description || content.description) && <p className="edge-dlc-description" dir="auto">{content.description_fa || content.short_description || content.description}</p>}{tab === 'trophy' && <span className={`edge-trophy-grade edge-trophy-${content.achievement_type || 'standard'}`}><Trophy />{({platinum:'\u067e\u0644\u0627\u062a\u06cc\u0646',gold:'\u0637\u0644\u0627',silver:'\u0646\u0642\u0631\u0647',bronze:'\u0628\u0631\u0646\u0632',standard:'Gamerscore'})[content.achievement_type || 'standard']}{content.points != null ? ` / ${faNumber(content.points)}` : ''}</span>}{tab === 'trophy' && (content.description_fa || content.short_description || content.description) && <p dir="auto">{content.description_fa || content.short_description || content.description}</p>}</div></article>;
      }) : [0, 1, 2].map(index => <article key={index}><Skeleton className="edge-purchase-item-image" /><Skeleton lines={3} /></article>)}</div></>}
    </div>
  </section>;
}

function centerSlide(element, index) {
  const slide = element.children[index];
  if (!slide) return;
  const parent = element.getBoundingClientRect(), child = slide.getBoundingClientRect();
  element.scrollBy({ left: child.left + child.width / 2 - parent.left - parent.width / 2, behavior: 'instant' });
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
      if (element.clientWidth) centerSlide(element, loop ? 1 : 0);
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
      if (target !== null) centerSlide(element, target);
    }, 150);
  }
  return <div ref={track} className="edge-mobile-gallery" aria-label="اسلاید تصاویر بازی" onScroll={settle}>{slides.map((shot, index) => {
    const original = loop ? (index - 1 + items.length) % items.length : index;
    return <button type="button" className={`edge-mobile-slide ${shots.length ? '' : 'edge-empty-image'}`} key={`${shot}-${index}`} aria-label={`نمایش تصویر ${faNumber(original + 1)}`} disabled={!shots.length} onClick={() => onSelect(original)}>{shots.length ? <img src={shot} alt={`تصویر ${faNumber(original + 1)} بازی`} loading="lazy" /> : <Skeleton className="edge-skeleton-image" />}{shots.length > 0 && <span className="edge-slide-count">{faNumber(original + 1)} / {faNumber(items.length)}</span>}</button>;
  })}</div>;
}

function Gallery({ game }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const shots = array(game.screenshots).map(imageUrl).filter(Boolean);
  const selected = shots[index] || shots[0];
  return <><details className="edge-panel edge-gallery-panel" open><summary>تصاویر بازی <FiChevronUp /></summary><div className="edge-gallery"><div className="edge-thumbnails">{(shots.length ? shots : [0, 1, 2, 3, 4]).map((shot, i) => <button type="button" aria-label={`نمایش تصویر ${faNumber(i + 1)}`} aria-pressed={i === index} disabled={!shots.length} onClick={() => setIndex(i)} key={`${shot}-${i}`} className={!shots.length ? 'edge-empty-image' : ''}>{shots.length ? <img src={shot} alt={`تصویر ${faNumber(i + 1)}`} /> : <Skeleton className="edge-skeleton-image" />}</button>)}</div><button type="button" className={`edge-gallery-main ${!selected ? 'edge-empty-image' : ''}`} aria-label="نمایش تصویر بزرگ" disabled={!selected} onClick={() => setLightbox(true)}>{selected ? <img src={selected} alt={`${game.title || 'بازی'}؛ تصویر بازی`} /> : <Skeleton className="edge-skeleton-image" />}</button></div><MobileScreenshots shots={shots} onSelect={next => { setIndex(next); setLightbox(true); }} /></details>{lightbox && <div className="edge-lightbox" role="dialog" aria-modal="true" aria-label="تصویر بازی" onClick={() => setLightbox(false)} onKeyDown={event => { if (event.key === 'Escape') setLightbox(false); }}><button autoFocus type="button" aria-label="بستن تصویر" onClick={() => setLightbox(false)}>×</button>{selected ? <img src={selected} alt="تصویر بازی" /> : <div className="edge-reference-gallery" />}</div>}</>;
}

const previewObject = value => { if (value && typeof value === 'object') return value; try { return JSON.parse(value || '{}') || {}; } catch { return {}; } };
function Reviews({ game }) {
  const rating = previewObject(game.rating);
  const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const score = valid(rating.mean) && rating.mean <= 1 ? rating.mean * 10 : null;
  const number = value => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(value);
  return <details className="edge-panel edge-reviews" open><summary>{'\u062f\u06cc\u062f\u06af\u0627\u0647\u200c\u0647\u0627'} <FiChevronUp /></summary><div className="edge-review-grid"><div className="edge-review-score"><div><strong>{score == null ? <Skeleton className="edge-skeleton-inline" /> : number(score)}</strong><span><b>{score == null ? <Skeleton className="edge-skeleton-inline" /> : '\u2605'.repeat(Math.round(score / 2)) + '\u2606'.repeat(5 - Math.round(score / 2))}</b><small>{valid(rating.count) ? number(rating.count) + ' \u0627\u0631\u0632\u06cc\u0627\u0628\u06cc' : <Skeleton className="edge-skeleton-inline" />}</small></span></div>{[['mean','\u06a9\u0644\u06cc'],['mean_players','\u06a9\u0627\u0631\u0628\u0631\u0627\u0646'],['mean_critics','\u0645\u0646\u062a\u0642\u062f\u0627\u0646']].map(([key,label]) => <div className="edge-rating-row" key={key}><span>{label} <em>{valid(rating[key]) && rating[key] <= 1 ? `(${number(rating[key] * 10)} / ${number(10)})` : <Skeleton className="edge-skeleton-inline" />}</em></span><i>{valid(rating[key]) && rating[key] <= 1 && <b style={{ width: `${rating[key] * 100}%` }} />}</i></div>)}</div><div className="edge-review-comments">{[0,1].map(index => <article key={index}><header><Skeleton className="edge-skeleton-inline" /></header><Skeleton lines={3} /></article>)}</div></div></details>;
}

function SidebarExtras() {
  return <><section className="edge-league"><h2>پخش زنده لیگ کال آو دیوتی <span><button type="button" aria-label="مسابقه قبلی"><FiChevronLeft /></button><button type="button" aria-label="مسابقه بعدی"><FiChevronRight /></button></span></h2><div className="edge-match"><div><b className="edge-team-logo">ϟ</b><small>آتلانتا فیز</small></div><div><span className="edge-live">● زنده</span><strong dir="ltr">۳ : ۱</strong></div><div><b className="edge-team-logo edge-team-two">ϟ</b><small>اپتیک تگزاس</small></div></div><div className="edge-tournament"><div><b>کال آو دیوتی<br /><small>لیگ</small></b><span>به‌زودی</span></div><div><span>مجموع جوایز<strong>۲۰٬۰۰۰ دلار</strong></span><span>تاریخ<strong>۱ دی ۱۴۰۳</strong></span><span>تیم‌ها<strong>۱۰</strong></span></div></div></section><section className="edge-bundles"><h2>بسته‌ها <span><button type="button" aria-label="بسته قبلی"><FiChevronLeft /></button><button type="button" aria-label="بسته بعدی"><FiChevronRight /></button></span></h2>{[['CP', '۲۴۰۰ امتیاز کال آو دیوتی', '۱۹٫۹۹ دلار'], ['CP', '۱۶۰۰ امتیاز کال آو دیوتی', '۱۰٫۹۹ دلار'], ['ϟ', 'لیگ کال آو دیوتی (فیز)', '۹٫۹۹ دلار']].map(([icon, text, price]) => <div className="edge-bundle" key={text}><span>{icon}</span><strong>{text}</strong><b>{price}</b><button type="button">خرید بازی</button></div>)}</section></>;
}

export default function GameDetailPage({ game = {}, resources = {}, platforms, genres, modes }) {
  const genreNames = resolve(game.genre_ids, genres);
  const platformNames = resolve(game.platform_ids, platforms);
  const modeNames = resolve(game.game_mode_ids, modes);
  const title = (game.title || '').trim();
  const banner = (game.detail_banner !== game.image ? imageUrl(game.detail_banner) : '') || imageUrl(game.detail_gif);
  const date = game.release_date && !Number.isNaN(Date.parse(game.release_date)) ? new Date(game.release_date).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
  const sizes = array(game.storage_sizes).map(row => Number(row.bytes)).filter(bytes => Number.isFinite(bytes) && bytes > 0);
  const formatSize = bytes => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(bytes / 1e9);
  const storage = sizes.length ? `${formatSize(Math.min(...sizes))}${Math.max(...sizes) !== Math.min(...sizes) ? ` تا ${formatSize(Math.max(...sizes))}` : ''} گیگابایت` : null;
  return <main className="edge-page" dir="rtl" id="top"><Header /><div className="edge-game-body"><ImageSizeBadge src={banner} /><div className={`edge-hero-art ${!banner ? "edge-empty-banner" : ""}`} style={banner ? { backgroundImage: `url("${banner}")` } : undefined} /><div className="edge-detail-layout"><section className="edge-main"><div className="edge-heading edge-heading-with-poster">{imageUrl(game.detail_poster) ? <img className="edge-detail-poster" src={imageUrl(game.detail_poster)} alt={title} /> : <Skeleton className="edge-detail-poster" />}<div className="edge-heading-text"><nav className="edge-breadcrumb" aria-label="مسیر صفحه"><span>بازی</span><FiChevronRight /><span>{genreNames[0] || <Skeleton className="edge-skeleton-inline" />}</span><FiChevronRight /><span>{title || <Skeleton className="edge-skeleton-inline" />}</span></nav><h1 dir="auto" className={!title ? 'edge-heading-empty-title' : undefined}>{title || <Skeleton className="edge-skeleton-title" />}</h1><div className="edge-meta"><span><FiSun />تاریخ انتشار: <b>{date || <Skeleton className="edge-skeleton-inline" />}</b></span><i /><span><FiHardDrive />حجم بازی: <b>{storage || <Skeleton className="edge-skeleton-inline" />}</b></span><i /><span><FiUsers />{modeNames[0] || <Skeleton className="edge-skeleton-inline" />}</span></div></div></div><Gallery game={game} /><details className="edge-panel edge-description-panel" open><summary>معرفی بازی <FiChevronUp /></summary><p dir="auto">{game.short_description || (game.description ? game.description.slice(0, 240) + (game.description.length > 240 ? "…" : "") : <Skeleton lines={3} />)}</p></details><details className="edge-panel edge-description-panel edge-full-description" open><summary>توضیحات کامل بازی <FiChevronUp /></summary><p dir="auto">{game.description || <Skeleton lines={6} />}</p></details><details className="edge-panel edge-requirements"><summary>سیستم موردنیاز <FiChevronDown /></summary><p>{platformNames.length ? platformNames.join(' / ') : <Skeleton lines={2} />}</p></details><Reviews game={game} /></section><aside className="edge-sidebar"><PurchaseTabs game={game} resources={resources} platforms={platforms} genres={genres} modes={modes} /><SidebarExtras /></aside></div></div><footer className="edge-footer"><div><nav>{['بازی‌های محبوب', 'اکشن', 'ماجراجویی', 'گیفت‌کارت', 'آموزش'].map(text => <button type="button" key={text}>{text}</button>)}</nav><a href="#top" className="edge-logo">edge<span /></a><span>قوانین　حریم خصوصی</span></div><div><span>© تمام حقوق برای اج محفوظ است.</span><span>اینجا برای ساختن یک <b>تغییر بزرگ</b></span><span className="edge-socials"><FiInstagram /><FiYoutube /><FiGlobe /></span></div></footer></main>;
}
