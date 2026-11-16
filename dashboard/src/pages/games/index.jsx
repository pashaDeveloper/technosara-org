import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ControlPanel from '../ControlPanel';
import useCatalogListState from '../../hooks/useCatalogListState';
import PlatformInput from '../platforms/components/PlatformInput';
import AddButton from '../../components/shared/button/AddButton';
import Pagination from '../../components/shared/pagination/Pagination';
import SkeletonItem from '../../components/shared/skeleton/SkeletonItem';
import DeleteModal from '../../components/shared/modal/DeleteModal';
import Edit from '../../components/icons/Edit';
import { useGetGamesQuery, useDeleteGameMutation, useGetGamePlatformOptionsQuery } from '../../services/games/gameApi';
import { statuses } from './definitions';

function platformNames(game, options) {
  const selected = (game.platform_ids || []).map(item => typeof item === 'object' ? item : options.find(platform => platform._id === item)).filter(Boolean);
  const rows = selected.length ? selected : (game.platforms || []);
  const consoles = rows.map(item => {
    const name = typeof item === 'string' ? item : item.name || item.name_en || item.title || item.value || item.code;
    const key = (typeof item === 'string' ? item : [item.name, item.name_en, item.code, item.value].filter(Boolean).join(' ')).normalize('NFKC').toLowerCase().replace(/[\s_\-\u200c|]/g, '');
    if (/gamepass|cloud|xcloud|geforcenow|stadia|\u06af\u06cc\u0645\u067e\u0633|\u06a9\u0644\u0648\u062f|\u0627\u0628\u0631\u06cc/.test(key)) return null;
    const rank = /playstation|ps[1-5]|psp|psvita|\u067e\u0644\u06cc\u0627\u0633\u062a\u06cc\u0634\u0646/.test(key) ? 0
      : /xbox|\u0627\u06cc\u06a9\u0633\u0628\u0627\u06a9\u0633/.test(key) ? 1
      : /nintendo|switch|wii|gamecube|\u0646\u06cc\u0646\u062a\u0646\u062f\u0648|\u0633\u0648\u06cc\u06cc\u0686/.test(key) ? 2 : -1;
    return name && rank >= 0 ? {name, rank} : null;
  }).filter(Boolean).sort((a, b) => a.rank - b.rank);
  return [...new Set(consoles.map(item => item.name))].join(' / ');
}
export default function GameList() {
  const { data: platformOptions } = useGetGamePlatformOptionsQuery();
  const { page, setPage, search, setSearch, listQuery } = useCatalogListState();
  const [params, setParams] = useSearchParams();
  const status = statuses.some(item => item.value === params.get('status')) ? params.get('status') : '';
  const { currentData: result, isFetching, error, refetch } = useGetGamesQuery({ page, limit: 10, search, status: status || undefined }, { refetchOnMountOrArgChange: true });
  const [remove, { isLoading }] = useDeleteGameMutation();
  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / 10));
  useEffect(() => { if (result && page > totalPages) setPage(totalPages, { replace: true }); }, [result, page, totalPages]);
  async function removeRecord(id) {
    try {
      const response = await remove({ id }).unwrap();
      if (response.acknowledgement === false) throw response;
      toast.success(response.description || 'بازی حذف شد.');
    } catch (error) { toast.error(error.data?.description || error.data?.message || 'حذف بازی ناموفق بود.'); }
  }
  return <ControlPanel>
    <h1 className="mb-5 text-xl font-semibold">بازی‌ها</h1>
    <div className="flex flex-wrap items-center gap-3">
      <PlatformInput aria-label="جست‌وجوی بازی" placeholder="جست‌وجوی عنوان بازی…" value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="وضعیت انتشار" className="rounded-xl border-slate-200 dark:bg-slate-800" value={status} onChange={event => { const next = new URLSearchParams(params); next.set('page', '1'); event.target.value ? next.set('status', event.target.value) : next.delete('status'); setParams(next); }}>
        <option value="">همه وضعیت‌ها</option>{statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <AddButton link={'/games/add' + listQuery} />
    </div>
    {error ? <div role="alert" className="mt-6 text-red-500">دریافت بازی‌ها ناموفق بود. <button type="button" onClick={refetch}>تلاش دوباره</button></div> : isFetching ? <SkeletonItem repeat={5} /> : !result?.data?.length ? <p className="py-12 text-center text-slate-500">بازی‌ای پیدا نشد.</p> : <div className="mt-6 overflow-x-auto"><div className="min-w-[700px] space-y-2">{result.data.map(game => <article key={game._id} className="flex flex-nowrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      {(game.image || game.cover_media_id?.url) ? <img src={game.image || game.cover_media_id.url} alt={game.title} loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-700" />}
        <h2 dir="auto" title={game.title} className="w-64 min-w-0 shrink-0 truncate text-right text-sm font-normal">{game.title}</h2>
        <span dir="auto" className="min-w-0 flex-1 truncate text-right text-sm font-normal text-slate-500" title={game.developer_ids?.map(company => company.name || company.name_en || company.name_fa).filter(Boolean).join(' / ')}>{game.developer_ids?.map(company => company.name || company.name_en || company.name_fa).filter(Boolean).join(' / ') || game.developer || '\u2014'}</span>
      <time dateTime={game.release_date || undefined} className="shrink-0 whitespace-nowrap text-sm font-normal text-slate-500">{game.release_date && !Number.isNaN(Date.parse(game.release_date)) ? new Date(game.release_date).toLocaleDateString('fa-IR') : '\u2014'}</time>
      <p dir="auto" className="min-w-0 flex-1 truncate text-right text-sm font-normal text-slate-500" title={platformNames(game, platformOptions?.data || [])}>{platformNames(game, platformOptions?.data || []) || '\u2014'}</p>
      <Link className="edit-button" aria-label={'ویرایش ' + game.title} to={'/games/update/' + game._id + listQuery}><Edit className="h-5 w-5" /></Link>
      <DeleteModal message={`آیا از حذف بازی «${game.title}» اطمینان دارید؟`} isLoading={isLoading} onDelete={() => removeRecord(game._id)} />
    </article>)}</div></div>}
    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
  </ControlPanel>;
}
