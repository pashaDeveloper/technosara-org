import ProfileStep from './ProfileStep';
import DetailsStep from './DetailsStep';
import ContactStep from './ContactStep';
import PeopleStep from './PeopleStep';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import StepIndicator from './StepIndicator';
import NavigationButton from '../../../components/shared/button/NavigationButton';
import SendButton from '../../../components/shared/button/SendButton';
import { useAddCompanyMutation, useGetCompanyCountriesQuery } from '../../../services/companies/companyApi';
import { definition, formValues } from '../definitions';

const steps = [['logo', 'name', 'slug'], ['type', 'founded_date'], ['country_code', 'website'], ['founders', 'key_members']];

export default function StepCompany() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState({});
  const [invalid, setInvalid] = useState({});
  const { control, setValue, register, trigger, getValues, handleSubmit, formState: { errors } } = useForm({ mode: 'onChange', defaultValues: formValues(definition), shouldFocusError: false });
  const countries = useGetCompanyCountriesQuery();

  const options = countries;
  const [addCompany, { isLoading }] = useAddCompanyMutation();

  async function goToStep(next) {
    if (isLoading) return;
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
    const first = steps.findIndex(keys => keys.some(key => formErrors[key]));
    if (first >= 0) { setCurrentStep(first + 1); setInvalid(previous => ({ ...previous, [first + 1]: true })); }
  }

  const submit = async (values) => {
    if (isLoading) return;
    if (currentStep < steps.length) { await goToStep(currentStep + 1); return; }
    if (options.isFetching || options.error) return;
    const body = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      type: values.type.trim(),
      founded_date: values.founded_date || null,
      founders: (values.founders || []).map(person => ({ person_id: person.person_id, name: person.name?.trim() })),
      key_members: (values.key_members || []).map(person => ({ person_id: person.person_id, name: person.name?.trim(), role: person.role?.trim() || '' })),
      country_code: values.country_code?.trim() || null,
      website: values.website?.trim() || null,
      logo: values.logo?.trim() || null,
    };
    try {
      const result = await addCompany(body).unwrap();
      if (result.isSuccess === false || result.acknowledgement === false) throw result;
      toast.success(result.description || 'اطلاعات ذخیره شد.');
      navigate('/companies');
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ارسال اطلاعات ناموفق بود؛ اتصال به سرور را بررسی کنید');
    }
  };

  return <>
      <form className="w-full max-w-xl flex flex-col gap-y-4" noValidate onSubmit={handleSubmit(submit, invalidSubmit)}>
        <StepIndicator currentStep={currentStep} totalSteps={steps.length} onStepClick={goToStep} completedSteps={completed} invalidSteps={invalid} />
        <fieldset disabled={isLoading} className="flex flex-col gap-y-4">
          <div hidden={currentStep !== 1}><ProfileStep setValue={setValue} control={control} register={register} errors={errors} /></div>
          <div hidden={currentStep !== 2}><DetailsStep control={control} disabled={isLoading} /></div>
          <div hidden={currentStep !== 3}><ContactStep control={control} register={register} errors={errors} countries={countries} disabled={isLoading} /></div>
          <div hidden={currentStep !== 4}><PeopleStep control={control} register={register} errors={errors} disabled={isLoading} /></div>
          {options?.error && <p role="alert" className="text-red-500">دریافت گزینه‌ها ناموفق بود. <button type="button" onClick={options.refetch}>تلاش دوباره</button></p>}
          <div className="flex justify-between mt-12">
            {currentStep === steps.length ? <SendButton isLoading={isLoading || options?.isFetching || Boolean(options?.error)} /> : <NavigationButton direction="next" onClick={() => goToStep(currentStep + 1)} />}
            {currentStep > 1 && <NavigationButton direction="prev" onClick={() => goToStep(currentStep - 1)} />}
          </div>
        </fieldset>
      </form>
  </>;
}
