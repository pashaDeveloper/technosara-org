import React, { useRef } from 'react';

export default function ZoomableImage({ src, alt, aspectClass = 'aspect-square' }) {
  const dialog = useRef(null);
  return <>
    <button type="button" aria-label={`بزرگ‌نمایی ${alt}`} aria-haspopup="dialog" className={`group relative block ${aspectClass} w-full cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500`} onClick={() => dialog.current?.showModal()}>
      <img src={src} alt={alt} className="h-full w-full object-contain" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
        <span className="rounded-full bg-white/90 p-3 text-slate-800 shadow-lg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M7.5 10.5h6m-3-3v6" /></svg></span>
      </span>
    </button>
    <dialog ref={dialog} aria-label={alt} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none items-center justify-center overflow-hidden border-0 bg-transparent p-4 outline-none backdrop:bg-transparent open:flex" onKeyDown={event => event.stopPropagation()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button type="button" aria-label="بستن تصویر بزرگ" className="block max-h-full max-w-full cursor-zoom-out border-0 bg-transparent p-0 outline-none" onClick={() => dialog.current?.close()}>
        <img src={src} alt={alt} className="block max-h-[calc(100dvh-2rem)] max-w-full object-contain" />
      </button>
    </dialog>
  </>;
}
