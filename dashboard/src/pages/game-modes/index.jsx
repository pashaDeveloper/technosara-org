import useCatalogListState from '@/hooks/useCatalogListState';
import CatalogImage from "@/components/shared/CatalogImage";
import React, { useEffect, useRef, useState } from 'react';
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
import { useGetGameModesQuery, useDeleteGameModeMutation, useReorderGameModeMutation } from '../../services/game-modes/gameModeApi';
import { definition } from './definitions';

export default function GameModeList() {
  const resource = "game-modes";
  const { page, setPage, search, setSearch, status, setStatus, listQuery } = useCatalogListState();
  const [draggedId, setDraggedId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const savingOrder = useRef(false);
  const [reorderGameMode, { isLoading: isReordering }] = useReorderGameModeMutation();
  const { currentData: result, isFetching, error, refetch } = useGetGameModesQuery({ page, limit: 5, search, status: status === 'all' ? undefined : status });
  const records = result?.data || [];
  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / 5));
  const [remove, removeState] = useDeleteGameModeMutation();
  const orderDisabled = isFetching || isReordering || removeState.isLoading;
  async function moveGameMode(id, target) {
    if (!target || id === target || orderDisabled || savingOrder.current) return;
    savingOrder.current = true;
    try {
      const response = await reorderGameMode({ id, targetId: target }).unwrap();
      if (response.acknowledgement === false) throw response;
      toast.success(response.description || 'ترتیب ذخیره شد');
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره ترتیب ناموفق بود');
    } finally { savingOrder.current = false; }
  }
  useEffect(() => { if (result && page > totalPages) setPage(totalPages, { replace: true }); }, [result, page, totalPages]);
  async function removeRecord(id) {
    if (savingOrder.current) return;
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
    {isReordering && <p className="mt-4 text-sm text-slate-500" role="status">در حال ذخیره ترتیب…</p>}
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
            توضیحات
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
            const description = category.description || category.manufacturer || definition.fields.find(field => field.key === 'type')?.options?.find(option => option.value === category.type)?.label || category.name || ''; 
            const slug = category[definition.identifier];
            return (
              <div
                key={category._id}
                data-game-modes-id={category._id}
                style={{ opacity: draggedId === category._id ? 0.5 : 1, outline: targetId === category._id ? '2px solid #22c55e' : undefined }}
                className="mt-4 p-1 grid grid-cols-12 rounded-xl cursor-pointer border border-gray-200 gap-2 dark:border-white/10 dark:bg-slate-800 bg-white px-2 transition-all dark:hover:border-slate-700 hover:border-slate-100 hover:bg-green-100 dark:hover:bg-gray-800 dark:text-slate-100"
              >
                <div className="col-span-10 lg:col-span-3 text-center flex items-center">
                  <button
                    type="button"
                    disabled={orderDisabled}
                    aria-label={`تغییر ترتیب ${category.name}`}
                    aria-keyshortcuts="ArrowUp ArrowDown"
                    className="p-3 text-xl cursor-grab active:cursor-grabbing disabled:opacity-40"
                    style={{ touchAction: 'none' }}
                    onPointerDown={event => {
                      if (event.button !== 0 || orderDisabled) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDraggedId(category._id);
                    }}
                    onPointerMove={event => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-game-modes-id]');
                      setTargetId(row?.dataset.gameModesId || null);
                      if (event.clientY < 80) window.scrollBy(0, -15);
                      else if (event.clientY > window.innerHeight - 80) window.scrollBy(0, 15);
                    }}
                    onPointerUp={event => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-game-modes-id]');
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      setDraggedId(null);
                      setTargetId(null);
                      moveGameMode(category._id, row?.dataset.gameModesId);
                    }}
                    onLostPointerCapture={() => { setDraggedId(null); setTargetId(null); }}
                    onKeyDown={event => {
                      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                      event.preventDefault();
                      moveGameMode(category._id, records[index + (event.key === 'ArrowUp' ? -1 : 1)]?._id);
                    }}
                  >⠿</button>
                  <StatusIndicator isActive={category.is_active} />
                  <div className="py-2 flex justify-center items-center gap-x-2 text-right">
                    <CatalogImage
                      src={category.image || category.logo_url || category.logo}
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
                      isLoading={removeState.isLoading || isReordering}
                      onDelete={() => removeRecord(category._id)}
                    />
                  </article>
                </div>
              </div>
            );
          })
        )}


    </>}
    <Pagination currentPage={page} totalPages={totalPages} onPageChange={value => { if (!orderDisabled && !draggedId) setPage(value); }} />
  </ControlPanel>;
}
