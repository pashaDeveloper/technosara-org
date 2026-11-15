import useCatalogListState from '@/hooks/useCatalogListState';
import CatalogImage from "@/components/shared/CatalogImage";
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ControlPanel from '../ControlPanel';
import Search from '../../components/shared/search';
import AddButton from '../../components/shared/button/AddButton';
import Pagination from '../../components/shared/pagination/Pagination';
import SkeletonItem from '../../components/shared/skeleton/SkeletonItem';
import StatusIndicator from '../../components/shared/tools/StatusIndicator';
import DeleteModal from '../../components/shared/modal/DeleteModal';
import Edit from '../../components/icons/Edit';
import { useGetPeopleQuery, useDeletePersonMutation } from '../../services/people/personApi';

export default function PeopleList() {
  const { page, setPage, search, setSearch, status, setStatus, listQuery } = useCatalogListState();
  const { currentData: result, isFetching, error, refetch } = useGetPeopleQuery({ page, limit: 10, search, status: status === 'all' ? undefined : status });
  const [remove, removing] = useDeletePersonMutation();
  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / 10));
  useEffect(() => { if (result && page > totalPages) setPage(totalPages, { replace: true }); }, [result, page, totalPages]);
  async function removePerson(id) {
    try { await remove(id).unwrap(); toast.success('شخص حذف شد'); }
    catch (error) { toast.error(error.data?.message || 'حذف ناموفق بود'); }
  }
  return <ControlPanel>
    <h1 className="mb-4 text-lg">اشخاص</h1>
    <Search searchTerm={search} setSearchTerm={value => { setSearch(value.slice(0, 100)); }}
      onStatusFilterChange={value => { setStatus(value); }} actions={<AddButton link={`/people/add${listQuery}`} />} />
    {error ? <div role="alert" className="mt-4 text-red-500">دریافت اشخاص ناموفق بود. <button type="button" onClick={refetch}>تلاش دوباره</button></div>
      : isFetching || !result?.data?.length ? <SkeletonItem repeat={5} />
        : <div className="mt-6 flex flex-col gap-3">{result.data.map(person => <article key={person._id} className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800">
          <CatalogImage src={person.photo} creator={person.creator} alt={person.name} className="h-16 w-16 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <Link to={`/people/update/${person._id}${listQuery}`} dir="ltr" className="font-semibold">{person.name}</Link>
            {person.name_fa && <p className="text-sm" dir="rtl">{person.name_fa}</p>}
            <p className="text-sm">{person.positions.join('، ')}</p>
            <p className="text-xs">{[...person.activity_fields, ...person.specialties].join('، ')}</p>
          </div>
          <StatusIndicator isActive={person.status === 'active'} />
          <Link className="edit-button" aria-label={`ویرایش ${person.name}`} to={`/people/update/${person._id}${listQuery}`}><Edit className="h-5 w-5" /></Link>
          <DeleteModal message={`آیا از حذف «${person.name}» اطمینان دارید؟`} isLoading={removing.isLoading} onDelete={() => removePerson(person._id)} />
        </article>)}</div>}
    <Pagination currentPage={page} totalPages={totalPages} onPageChange={value => { if (!isFetching) setPage(value); }} />
  </ControlPanel>;
}
