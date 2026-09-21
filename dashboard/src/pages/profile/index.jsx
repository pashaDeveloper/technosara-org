import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import ControlPanel from '../ControlPanel';
import { useUpdateProfileMutation, useSubmitVerificationMutation, usePersistLoginQuery } from '@/services/auth/authApi';
import { addAdmin } from '@/features/auth/authSlice';
import ProfileAvatarInput from '@/components/shared/gallery/ProfileAvatarInput';
import VerificationRequests from './VerificationRequests';
import { BirthDatePicker } from '@/components/Datepicker';

const stages = [
  { title: 'اطلاعات اولیه', description: 'اطلاعات ثبت‌نام شما؛ قابل ویرایش', fields: [['name', 'نام و نام خانوادگی', 'text', 100], ['email', 'ایمیل', 'email', 254]] },
  { title: 'اطلاعات هویتی', description: 'تکمیل اطلاعات و ارسال برای تأیید مدیر کل', fields: [['phone', 'شماره موبایل', 'tel', 11], ['nationalCode', 'کد ملی', 'text', 10], ['identityNumber', 'شماره شناسنامه', 'text', 20], ['birthDate', 'تاریخ تولد']] },
  { title: 'آدرس و محل سکونت', description: 'تکمیل آدرس پس از تأیید اطلاعات هویتی', fields: [['province', 'استان', 'text', 100], ['city', 'شهر', 'text', 100], ['address', 'آدرس', 'text', 500], ['plateNumber', 'پلاک', 'text', 20], ['postalCode', 'کد پستی', 'text', 10]] },
];
const keys = [...stages.flatMap(stage => stage.fields.map(([key]) => key)), 'bio'];
const fromAdmin = admin => Object.fromEntries(keys.map(key => [key, admin[key] || '']));
const emptyPasswords = { currentPassword: '', newPassword: '', confirmPassword: '' };
const inputClass = 'w-full rounded-lg border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';
const persian = value => value.toLocaleString('fa-IR');

export default function Profile() {
  const admin = useSelector(state => state.auth.admin);
  const dispatch = useDispatch();
  const approved = Math.max(1, admin.profileApproval?.approvedLevel || 1);
  const pending = admin.profileApproval?.pendingLevel || 0;
  const rejection = admin.profileApproval?.rejectionReason || '';
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(() => fromAdmin(admin));
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [avatar, setAvatar] = useState(null);
  const [readingImage, setReadingImage] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [update, { isLoading }] = useUpdateProfileMutation();
  const [submitVerification, { isLoading: submitting }] = useSubmitVerificationMutation();
  usePersistLoginQuery(undefined, { pollingInterval: 15000, skip: !pending });
  const previousApproved = useRef(approved);
  const busy = isLoading || submitting || readingImage;
  const shownAvatar = avatar ?? admin.avatar?.url;
  const stage = stages[step - 1];

  useEffect(() => { if (!dirty) setProfile(fromAdmin(admin)); }, [admin, dirty]);
  useEffect(() => {
    if (!dirty) {
      if (approved > previousApproved.current) setStep(Math.min(3, approved + 1));
      setStep(current => Math.min(current, approved + 1));
      previousApproved.current = approved;
    }
  }, [approved, dirty]);
  useEffect(() => {
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    if (dirty) window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const reset = () => { setProfile(fromAdmin(admin)); setPasswords(emptyPasswords); setAvatar(null); setDirty(false); setMessage(''); };
  const change = event => {
    const { name, value } = event.target;
    const normalized = ['phone', 'postalCode', 'nationalCode', 'identityNumber', 'plateNumber'].includes(name)
      ? value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))) : value;
    setProfile(current => ({ ...current, [name]: normalized })); setDirty(true); setMessage('');
  };
  const applyResult = result => {
    dispatch(addAdmin(result.data)); setProfile(fromAdmin(result.data)); setPasswords(emptyPasswords); setAvatar(null); setDirty(false);
  };
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    const sendForApproval = event.nativeEvent.submitter?.value === 'verify';
    setMessage('');
    if (step === 2 && !profile.birthDate) { setMessage('تاریخ تولد را انتخاب کنید.'); return; }
    if (Object.values(passwords).some(Boolean) && passwords.newPassword !== passwords.confirmPassword) { setMessage('تکرار رمز عبور مطابقت ندارد.'); return; }
    try {
      if (dirty) {
        const body = Object.fromEntries(stage.fields.map(([key]) => [key, profile[key]]));
        if (step === 1) {
          if (avatar !== null) body.avatarUrl = avatar;
          if (Object.values(passwords).some(Boolean)) Object.assign(body, passwords);
        }
        if (step === 3) body.bio = profile.bio;
        const result = await update(body).unwrap();
        applyResult(result);
        if (!sendForApproval) toast.success(result.description);
      }
      if (sendForApproval) {
        const result = await submitVerification({ level: step }).unwrap();
        applyResult(result); toast.success(result.description);
      }
    } catch (error) { setMessage(error.data?.message || 'ذخیره انجام نشد. اتصال را بررسی و دوباره تلاش کنید.'); }
  };

  return <ControlPanel>
    <section dir="rtl" className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">پروفایل من</h1><p className="mt-2 text-sm">اطلاعات خود را تکمیل کنید و مراحل احراز هویت را به‌ترتیب انجام دهید.</p></div>
        <div className="rounded-xl bg-green-100 px-5 py-3 text-sm font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">سطح فعلی شما: {persian(approved)} از ۳</div>
      </header>
      <nav aria-label="مراحل احراز هویت" className="grid gap-3 sm:grid-cols-3">
        {stages.map((item, index) => {
          const level = index + 1;
          const locked = level > approved + 1;
          const status = approved >= level ? 'تأییدشده' : pending === level ? 'در انتظار تأیید' : locked ? 'پس از تأیید سطح قبل' : 'آماده تکمیل';
          return <button key={level} type="button" aria-current={step === level ? 'step' : undefined} disabled={locked || busy || (dirty && step !== level)} onClick={() => { setStep(level); setMessage(''); }} className={`flex items-center gap-3 rounded-xl border p-4 text-right transition-colors disabled:cursor-not-allowed ${step === level ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'} ${locked ? 'opacity-50' : ''}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${approved >= level ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{persian(level)}</div>
            <div><div className="text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{status}</div></div>
          </button>;
        })}
      </nav>
      {dirty && <p role="status" className="text-sm">برای رفتن به مرحله دیگر، تغییرات را ذخیره یا لغو کنید.</p>}
      {pending > 0 && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">درخواست سطح {persian(pending)} در انتظار بررسی مدیر کل است. پس از تأیید، مرحله بعد باز می‌شود. ویرایش اطلاعات مربوط به درخواست، آن را برای ارسال مجدد به حالت تکمیل برمی‌گرداند.</div>}
      {rejection && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">نیاز به اصلاح: {rejection}</div>}
      <form onSubmit={submit} className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900 sm:p-8">
        <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
          <div><h2 className="text-lg font-bold">سطح {persian(step)} · {stage.title}</h2><p className="mt-2 text-sm">{stage.description}</p></div>
          {step === 1 && <>
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">با ورود موفق به داشبورد، سطح اول را دارید. اطلاعات ثبت‌نام شما در این بخش قابل ویرایش است.</div>
            <div className="flex flex-col items-center gap-3"><ProfileAvatarInput value={shownAvatar} onBusyChange={setReadingImage} onChange={url => { setAvatar(url); setDirty(true); setMessage(''); }} /></div>
          </>}
          {((step === 1 && approved > 1) || (step > 1 && approved >= step)) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">تغییر نام یا اطلاعات هویتی، تأیید سطح دوم و سوم را بازنشانی می‌کند. تغییر آدرس، نیاز به تأیید دوباره سطح سوم دارد.</p>}
          <div className="grid gap-5 sm:grid-cols-2">{stage.fields.map(([name, label, type, maxLength]) => name === 'birthDate' ? <div key={name} className="space-y-2 text-sm">
            <label htmlFor="birthDate" className="block">تاریخ تولد *</label>
            <BirthDatePicker value={profile.birthDate} disabled={busy} onChange={value => change({ target: { name, value } })} />
          </div> : <label key={name} className={`space-y-2 text-sm ${name === 'address' ? 'sm:col-span-2' : ''}`}>
            <span className="block">{label}{name === 'plateNumber' ? ' (اختیاری)' : ' *'}</span>
            <input className={inputClass} name={name} type={type} value={profile[name]} onChange={change} maxLength={maxLength} required={name !== 'plateNumber'} dir={['email', 'phone', 'postalCode', 'nationalCode', 'identityNumber'].includes(name) ? 'ltr' : 'rtl'} inputMode={['phone', 'postalCode', 'nationalCode', 'identityNumber'].includes(name) ? 'numeric' : undefined} pattern={name === 'phone' ? '09[0-9]{9}' : ['postalCode', 'nationalCode'].includes(name) ? '[0-9]{10}' : undefined} title={name === 'phone' ? '۱۱ رقم با شروع 09' : ['postalCode', 'nationalCode'].includes(name) ? '۱۰ رقم' : undefined} />
          </label>)}</div>
          {step === 3 && <label className="block space-y-2"><span className="text-sm">دربارهٔ من (اختیاری)</span><textarea className={inputClass} rows={3} name="bio" value={profile.bio} onChange={change} maxLength={500} /></label>}
          {step === 1 && <details className="group border-t border-gray-200 pt-5 dark:border-gray-700">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 [&::-webkit-details-marker]:hidden">
              تغییر رمز عبور
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </summary>
            <p className="mb-5 mt-2 text-sm">اگر قصد تغییر رمز را ندارید، این بخش را خالی بگذارید.</p><div className="grid gap-5 sm:grid-cols-3">
            {[['currentPassword', 'رمز فعلی'], ['newPassword', 'رمز جدید'], ['confirmPassword', 'تکرار رمز جدید']].map(([name, label]) => <label key={name} className="space-y-2 text-sm"><span className="block">{label}</span><input className={inputClass} type="password" dir="ltr" autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} value={passwords[name]} minLength={name === 'currentPassword' ? undefined : 8} required={Object.values(passwords).some(Boolean)} onChange={event => { setPasswords(current => ({ ...current, [name]: event.target.value })); setDirty(true); setMessage(''); }} /></label>)}
          </div></details>}
          {message && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{message}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" value="save" disabled={!dirty} className="rounded-lg bg-violet-600 px-5 py-3 text-sm text-white disabled:opacity-50">{isLoading ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button>
            {step > 1 && approved < step && <button type="submit" value="verify" disabled={!!pending && !dirty} className="rounded-lg bg-green-600 px-5 py-3 text-sm text-white disabled:opacity-50">{submitting ? 'در حال ارسال…' : pending === step && !dirty ? 'در انتظار تأیید مدیر کل' : 'ذخیره و ارسال برای تأیید'}</button>}
            {dirty && <button type="button" onClick={reset} className="rounded-lg border px-5 py-3 text-sm">لغو تغییرات</button>}
            {!dirty && step <= approved && step < 3 && <button type="button" onClick={() => setStep(step + 1)} className="rounded-lg border border-violet-300 px-5 py-3 text-sm text-violet-600 dark:text-violet-300">مرحله بعد</button>}
          </div>
        </fieldset>
      </form>
      {admin.role === 'superAdmin' && <VerificationRequests />}
    </section>
  </ControlPanel>;
}
