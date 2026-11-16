import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
export default function ResourcePager({page,total,onChange}) {
 const pages=Math.max(1,Math.ceil(total/3));const current=Math.min(page,pages-1);
 const button='grid h-7 w-7 place-items-center rounded-[7px] bg-[#111] text-white disabled:cursor-default disabled:opacity-30';
 return <div className="mb-3 flex justify-end gap-2" dir="ltr"><button type="button" aria-label="Previous page" disabled={current===0} onClick={()=>onChange(current-1)} className={button}><FiChevronLeft size={15}/></button><button type="button" aria-label="Next page" disabled={current>=pages-1} onClick={()=>onChange(current+1)} className={button}><FiChevronRight size={15}/></button></div>;
}
