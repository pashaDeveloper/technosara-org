import React from 'react';
import { Controller } from 'react-hook-form';
import BrandInput from '../components/BrandInput';
import ListTextField from '../../../components/shared/ListTextField';
import GregorianDatePicker, { parseInputDate } from '../../../components/shared/date/GregorianDatePicker';
export default function DetailsStep({ control, register, errors, disabled }) {
  return <div className="flex flex-col gap-4">
    <label className="flex flex-col gap-1" htmlFor="brand-description">
      <span className="text-sm">توضیحات</span>
      <BrandInput as="textarea" id="brand-description" {...register('description', { maxLength: { value: 10000, message: 'حداکثر ۱۰۰۰۰ حرف وارد کنید' } })} aria-invalid={!!errors.description} />
      {errors.description && <span role="alert" className="text-sm text-red-500">{errors.description.message}</span>}
    </label>
    <Controller name="founded_date" control={control} rules={{ validate: value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && parseInputDate(value) && parseInputDate(value) <= new Date()) || 'تاریخ معتبر و حداکثر تا امروز وارد کنید' }} render={({ field, fieldState }) =>
      <GregorianDatePicker inputComponent={BrandInput} minYear={1000} maxYear={new Date().getFullYear()} label="تاریخ تأسیس (میلادی)" value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} disabled={disabled} error={fieldState.error?.message} />} />
    <Controller name="activity_fields" control={control} rules={{ validate: value => (value.length <= 100 && value.every(item => item.trim() && item.length <= 200)) || 'حداکثر ۱۰۰ حوزه با نام کوتاه وارد کنید' }} render={({ field, fieldState }) =>
      <ListTextField inputComponent={BrandInput} label="حوزه‌های فعالیت" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={fieldState.error?.message} disabled={disabled} placeholder="مثلاً کنسول بازی، لوازم جانبی، نرم‌افزار" />} />
  </div>;
}
