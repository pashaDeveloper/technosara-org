import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiImage } from 'react-icons/fi';
import { useGetGamebrainSimilarMutation } from '../../services/games/gamebrainApi';

const pageSize = 8;

function coverUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}

export default function GamebrainSimilar({ gamebrainId, value = [], onChange, disabled }) {
  const [fetchSimilar, { isLoading }] = useGetGamebrainSimilarMutation();
  const [games, setGames] = useState({});
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState('');
  const request = useRef(null);
  const loadedIds = useRef('');
  const id = Number(gamebrainId);
  const hasSource = Number.isSafeInteger(id) && id > 0;
  const idsKey = value.join(',');

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  useEffect(() => {
    if (!hasSource || !idsKey || loadedIds.current === idsKey) return;
    const pending = fetchSimilar({ id, ids: idsKey.split(',').map(Number) });
    request.current = pending;
    pending.unwrap().then(response => {
      if (request.current !== pending) return;
      setGames(Object.fromEntries(response.data.results.map(game => [game.id, game])));
      if (response.data.legacy) setMessage('وضعیت ثبت بازی‌ها پس از به‌روزرسانی سرور نمایش داده می‌شود.');
      loadedIds.current = idsKey;
    }).catch(() => {
      if (request.current === pending) setMessage('دریافت تصاویر یا وضعیت ثبت بازی‌ها ناموفق بود.');
    });
    return () => {
      if (request.current === pending) {
        request.current = null;
        pending.abort();
      }
    };
  }, [fetchSimilar, hasSource, id, idsKey]);

  async function load() {
    setMessage('');
    const pending = fetchSimilar({ id });
    request.current = pending;
    try {
      const response = await pending.unwrap();
      if (request.current !== pending) return;
      const results = response.data.results;
      if (results.length === 0) {
        setMessage('GameBrain بازی مشابهی برنگرداند.');
        return;
      }
      setGames(Object.fromEntries(results.map(game => [game.id, game])));
      if (response.data.legacy) setMessage('وضعیت ثبت بازی‌ها پس از به‌روزرسانی سرور نمایش داده می‌شود.');
      const ids = results.map(game => game.id);
      loadedIds.current = ids.join(',');
      setPage(0);
      onChange(ids);
    } catch (error) {
      if (request.current === pending) setMessage(error.data?.description || 'دریافت بازی‌های مشابه ناموفق بود.');
    } finally {
      if (request.current === pending) request.current = null;
    }
  }

  const pageCount = Math.ceil(value.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const start = currentPage * pageSize;
  const arrowClass = 'grid h-8 w-8 place-items-center rounded-full border border-slate-300 disabled:opacity-40 dark:border-slate-600';

  return (
    <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <h2 className="text-base font-semibold">بازی‌های مشابه</h2>
      <button type="button" onClick={load} disabled={disabled || !hasSource || isLoading}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600">
        {isLoading ? 'در حال دریافت…' : 'دریافت از GameBrain'}
      </button>
      {!hasSource && <p className="text-sm text-slate-500">ابتدا یک بازی از GameBrain انتخاب کنید.</p>}
      {hasSource && value.length === 0 && <p className="text-sm text-slate-500">اگر فهرست هنوز ثبت نشده باشد، هنگام ذخیره از GameBrain دریافت می‌شود.</p>}
      {message && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      {value.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <ol start={start + 1} className="divide-y divide-slate-200 dark:divide-slate-700">
            {value.slice(start, start + pageSize).map((item, index) => {
              const game = games[item];
              const cover = coverUrl(game?.image);
              return (
                <li key={item} className="flex min-h-[73px] items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                    {cover ? <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" /> : <FiImage aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <bdi className="block break-words">{game?.title || `#${item}`}</bdi>
                    {game?.title && <bdi className="block text-xs text-slate-500">#{item}</bdi>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${game?.registered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {game?.published ? 'منتشرشده' : game?.registered === true ? 'ثبت‌شده' : game?.registered === false ? 'ثبت‌نشده' : 'نامشخص'}
                  </span>
                  <bdi dir="ltr" className="shrink-0 text-xs text-slate-500">#{start + index + 1}</bdi>
                </li>
              );
            })}
          </ol>
          {pageCount > 1 && (
            <nav aria-label="صفحه‌های بازی‌های مشابه" className="flex justify-center gap-2 border-t border-slate-200 py-2 dark:border-slate-700">
              <button type="button" disabled={currentPage === 0} aria-label="صفحهٔ قبلی" className={arrowClass} onClick={() => setPage(currentPage - 1)}><FiArrowRight aria-hidden="true" /></button>
              <button type="button" disabled={currentPage === pageCount - 1} aria-label="صفحهٔ بعدی" className={arrowClass} onClick={() => setPage(currentPage + 1)}><FiArrowLeft aria-hidden="true" /></button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}
