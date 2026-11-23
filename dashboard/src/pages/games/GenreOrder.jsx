import { useState } from 'react';
import { FiMove, FiX } from 'react-icons/fi';

export default function GenreOrder({ value, options, disabled, onChange }) {
  const [targetId, setTargetId] = useState(null);

  function targetAt(event) {
    return document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-selected-genre]')?.dataset.selectedGenre;
  }

  function move(from, to) {
    if (disabled || to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    next.splice(to, 0, ...next.splice(from, 1));
    onChange(next);
  }

  if (!value.length) return null;
  return <div className="mt-2">
    {value.length > 1 && <p className="mb-2 text-xs text-slate-500">ژانرها را بکشید تا اولویتشان تغییر کند. ژانر اول، ژانر اصلی است.</p>}
    <ol className="space-y-1">
      {value.map((id, index) => {
        const label = options.find(option => option.value === id)?.label || id;
        return <li key={id} data-selected-genre={id} className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${targetId === id ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
          <button type="button" disabled={disabled || value.length < 2} aria-label={`تغییر اولویت ${label}`}
            aria-keyshortcuts="ArrowUp ArrowDown" className="cursor-grab p-2 active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
            style={{ touchAction: 'none' }}
            onPointerDown={event => {
              if (event.button === 0) event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) setTargetId(targetAt(event));
            }}
            onPointerUp={event => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              move(index, value.indexOf(targetAt(event)));
              event.currentTarget.releasePointerCapture(event.pointerId);
              setTargetId(null);
            }}
            onLostPointerCapture={() => setTargetId(null)}
            onKeyDown={event => {
              if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              move(index, index + (event.key === 'ArrowUp' ? -1 : 1));
            }}><FiMove aria-hidden="true" /></button>
          <span dir="auto">{label}</span>
          {index === 0 && <span className="text-xs text-slate-500">ژانر اصلی</span>}
          <button type="button" disabled={disabled} aria-label={`حذف ${label}`} className="ms-auto p-2"
            onClick={() => onChange(value.filter(item => item !== id))}><FiX aria-hidden="true" /></button>
        </li>;
      })}
    </ol>
  </div>;
}
