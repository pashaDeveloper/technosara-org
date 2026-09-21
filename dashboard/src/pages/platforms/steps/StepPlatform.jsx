import NameStep from './NameStep';
import PhotoStep from './PhotoStep';
import DetailsStep from './DetailsStep';
import ReleaseStep from './ReleaseStep';
import AppearanceStep from './AppearanceStep';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import StepIndicator from './StepIndicator';
import NavigationButton from '../../../components/shared/button/NavigationButton';
import SendButton from '../../../components/shared/button/SendButton';
import { useAddPlatformMutation, useGetPlatformOptionsQuery } from '../../../services/platforms/platformApi';
import { useGetBrandOptionsQuery } from '../../../services/brand/brandApi';
import { definition, formValues } from '../definitions';

const steps = [['logo', 'name', 'slug'], ['parent_id', 'brand_id'], ['generation', 'release_date', 'discontinued_date'], ['website_url', 'icon']];

export default function StepPlatform() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState({});
  const [invalid, setInvalid] = useState({});
  const { control, setValue, register, trigger, getValues, handleSubmit, formState: { errors } } = useForm({ mode: 'onChange', defaultValues: formValues(definition), shouldFocusError: false });
  const parents = useGetPlatformOptionsQuery();

  const brands = useGetBrandOptionsQuery();
  const options = {
    isFetching: parents.isFetching || brands.isFetching,
    error: parents.error || brands.error,
    refetch: () => { parents.refetch(); brands.refetch(); },
  };
  const [addPlatform, { isLoading }] = useAddPlatformMutation();

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
    if (currentStep < 4) { await goToStep(currentStep + 1); return; }
    if (options.isFetching || options.error) return;
    const body = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      brand_id: values.brand_id || null,
      generation: values.generation === '' ? null : Number(values.generation),
      parent_id: values.parent_id?.trim() || null,
      release_date: values.release_date?.trim() || null,
      discontinued_date: values.discontinued_date?.trim() || null,
      website_url: values.website_url?.trim() || null,
      logo: values.logo?.trim() || null,
      icon: values.icon?.trim() || null,
    };
    try {
      const result = await addPlatform(body).unwrap();
      if (result.isSuccess === false || result.acknowledgement === false) throw result;
      toast.success(result.description || 'اطلاعات ذخیره شد.');
      navigate('/platforms');
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ارسال اطلاعات ناموفق بود؛ اتصال به سرور را بررسی کنید');
    }
  };

  return <>
      <form className="w-full max-w-xl flex flex-col gap-y-4" noValidate onSubmit={handleSubmit(submit, invalidSubmit)}>
        <StepIndicator currentStep={currentStep} totalSteps={steps.length} onStepClick={goToStep} completedSteps={completed} invalidSteps={invalid} />
        <fieldset disabled={isLoading} className="flex flex-col gap-y-4">
          <div hidden={currentStep !== 1}>
            <PhotoStep control={control} />
            <NameStep setValue={setValue} control={control} register={register} errors={errors} />
          </div>
          <div hidden={currentStep !== 2}><DetailsStep brands={brands} control={control} disabled={isLoading} register={register} errors={errors} getValues={getValues} parents={parents} /></div>
          <div hidden={currentStep !== 3}><ReleaseStep control={control} disabled={isLoading} register={register} errors={errors} getValues={getValues} parents={parents} /></div>
          <div hidden={currentStep !== 4}><AppearanceStep register={register} errors={errors} getValues={getValues} parents={parents} /></div>
          {options?.error && <p role="alert" className="text-red-500">دریافت گزینه‌ها ناموفق بود. <button type="button" onClick={options.refetch}>تلاش دوباره</button></p>}
          <div className="flex justify-between mt-12">
            {currentStep === steps.length ? <SendButton isLoading={isLoading || options?.isFetching || Boolean(options?.error)} /> : <NavigationButton direction="next" onClick={() => goToStep(currentStep + 1)} />}
            {currentStep > 1 && <NavigationButton direction="prev" onClick={() => goToStep(currentStep - 1)} />}
          </div>
        </fieldset>
      </form>
  </>;
}
