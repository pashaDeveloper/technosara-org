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
import { useGetGamesQuery, useDeleteGameMutation } from '../../services/games/gameApi';
import { statuses } from './definitions';

export default function GameList() {
  const { page, setPage, search, setSearch, listQuery } = useCatalogListState();
  const [params, setParams] = useSearchParams();
  const status = statuses.some(item => item.value === params.get('status')) ? params.get('status') : '';
  const { currentData: result, isFetching, error, refetch } = useGetGamesQuery({ page, limit: 10, search, status: status || undefined });
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
    {error ? <div role="alert" className="mt-6 text-red-500">دریافت بازی‌ها ناموفق بود. <button type="button" onClick={refetch}>تلاش دوباره</button></div> : isFetching ? <SkeletonItem repeat={5} /> : !result?.data?.length ? <p className="py-12 text-center text-slate-500">بازی‌ای پیدا نشد.</p> : <div className="mt-6 space-y-3">{result.data.map(game => <article key={game._id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {game.cover_media_id?.url && <img src={game.cover_media_id.url} alt={game.title} className="h-20 w-16 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1"><h2 className="font-semibold">{game.title}</h2><p className="mt-1 text-sm text-slate-500">{statuses.find(item => item.value === game.status)?.label}</p><p className="mt-1 line-clamp-2 text-sm">{game.short_description}</p><p className="mt-1 text-xs text-slate-500">{game.developer_ids?.map(company => company.name).join('? ') || '—'} · {game.release_date ? new Date(game.release_date).toLocaleDateString('fa-IR') : 'تاریخ انتشار مشخص نشده'}</p></div>
      <Link className="edit-button" aria-label={'ویرایش ' + game.title} to={'/games/update/' + game._id + listQuery}><Edit className="h-5 w-5" /></Link>
      <DeleteModal message={`آیا از حذف بازی «${game.title}» اطمینان دارید؟`} isLoading={isLoading} onDelete={() => removeRecord(game._id)} />
    </article>)}</div>}
    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
  </ControlPanel>;
}
