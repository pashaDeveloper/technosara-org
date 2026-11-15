import { useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import StepIndicator from '../../companies/steps/StepIndicator';
import NavigationButton from '../../../components/shared/button/NavigationButton';
import SendButton from '../../../components/shared/button/SendButton';
import ProfileStep from './ProfileStep';
import DetailsStep from './DetailsStep';
import { formValues, brandBody } from '../definitions';
import ContactStep from './ContactStep';
import PeopleStep from './PeopleStep';
import { useGetBrandCountriesQuery } from '../../../services/brand/brandApi';

const steps = [['logo', 'name', 'slug'], ['founded_date', 'activity_fields', 'description'], ['country_code', 'website'], ['founders']];
export default function BrandForm({ record, save, isLoading }) {
  const { search: listQuery } = useLocation();
  const navigate = useNavigate();
  const countries = useGetBrandCountriesQuery();
  const [currentStep, setCurrentStep] = useState(1), [completed, setCompleted] = useState({}), [invalid, setInvalid] = useState({});
  const [imageBusy, setImageBusy] = useState(false);
  const busy = isLoading || imageBusy;
  const { control, register, setValue, reset, trigger, handleSubmit, formState: { errors } } = useForm({ defaultValues: formValues(record), mode: 'onChange', shouldFocusError: false });
  useEffect(() => { reset(formValues(record)); }, [record, reset]);
  async function goToStep(next) {
    if (busy) return;
    if (next <= currentStep) { setCurrentStep(next); return; }
    for (let index = 1; index < next; index++) {
      const valid = await trigger(steps[index - 1]);
      setInvalid(previous => ({ ...previous, [index]: !valid }));
      setCompleted(previous => ({ ...previous, [index]: valid }));
      if (!valid) { setCurrentStep(index); return; }
    }
    setCurrentStep(next);
  }
  function invalidSubmit(formErrors) {
    const index = steps.findIndex(keys => keys.some(key => formErrors[key]));
    if (index >= 0) { setCurrentStep(index + 1); setInvalid(previous => ({ ...previous, [index + 1]: true })); }
  }
  async function submit(values) {
    if (busy) return;
    if (currentStep < steps.length) return goToStep(currentStep + 1);
    try {
      const response = await save(brandBody(values));
      if (response.acknowledgement === false || response.isSuccess === false) throw response;
      toast.success(response.description || 'اطلاعات ذخیره شد.'); navigate('/brands' + listQuery);
    } catch (error) { toast.error(error.data?.description || error.data?.message || error.description || 'ارسال اطلاعات ناموفق بود؛ اتصال به سرور را بررسی کنید'); }
  }
  return <form className="w-full max-w-xl flex flex-col gap-y-4" noValidate onSubmit={handleSubmit(submit, invalidSubmit)}>
    <StepIndicator currentStep={currentStep} totalSteps={steps.length} onStepClick={goToStep} completedSteps={completed} invalidSteps={invalid} />
    <fieldset disabled={isLoading} className="flex flex-col gap-y-4">
      <div hidden={currentStep !== 1}><ProfileStep control={control} register={register} setValue={setValue} errors={errors} onBusyChange={setImageBusy} /></div>
      <div hidden={currentStep !== 2}><DetailsStep control={control} register={register} errors={errors} disabled={busy} /></div>
      <div hidden={currentStep !== 3}><ContactStep control={control} register={register} errors={errors} countries={countries} disabled={busy} /></div>
      <div hidden={currentStep !== 4}><PeopleStep control={control} disabled={busy} /></div>
      {countries.error && <p role="alert" className="text-red-500">دریافت کشورها ناموفق بود. <button type="button" onClick={countries.refetch}>تلاش دوباره</button></p>}
      <div className="flex justify-between mt-12">
        {currentStep === steps.length ? <SendButton isLoading={busy} /> : <NavigationButton direction="next" onClick={() => goToStep(currentStep + 1)} />}
        {currentStep > 1 && <NavigationButton direction="prev" onClick={() => goToStep(currentStep - 1)} />}
      </div>
    </fieldset>
  </form>;
}
