import useCatalogListState from '@/hooks/useCatalogListState';
import CatalogImage from "@/components/shared/CatalogImage";
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ControlPanel from '../ControlPanel';
import Search from '../../components/shared/search';
import StatusIndicator from '../../components/shared/tools/StatusIndicator';
import AddButton from '../../components/shared/button/AddButton';
import Pagination from '../../components/shared/pagination/Pagination';
import SkeletonItem from '../../components/shared/skeleton/SkeletonItem';
import DeleteModal from '../../components/shared/modal/DeleteModal';
import Edit from '../../components/icons/Edit';
import { useGetPlatformsQuery, useDeletePlatformMutation, useReorderPlatformsMutation } from '../../services/platforms/platformApi';
import { definition } from './definitions';

export default function PlatformList() {
  const resource = "platforms";
  const { page, setPage, search, setSearch, status, setStatus, listQuery } = useCatalogListState();
  const { currentData: result, isFetching, error, refetch } = useGetPlatformsQuery({ page, limit: 5, search, status: status === 'all' ? undefined : status });
  const records = result?.data || [];
  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / 5));
  const [remove, removeState] = useDeletePlatformMutation();
  const [reorder, reorderState] = useReorderPlatformsMutation();
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const busy = isFetching || reorderState.isLoading || removeState.isLoading;
  async function moveRecord(id, targetId) {
    setDraggedId(null);
    setDropTarget(null);
    if (busy || !id || id === targetId) return;
    const from = records.findIndex(item => item._id === id);
    const to = records.findIndex(item => item._id === targetId);
    if (from < 0 || to < 0) return;
    try {
      await reorder({ id, targetId, position: from < to ? 'after' : 'before' }).unwrap();
      toast.success('ترتیب نمایش ذخیره شد');
    } catch (error) {
      toast.error(error?.data?.message || 'ذخیره ترتیب ناموفق بود');
    }
  }
  useEffect(() => { if (result && page > totalPages) setPage(totalPages, { replace: true }); }, [result, page, totalPages]);
  async function removeRecord(id) {
    const toastId = 'remove-' + resource;
    toast.loading('در حال حذف…', { id: toastId });
    try {
      const response = await remove({ id }).unwrap();
      if (response.isSuccess === false || response.acknowledgement === false) throw response;
      toast.success(response.description || response.message || 'اطلاعات حذف شد.', { id: toastId });
    } catch (error) { toast.error(error?.data?.message || 'حذف ناموفق بود.', { id: toastId }); }
  }
  return <ControlPanel>
    <Search
      searchTerm={search}
      setSearchTerm={value => { setSearch(value.slice(0, 100)); }}
      onStatusFilterChange={value => { setStatus(value); }}
      actions={<AddButton link={`/${resource}/add${listQuery}`} />}
    />
    <p className="sr-only" role="status">{reorderState.isLoading ? 'در حال ذخیره ترتیب…' : ''}</p>
    {error ? <div role="alert" className="mt-4 text-red-500">{error?.data?.message || 'دریافت اطلاعات ناموفق بود.'}<button type="button" onClick={refetch}>تلاش دوباره</button></div> : <>
        <div className="mt-8 w-full grid grid-cols-12 text-slate-400 px-4 ">
          <div className="col-span-11 lg:col-span-3  text-sm">
            <span className="hidden lg:flex">نویسنده</span>
            <span className="flex lg:hidden">نویسنده و عنوان</span>
          </div>
          <div className="col-span-8 lg:col-span-2 hidden lg:flex  text-sm">
            عنوان
          </div>
          <div className="lg:col-span-4 lg:flex hidden text-sm md:block">
            والد / برند
          </div>
          <div className="lg:col-span-2 lg:flex hidden text-sm md:block">
            اسلاگ
          </div>

          <div className="col-span-1 md:block text-sm">عملیات</div>
        </div>

        {/* نمایش داده‌های دسته‌بندی‌ها */}
        {isFetching || !records.length ? (
          <SkeletonItem repeat={5} />
        ) : (
          records.map((category, index) => {
            const title = category.name;
            const description = [category.parent_id?.name, category.brand_id?.name].filter(Boolean).join(' / ') || 'پلتفرم اصلی';
            const slug = category.slug || category.code;
            return (
              <div
                key={category._id}
                onDragOver={event => { if (!busy && draggedId && draggedId !== category._id) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(category._id); } }}
                onDrop={event => { event.preventDefault(); moveRecord(draggedId, category._id); }}
                className={`mt-4 p-1 grid grid-cols-12 rounded-xl border border-gray-200 gap-2 dark:border-white/10 dark:bg-slate-800 bg-white px-2 transition-all dark:hover:border-slate-700 hover:border-slate-100 hover:bg-green-100 dark:hover:bg-gray-800 dark:text-slate-100 ${dropTarget === category._id ? 'ring-2 ring-green-500' : ''} ${draggedId === category._id ? 'opacity-50' : ''}`}
              >
                <div className="col-span-10 lg:col-span-3 text-center flex items-center">
                    <button type="button" draggable={!busy} disabled={busy}
                      aria-label={`جابه‌جایی ${title}`} title="برای جابه‌جایی بکشید یا از کلیدهای بالا و پایین استفاده کنید"
                      className="p-3 text-xl cursor-grab active:cursor-grabbing disabled:opacity-40"
                      onDragStart={event => { event.dataTransfer.setData('text/plain', category._id); event.dataTransfer.effectAllowed = 'move'; setDraggedId(category._id); }}
                      onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                      onKeyDown={event => {
                        const offset = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
                        if (offset) { event.preventDefault(); if (records[index + offset]) moveRecord(category._id, records[index + offset]._id); }
                      }}>⠿</button>
                  <StatusIndicator isActive={category.is_active} />
                  <div className="py-2 flex justify-center items-center gap-x-2 text-right">
                    <CatalogImage
                      draggable={false}
                      src={category.thumbnail || category.logo}
                      previewSrc={category.preview}
                      creator={category.creator}
                      alt={title}
                      height={100}
                      width={100}
                      className="h-[60px] w-[60px] rounded-full object-cover"
                    />
                    <article className="flex-col flex gap-y-2  ">
                      <span className="line-clamp-1 text-base ">
                        <span className="hidden lg:flex ">
                          {category?.creator?.name || "-"}
                        </span>
                        <span className=" lg:hidden ">{title}</span>
                      </span>
                      <span className="text-xs hidden lg:flex">
                        {new Date(category.createdAt).toLocaleDateString(
                          "fa-IR"
                        )}
                      </span>
                      <span className=" lg:hidden text-xs  line-clamp-1">
                        {description
                          ? description
                          : new Date(category.createdAt).toLocaleDateString(
                              "fa-IR"
                            )}
                      </span>
                    </article>
                  </div>
                </div>
                <div className="lg:col-span-2 hidden gap-2 lg:flex justify-left items-center text-right">
                  <article className="flex-col flex gap-y-2">
                    <span className="text-sm lg:text-base overflow-hidden text-ellipsis line-clamp-1">
                      <span className="flex">{title}</span>
                    </span>
                  </article>
                </div>

                <div className="lg:col-span-4 hidden gap-2 lg:flex justify-left items-center text-right">
                  <article className="flex-col flex gap-y-2">
                    <span className="text-sm lg:text-base overflow-hidden text-ellipsis block line-clamp-1 max-h-[1.2em]">
                      {description}
                    </span>
                  </article>
                </div>

                <div className="hidden lg:col-span-2 col-span-5 gap-2 text-right lg:flex justify-left items-center">
                  <article className="flex-col flex gap-y-2">
                    <span className="flex text-right">{slug}</span>
                  </article>
                </div>

                <div className="col-span-2 md:col-span-1 gap-2 text-center flex justify-center items-center">
                  <article className="lg:flex-row flex flex-col justify-center gap-x-2  gap-y-2">
                    <Link className="edit-button" aria-label={`ویرایش ${category.name}`} to={`/${resource}/update/${category._id}${listQuery}`}><Edit className="w-5 h-5" /></Link>
                    <DeleteModal
                      message={`آیا از حذف ${definition.singular} «${category.name}» اطمینان دارید؟`}
                      isLoading={removeState.isLoading || reorderState.isLoading}
                      onDelete={() => removeRecord(category._id)}
                    />
                  </article>
                </div>
              </div>
            );
          })
        )}


    </>}
    <Pagination currentPage={page} totalPages={totalPages} onPageChange={value => { if (!busy) setPage(value); }} />
  </ControlPanel>;
}
