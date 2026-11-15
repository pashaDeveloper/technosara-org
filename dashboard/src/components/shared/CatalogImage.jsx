import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CatalogImage({ src, previewSrc, creator, ...props }) {
  const sources = [...new Set([previewSrc, src, creator?.avatar?.url, "/placeholder.png"].filter(value => typeof value === "string" && value.trim()))];
  return <ImageFallback key={JSON.stringify(sources)} sources={sources} previewSrc={previewSrc} fullSrc={src} {...props} />;
}

function ImageFallback({ sources, previewSrc, fullSrc, ...props }) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const nextSource = () => setIndex(current => Math.min(current + 1, sources.length - 1));
  return <>
    <button
      type="button"
      className="shrink-0 rounded-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-500"
      aria-label={props.alt ? `نمایش بزرگ تصویر ${props.alt}` : "نمایش بزرگ تصویر"}
      aria-haspopup="dialog"
      onClick={event => { event.stopPropagation(); setIsOpen(true); }}
    >
      <img {...props} src={sources[index]} onError={nextSource} />
    </button>
    {isOpen && createPortal(
      <ImagePreview src={sources[index] === previewSrc && fullSrc ? fullSrc : sources[index]} alt={props.alt} onError={nextSource} onClose={() => setIsOpen(false)} />,
      document.body
    )}
  </>;
}

function ImagePreview({ src, alt, onError, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <dialog
    ref={dialogRef}
    aria-label={alt ? `تصویر ${alt}` : "نمایش بزرگ تصویر"}
    className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 text-white backdrop:bg-black/80 open:flex open:items-center open:justify-center"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
  >
    <button
      type="button"
      autoFocus
      aria-label="بستن تصویر"
      className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-3xl hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      onClick={onClose}
    >×</button>
    <img src={src} alt={alt || "تصویر بزرگ"} onError={onError} className="max-h-[85dvh] max-w-full rounded-lg object-contain" />
  </dialog>;
}
