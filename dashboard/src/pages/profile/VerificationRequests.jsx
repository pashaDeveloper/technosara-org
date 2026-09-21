import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useVerificationRequestsQuery, useReviewVerificationMutation } from '@/services/auth/authApi';
import { format, parseISO } from 'date-fns';
import { faIR } from 'date-fns/locale';

const fields = {
  2: [['phone', 'شماره موبایل'], ['nationalCode', 'کد ملی'], ['identityNumber', 'شماره شناسنامه'], ['birthDate', 'تاریخ تولد']],
  3: [['province', 'استان'], ['city', 'شهر'], ['address', 'آدرس'], ['plateNumber', 'پلاک'], ['postalCode', 'کد پستی']],
};

function Request({ account, busy, onReview }) {
  const [reason, setReason] = useState('');
  const level = account.profileApproval.pendingLevel;
  return <article className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{account.name} · سطح {level.toLocaleString('fa-IR')}</h3><p dir="ltr" className="break-all text-sm">{account.email}</p></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">{fields[level].map(([key, label]) => <div key={key}><dt className="text-gray-500">{label}</dt><dd className="mt-1 break-words">{key === 'birthDate' && account[key] ? format(parseISO(account[key]), 'LLL dd, y', { locale: faIR }) : account[key] || '—'}</dd></div>)}</dl>
    <label className="block text-sm">دلیل بازگرداندن برای اصلاح<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={2} className="mt-2 w-full rounded-lg" /></label>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => onReview(account, 'approve', '')} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50">تأیید سطح {level.toLocaleString('fa-IR')}</button>
      <button type="button" disabled={busy || !reason.trim()} onClick={() => onReview(account, 'reject', reason)} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 disabled:opacity-50">بازگشت برای اصلاح</button>
    </div>
  </article>;
}

export default function VerificationRequests() {
  const { data, isLoading, isFetching, error, refetch } = useVerificationRequestsQuery(undefined, { pollingInterval: 30000 });
  const [review, { isLoading: reviewing }] = useReviewVerificationMutation();
  const onReview = async (account, decision, reason) => {
    try {
      const result = await review({ id: account.id, level: account.profileApproval.pendingLevel, version: account.profileVersion, decision, reason }).unwrap();
      toast.success(result.description);
    } catch (failure) { toast.error(failure.data?.message || 'بررسی درخواست انجام نشد.'); refetch(); }
  };
  return <section className="space-y-5 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">بررسی احراز هویت · مدیر کل</h2><button type="button" disabled={isFetching} onClick={refetch} className="text-sm text-violet-600 disabled:opacity-50">تازه‌سازی درخواست‌ها</button></div>
    {isLoading ? <p role="status">در حال دریافت درخواست‌ها…</p> : error ? <p role="alert" className="text-red-600">دریافت درخواست‌ها انجام نشد. دوباره تلاش کنید.</p> : data?.data?.length ? data.data.map(account => <Request key={`${account.id}-${account.profileVersion}`} account={account} busy={reviewing} onReview={onReview} />) : <p className="text-sm">درخواستی در انتظار بررسی نیست.</p>}
  </section>;
}
