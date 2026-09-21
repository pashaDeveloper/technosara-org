import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useSignUpMutation } from '@/services/auth/authApi';
import NavigationButton from '@/components/shared/button/NavigationButton';
import SendButton from '@/components/shared/button/SendButton';
import AvatarStep from './AvatarStep';
import NameStep from './NameStep';
import EmailStep from './EmailStep';
import PasswordStep from './PasswordStep';
import StepIndicator from './StepIndicator';

const fields = ['avatarUrl', 'name', 'email', 'password', 'confirmPassword'];

export default function StepSignUp() {
  const [currentStep, setCurrentStep] = useState(1);
  const [signup, { isLoading }] = useSignUpMutation();
  const navigate = useNavigate();
  const { register, trigger, getValues, setValue, watch, handleSubmit, formState: { errors } } = useForm({ mode: 'onChange' });

  const goToStep = async (step) => {
    if (isLoading) return;
    if (step > currentStep) {
      for (let i = 0; i < step - 1; i++) {
        if ((i > 0 && !getValues(fields[i])) || !await trigger(fields[i])) { setCurrentStep(i + 1); return; }
      }
    }
    setCurrentStep(step);
  };
  const submit = async (values) => {
    if (isLoading) return;
    if (currentStep < 5) { await goToStep(currentStep + 1); return; }
    const body = { name: values.name.trim(), username: values.email.trim().toLowerCase(),
      password: values.password, confirmPassword: values.confirmPassword, avatarUrl: values.avatarUrl?.trim() || '' };
    try {
      const result = await signup(body).unwrap();
      if (result.isSuccess === false || result.acknowledgement === false) throw result;
      toast.success(result.description || 'ثبت‌نام با موفقیت انجام شد');
      navigate('/signin');
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ثبت‌نام ناموفق بود؛ اتصال به سرور را بررسی کنید');
    }
  };
  const props = { register, errors, nextStep: () => goToStep(currentStep + 1), prevStep: () => goToStep(currentStep - 1) };
  return <form onSubmit={handleSubmit(submit, (invalid) => {
    const first = fields.findIndex((field) => invalid[field]);
    if (first >= 0) setCurrentStep(first + 1);
  })}>
    <fieldset disabled={isLoading}>
      <StepIndicator currentStep={currentStep} totalSteps={5} onStepClick={goToStep}
        completedSteps={Object.fromEntries(fields.map((_, i) => [i + 1, i + 1 < currentStep]))}
        invalidSteps={Object.fromEntries(fields.map((field, i) => [i + 1, !!errors[field]]))} />
      {currentStep === 1 && <AvatarStep {...props} setValue={setValue} watch={watch} />}
      {currentStep === 2 && <NameStep {...props} />}
      {currentStep === 3 && <EmailStep {...props} />}
      {currentStep === 4 && <PasswordStep {...props} />}
      {currentStep === 5 && <><label className="flex flex-col gap-1">تکرار رمز عبور<input type="password" autoComplete="new-password" {...register('confirmPassword', {
        required: 'تکرار رمز عبور الزامی است', validate: value => value === getValues('password') || 'رمز عبور و تکرار آن یکسان نیستند',
      })} /></label>{errors.confirmPassword && <p role="alert" className="text-red-500">{errors.confirmPassword.message}</p>}<div className="flex justify-between mt-8"><SendButton isLoading={isLoading} /><NavigationButton direction="prev" onClick={props.prevStep} /></div></>}
    </fieldset>
  </form>;
}
