import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMaximize2, FiMonitor, FiSmartphone, FiX } from 'react-icons/fi';
import previewCss from './gameDetailPreview.css?inline';
import GameDetailPage from './GameDetailPage';

export default function GameDetailPreview(props) {
  const [body, setBody] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const closeRef = useRef(null);
  const viewportRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [pageHeight, setPageHeight] = useState(2300);
  const canvasWidth = mobile ? 390 : Math.max(1464, width);
  const scale = Math.min(1, width / canvasWidth);
  useEffect(() => {
    const viewport = viewportRef.current;
    let frame;
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(entry.contentRect.width));
    });
    observer.observe(viewport);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [expanded]);
  useEffect(() => {
    if (!body) return;
    const doc = body.ownerDocument;
    let style = doc.getElementById('game-preview-styles');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'game-preview-styles';
      doc.head.appendChild(style);
    }
    style.textContent = previewCss;
  }, [body, previewCss]);
  useEffect(() => {
    if (!body) return;
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPageHeight(Math.ceil(body.getBoundingClientRect().height)));
    });
    observer.observe(body);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [body]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const escape = event => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', escape); previous?.focus(); };
  }, [expanded]);
  return <section dir="rtl" className={expanded ? 'fixed inset-0 z-[100] flex flex-col bg-slate-100 dark:bg-slate-950' : 'min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900'} role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label="پیش‌نمایش صفحه جزئیات بازی">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-700"><div><h2 className="text-sm font-semibold">پیش‌نمایش جزئیات بازی</h2><p className="mt-1 text-xs text-slate-500">تغییرات فرم به‌صورت زنده نمایش داده می‌شوند.</p></div><div className="flex gap-1">{[[false, FiMonitor, 'نمایش دسکتاپ'], [true, FiSmartphone, 'نمایش موبایل']].map(([value, Icon, title]) => <button type="button" key={title} aria-label={title} title={title} aria-pressed={mobile === value} onClick={() => setMobile(value)} className={`rounded-lg p-2 ${mobile === value ? 'bg-amber-100 text-amber-800' : 'text-slate-500'}`}><Icon size={18} /></button>)}<button ref={closeRef} type="button" aria-label={expanded ? 'بستن تمام‌صفحه' : 'نمایش تمام‌صفحه'} title={expanded ? 'بستن تمام‌صفحه' : 'نمایش تمام‌صفحه'} className="rounded-lg p-2 text-slate-500" onClick={() => setExpanded(!expanded)}>{expanded ? <FiX size={18} /> : <FiMaximize2 size={18} />}</button></div></div>
    <div ref={viewportRef} className="min-h-0 overflow-auto bg-[#090a09]" style={{ height: expanded ? '100%' : 'min(850px, 78dvh)', overflowAnchor: 'none' }}>
      <div style={{ width: canvasWidth * scale, height: pageHeight * scale, position: 'relative', margin: '0 auto', direction: 'ltr' }}>
        <iframe title="Game detail preview" className="block border-0" style={{ position: 'absolute', left: 0, top: 0, width: canvasWidth, height: pageHeight, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0 }} srcDoc="<!doctype html><html lang='fa' dir='rtl'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='margin:0;padding:0;background:#090a09'></body></html>" onLoad={event => setBody(event.currentTarget.contentDocument.body)} />
        {body && createPortal(<GameDetailPage {...props} />, body)}
      </div>
    </div>
  </section>;
}
