import { useLocation } from 'react-router-dom';
import TranslatedNameFields from '../../components/shared/translation/TranslatedNameFields';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../../components/ThemeToggle';
import ChevronRight from '../../components/icons/ChevronRight';
import Spinner from '../../components/shared/Spinner';
import ProfileAvatarInput from '../../components/shared/gallery/ProfileAvatarInput';
import GregorianDatePicker, { parseInputDate } from '../../components/shared/date/GregorianDatePicker';
import Dropdown from '../../components/shared/select/Dropdown';
import ListTextField from '../../components/shared/ListTextField';
import NavigationButton from '../../components/shared/button/NavigationButton';
import SendButton from '../../components/shared/button/SendButton';
import StepIndicator from '../companies/steps/StepIndicator';
import PersonInput from './PersonInput';
import { fields, formValues, validUrl } from './definitions';
import { useGetPersonQuery, useGetPersonCountriesQuery, useAddPersonMutation, useUpdatePersonMutation } from '../../services/people/personApi';

const stepTitles = ['نام و عکس', 'مشخصات فردی', 'فعالیت و تخصص', 'سمت‌ها و افتخارات', 'زندگی‌نامه و وب‌سایت'];
function CountryFlag({ option }) {
  return <img src={`https://flagcdn.com/w40/${option.value.toLowerCase()}.png`} alt="" width="24" height="16" className="h-4 w-6 shrink-0 rounded-sm object-cover" />;
}
const stepFields = stepTitles.map((_, index) => fields.filter(field => field.step === index + 1).map(field => field.key));
export default function PersonForm() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetPersonQuery(id, { skip: !id });
  const countries = useGetPersonCountriesQuery();
  const [add, adding] = useAddPersonMutation();
  const [update, updating] = useUpdatePersonMutation();
  const [translationBusy, setTranslationBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const busy = adding.isLoading || updating.isLoading || imageBusy;
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState({});
  const [invalid, setInvalid] = useState({});
  const { control, setValue, register, reset, trigger, getValues, handleSubmit, formState: { errors } } = useForm({ defaultValues: formValues(), mode: 'onChange', shouldFocusError: false });
  useEffect(() => { if (record.data?.data) reset(formValues(record.data.data)); }, [record.data, reset]);
  const countryOptions = useMemo(() => (countries.data?.data || []).map(country => ({ value: country.code, label: country.name_fa || country.name })), [countries.data]);
  async function goToStep(next) {
    if (busy || translationBusy) return;
    if (next > step) {
      for (let index = 1; index < next; index++) {
        const valid = await trigger(stepFields[index - 1]);
        setInvalid(previous => ({ ...previous, [index]: !valid }));
        setCompleted(previous => ({ ...previous, [index]: valid }));
        if (!valid) { setStep(index); return; }
      }
    }
    setStep(next);
  }
  function invalidSubmit(formErrors) {
    const index = stepFields.findIndex(keys => keys.some(key => formErrors[key]));
    if (index >= 0) { setStep(index + 1); setInvalid(previous => ({ ...previous, [index + 1]: true })); }
  }
  async function submit(values) {
    if (busy || translationBusy) return;
    if (step < stepTitles.length) return goToStep(step + 1);
    const body = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value.map(item => item.trim()).filter(Boolean) : value.trim()]));
    try {
      const result = await (id ? update({ id, body }) : add(body)).unwrap();
      toast.success(result.description || 'اطلاعات ذخیره شد');
      navigate('/people' + listQuery);
    } catch (error) { toast.error(error.data?.message || 'ذخیره اطلاعات ناموفق بود'); }
  }
  function renderField(field) {
    const rules = {
      required: field.required ? `${field.label} الزامی است` : false,
      validate: value => {
        if (field.required && !value?.trim()) return `${field.label} الزامی است`;
        if (field.type === 'list') {
          if (value.length > 100 || value.some(item => !item.trim() || item.length > 200)) return 'حداکثر ۱۰۰ مورد با متن کوتاه وارد کنید';
        } else if (value?.length > (field.type === 'textarea' ? 10000 : field.type === 'url' ? 2000 : 200)) return 'متن بیش از حد طولانی است';
        if (field.type === 'date' && value) {
          const date = /^\d{4}-\d{2}-\d{2}$/.test(value) && parseInputDate(value);
          if (!date || date > new Date()) return 'تاریخ معتبر و حداکثر تا امروز وارد کنید';
        }
        if (field.key === 'death_date' && value && getValues('birth_date') && value < getValues('birth_date')) return 'تاریخ درگذشت باید پس از تاریخ تولد باشد';
        if (field.type === 'url' && !validUrl(value)) return 'نشانی معتبر با http یا https وارد کنید';
        return true;
      },
    };
    if (['list', 'date', 'country'].includes(field.type)) return <Controller key={field.key} name={field.key} control={control} rules={rules} render={({ field: input, fieldState }) => {
      const props = { label: field.label, name: input.name, value: input.value, onChange: input.onChange, onBlur: input.onBlur, inputRef: input.ref, disabled: busy, error: fieldState.error?.message, inputComponent: PersonInput };
      if (field.type === 'list') return <ListTextField {...props} placeholder={`افزودن ${field.label}`} />;
      if (field.type === 'date') return <GregorianDatePicker {...props} minYear={1800} maxYear={new Date().getFullYear()} />;
      return <Dropdown {...props} optionIcon={CountryFlag} options={countryOptions} disabled={busy || countries.isFetching} />;
    }} />;
    return <label key={field.key} htmlFor={`person-${field.key}`} className="flex flex-col gap-1">
      <span className="text-sm">{field.label}{field.required ? ' *' : ''}</span>
      <PersonInput as={field.type === 'textarea' ? 'textarea' : 'input'} type={field.type === 'url' ? 'url' : 'text'} id={`person-${field.key}`} dir={field.dir}
        {...register(field.key, rules)} aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `person-${field.key}-error` : undefined} />
      {errors[field.key] && <span id={`person-${field.key}-error`} role="alert" className="text-sm text-red-500">{errors[field.key].message}</span>}
    </label>;
  }
  return <section className="relative flex min-h-screen w-full items-center justify-center p-4" dir="rtl">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><div className="wave" /><div className="wave wave2" /><div className="wave wave3" /></div>
    <div className="z-50 flex w-full max-w-xl flex-col gap-4 rounded-primary bg-white p-8 shadow-lg dark:bg-gray-900">
      {id && record.isFetching ? <Spinner /> : id && (record.error || !record.data?.data) ? <div role="alert">دریافت اطلاعات شخص ناموفق بود. <button type="button" onClick={record.refetch}>تلاش دوباره</button></div> :
        <form noValidate onSubmit={handleSubmit(submit, invalidSubmit)} className="flex flex-col gap-4">
          <StepIndicator currentStep={step} totalSteps={stepTitles.length} onStepClick={goToStep} completedSteps={completed} invalidSteps={invalid} />
          <h2 className="text-sm font-semibold">{stepTitles[step - 1]}</h2>
          <fieldset disabled={busy} className="flex flex-col gap-4">
            <div hidden={step !== 1}>
              <Controller name="photo" control={control} render={({ field }) =>
                <ProfileAvatarInput preserveQuality deviceOnly value={field.value} onChange={field.onChange} onBusyChange={setImageBusy} />
              } />
            </div>
            {stepTitles.map((_, index) => <div key={index} hidden={step !== index + 1}><div className="flex flex-col gap-4">{fields.filter(field => field.step === index + 1 && !['name', 'slug'].includes(field.key)).map(renderField)}{index === 0 && <TranslatedNameFields sourceField="name_fa" targetField="name" onBusyChange={setTranslationBusy} control={control} register={register} setValue={setValue} errors={errors} initialSource={record.data?.data?.name_fa || ''} inputComponent={PersonInput} />}</div></div>)}
            {step === 2 && countries.error && <p role="alert" className="text-sm text-red-500">دریافت کشورها ناموفق بود. <button type="button" onClick={countries.refetch}>تلاش دوباره</button></p>}
            <div className="mt-6 flex justify-between">
              {step === stepTitles.length ? <SendButton isLoading={busy || translationBusy} /> : <NavigationButton direction="next" onClick={() => goToStep(step + 1)} />}
              {step > 1 && <NavigationButton direction="prev" onClick={() => goToStep(step - 1)} />}
            </div>
          </fieldset>
        </form>}
      <ThemeToggle />
    </div>
    <NavLink aria-label="بازگشت به اشخاص" className="reject-button fixed bottom-4 right-4 z-50 rounded-full !p-4" to={'/people' + listQuery}><ChevronRight /></NavLink>
  </section>;
}
