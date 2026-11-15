import React from 'react';

export default function GameSectionSkeleton({ kind = 'dlc', label }) {
  return <div role="img" aria-label={label} className="flex min-w-0 gap-4 overflow-hidden pb-3">
    {[0, 1].map(index => <div key={index} aria-hidden="true" className="w-[23rem] max-w-[85vw] shrink-0 space-y-4 rounded-xl border border-slate-200 p-4 motion-safe:animate-pulse dark:border-slate-700">
      <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
      {kind === 'covers' ? <div className="grid grid-cols-2 gap-3">{[0, 1].map(item => <div key={item} className="space-y-3"><div className="aspect-[3/4] rounded-lg bg-slate-200 dark:bg-slate-700" /><div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" /></div>)}</div> : kind === 'capabilities' ? <div className="space-y-3">{[0, 1, 2, 3, 4].map(item => <div key={item} className="flex h-12 items-center justify-between rounded-3xl bg-slate-100 px-3 dark:bg-slate-800"><div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700" /></div>)}</div> : <>
        <div className={`${kind === 'trophies' ? 'mx-auto h-24 w-24' : 'aspect-[16/10] w-full'} rounded-lg bg-slate-200 dark:bg-slate-700`} />
        <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
      </>}
    </div>)}
  </div>;
}
