import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { AutoPersianToEnglish } from '../../components/shared/translation/PersianToEnglish';
import ProfileAvatarInput from '../../components/shared/gallery/ProfileAvatarInput';
import Dropdown from '../../components/shared/select/Dropdown';
import PlatformInput from '../platforms/components/PlatformInput';
import StepIndicator from '../companies/steps/StepIndicator';
import NavigationButton from '../../components/shared/button/NavigationButton';
import SendButton from '../../components/shared/button/SendButton';
import { useGetStoreCountriesQuery } from '../../services/store/storeApi';
import { definition, formValues, storeSteps } from './definitions';
import { englishSlug, storeBody } from './storeFormUtils';

function CountryFlag({ option }) {
  return option.value ? <img src={`https://flagcdn.com/w40/${option.value.toLowerCase()}.png`} alt="" width="24" height="16" className="h-4 w-6 shrink-0 rounded-sm object-cover" /> : null;
}

export default function StoreForm({ record, isLoading, onSubmit }) {
  const { search: listQuery } = useLocation();
  const { control, register, watch, setValue, trigger, handleSubmit, formState: { errors } } = useForm({
    defaultValues: formValues(definition, record), mode: 'onChange', shouldFocusError: false,
  });
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState({});
  const [invalid, setInvalid] = useState({});
  const [translating, setTranslating] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [validating, setValidating] = useState(false);
  const moving = useRef(false);
  const heading = useRef(null);
  const countries = useGetStoreCountriesQuery();
  const countryOptions = useMemo(() => [{ value: '', label: 'انتخاب نشده' }, ...(countries.data?.data || []).map(country => ({
    value: country.code, label: country.name_fa || country.name,
    searchText: [country.name_fa, country.name, country.code, country.code_alpha3].join(' '),
  }))], [countries.data]);
  const busy = isLoading || translating || readingImage || validating;
  const update = (field, value) => setValue(field, value, { shouldDirty: true, shouldValidate: true });
  function showStep(next) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function goToStep(next) {
    if (busy || moving.current) return;
    if (next <= step) { showStep(next); return; }
    moving.current = true;
    setValidating(true);
    try {
      for (let index = 1; index < next; index++) {
        const valid = await trigger(storeSteps[index - 1].fields);
        setCompleted(previous => ({ ...previous, [index]: valid }));
        setInvalid(previous => ({ ...previous, [index]: !valid }));
        if (!valid) { showStep(index); return; }
      }
      showStep(next);
    } finally { moving.current = false; setValidating(false); }
  }
  function invalidSubmit(formErrors) {
    const first = storeSteps.findIndex(item => item.fields.some(key => formErrors[key]));
    if (first >= 0) {
      setInvalid(previous => ({ ...previous, [first + 1]: true }));
      showStep(first + 1);
    }
  }
  function renderField(field) {
    if (field.key === 'image') return <div key={field.key} className="flex flex-col items-center gap-2">
      <Controller name="image" control={control} render={({ field: input, fieldState }) =>
        <ProfileAvatarInput preserveQuality deviceOnly value={input.value} onChange={input.onChange} onBusyChange={setReadingImage} error={fieldState.error?.message} />} />
      <span className="text-xs text-slate-500">تصویر فروشگاه</span>
    </div>;
    if (field.type === 'checkbox') return <label key={field.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700" htmlFor={`store-${field.key}`}>
      <span className="text-sm">{field.label}</span>
      <input id={`store-${field.key}`} type="checkbox" {...register(field.key)} className="h-5 w-5 shrink-0 rounded border-slate-300 text-green-600 focus:ring-green-500 dark:text-blue-500" />
    </label>;
    if (field.type === 'country' || field.type === 'select') return <div key={field.key}>
      <Controller name={field.key} control={control} render={({ field: input, fieldState }) => {
        const options = field.type === 'country' ? countryOptions : [{ value: '', label: 'انتخاب نشده' }, ...field.options];
        return <Dropdown label={field.label} inputComponent={PlatformInput} options={options}
          selectedOption={input.value && !options.some(option => option.value === input.value) ? { value: input.value, label: input.value } : undefined}
          optionIcon={field.type === 'country' ? CountryFlag : undefined}
          value={input.value} onChange={input.onChange} onBlur={input.onBlur} inputRef={input.ref}
          disabled={busy || (field.type === 'country' && (countries.isFetching || Boolean(countries.error)))} error={fieldState.error?.message} />;
      }} />
      {field.type === 'country' && countries.error && <p role="alert" className="mt-2 text-sm text-red-500">دریافت کشورها ناموفق بود. <button type="button" className="underline" onClick={countries.refetch}>تلاش دوباره</button></p>}
    </div>;
    return <React.Fragment key={field.key}>
      <label className="flex flex-col gap-1.5" htmlFor={`store-${field.key}`}>
        <span className="text-sm">{field.label}{field.required ? ' *' : ''}</span>
        <PlatformInput as={field.type === 'textarea' ? 'textarea' : 'input'} id={`store-${field.key}`}
          type={field.type} rows={field.type === 'textarea' ? 4 : undefined} dir={field.dir || 'rtl'} aria-invalid={Boolean(errors[field.key])}
          {...register(field.key, {
            validate: value => {
              if (field.required && !value?.trim()) return `${field.label} الزامی است`;
              if (field.type === 'url' && value) {
                try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return 'نشانی معتبر وارد کنید.'; }
                catch { return 'نشانی معتبر وارد کنید.'; }
              }
              return true;
            },
            maxLength: { value: field.key === 'description' ? 10000 : field.key === 'code' ? 100 : 500, message: 'متن بیش از حد طولانی است' },
            ...(field.key === 'code' ? { pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'کد را با حروف کوچک انگلیسی، عدد و خط تیره وارد کنید.' } } : {}),
          })} />
        {errors[field.key] && <span role="alert" className="text-sm text-red-500">{errors[field.key].message}</span>}
      </label>
      {field.key === 'name' && <AutoPersianToEnglish sourceText={watch('name')} initialSource={record?.name || ''} disabled={isLoading || readingImage} onBusyChange={setTranslating}
        onTranslated={english => { update('name_en', english); if (!record) update('code', englishSlug(english)); }} />}
    </React.Fragment>;
  }

  return <form className="flex w-full flex-col gap-5" noValidate onSubmit={event => {
    event.preventDefault();
    if (busy) return;
    if (step < storeSteps.length) { void goToStep(step + 1); return; }
    void handleSubmit(values => onSubmit(storeBody(values)), invalidSubmit)(event);
  }}>
    <header>
      <h1 className="mb-5 text-xl font-semibold">{record ? 'ویرایش فروشگاه' : 'افزودن فروشگاه'}</h1>
      <StepIndicator currentStep={step} totalSteps={storeSteps.length} onStepClick={goToStep} completedSteps={completed} invalidSteps={invalid} />
      <h2 ref={heading} tabIndex={-1} className="text-base font-semibold outline-none">{storeSteps[step - 1].title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{storeSteps[step - 1].description}</p>
    </header>
    <fieldset disabled={isLoading || readingImage || validating}>
      {storeSteps.map((item, index) => <div key={item.title} hidden={step !== index + 1}>
        <div className="flex flex-col gap-4">{item.fields.map(key => renderField(definition.fields.find(field => field.key === key)))}</div>
      </div>)}
    </fieldset>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      {step === storeSteps.length ? <fieldset disabled={busy}><SendButton isLoading={isLoading} /></fieldset> : <NavigationButton direction="next" disabled={busy} onClick={() => goToStep(step + 1)} />}
      {step > 1 ? <NavigationButton direction="prev" disabled={busy} onClick={() => goToStep(step - 1)} /> : <Link to={'/stores' + listQuery} className="text-sm text-slate-500 hover:underline">انصراف</Link>}
    </div>
  </form>;
}
