import { useEffect, useRef, useState } from 'react';
import { useLazyGetGamebrainSimilarQuery } from '../../services/games/gamebrainApi';

export default function GamebrainSimilar({ gamebrainId, value = [], onChange, disabled }) {
  const [fetchSimilar, { isFetching }] = useLazyGetGamebrainSimilarQuery();
  const [names, setNames] = useState({});
  const [message, setMessage] = useState('');
  const request = useRef(null);
  const id = Number(gamebrainId);
  const hasSource = Number.isSafeInteger(id) && id > 0;

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  async function load() {
    setMessage('');
    const pending = fetchSimilar(id);
    request.current = pending;
    try {
      const response = await pending.unwrap();
      if (request.current !== pending) return;
      const results = response.data?.results ?? [];
      if (!Array.isArray(results)) throw new Error('Invalid GameBrain response');
      const games = new Map();
      for (const game of results) {
        const similarId = Number(game?.id);
        if (Number.isSafeInteger(similarId) && similarId > 0 && similarId !== id && !games.has(similarId)) {
          games.set(similarId, game.name || String(similarId));
        }
      }
      if (games.size === 0) {
        setMessage('GameBrain بازی مشابهی برنگرداند.');
        return;
      }
      setNames(Object.fromEntries(games));
      onChange([...games.keys()]);
    } catch (error) {
      if (request.current === pending) setMessage(error.data?.description || 'دریافت بازی‌های مشابه ناموفق بود.');
    } finally {
      if (request.current === pending) request.current = null;
    }
  }

  return (
    <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <h2 className="text-base font-semibold">بازی‌های مشابه</h2>
      <button type="button" onClick={load} disabled={disabled || !hasSource || isFetching}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600">
        {isFetching ? 'در حال دریافت…' : 'دریافت از GameBrain'}
      </button>
      {!hasSource && <p className="text-sm text-slate-500">ابتدا یک بازی از GameBrain انتخاب کنید.</p>}
      {hasSource && value.length === 0 && <p className="text-sm text-slate-500">اگر فهرست هنوز ثبت نشده باشد، هنگام ذخیره از GameBrain دریافت می‌شود.</p>}
      {message && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map(item => (
            <li key={item} className="rounded-md bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">
              <bdi>{names[item] || `#${item}`}</bdi>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
