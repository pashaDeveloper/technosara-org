import { englishSlug } from '../../genres/genreFormUtils';
import React from 'react';
import { Controller } from 'react-hook-form';
import ProfileAvatarInput from '../../../components/shared/gallery/ProfileAvatarInput';
import CompanyInput from '../components/CompanyInput';

export default function ProfileStep({ control, register, setValue, errors }) {
  return <div className="flex flex-col gap-4">
    <Controller name="logo" control={control} render={({ field, fieldState }) =>
      <ProfileAvatarInput preserveQuality deviceOnly value={field.value} onChange={field.onChange} error={fieldState.error?.message} />} />
    <label className="flex flex-col gap-1" htmlFor="company-name">
      <span className="text-sm">نام انگلیسی شرکت *</span>
      <CompanyInput id="company-name" dir="ltr" {...register('name', { required: 'نام شرکت الزامی است', validate: value => Boolean(value.trim()) || 'نام شرکت الزامی است', onChange: event => setValue('slug', englishSlug(event.target.value), { shouldDirty: true, shouldValidate: true }) })} aria-invalid={Boolean(errors.name)} />
      {errors.name && <span role="alert" className="text-sm text-red-500">{errors.name.message}</span>}
    </label>
    <label className="flex flex-col gap-1" htmlFor="company-slug">
      <span className="text-sm">اسلاگ *</span>
      <CompanyInput id="company-slug" dir="ltr" {...register('slug', { required: 'اسلاگ الزامی است', pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'حروف کوچک انگلیسی، عدد و خط تیره وارد کنید' } })} aria-invalid={Boolean(errors.slug)} />
      {errors.slug && <span role="alert" className="text-sm text-red-500">{errors.slug.message}</span>}
    </label>
  </div>;
}
