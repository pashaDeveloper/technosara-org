import React from 'react';
import { Controller } from 'react-hook-form';
import ProfileAvatarInput from '../../../components/shared/gallery/ProfileAvatarInput';
import { englishSlug } from '../../genres/genreFormUtils';
import BrandInput from '../components/BrandInput';

export default function ProfileStep({ control, register, setValue, errors, onBusyChange }) {
  return <div className="flex flex-col gap-4">
    <Controller name="logo" control={control} render={({ field, fieldState }) =>
      <ProfileAvatarInput preserveQuality deviceOnly value={field.value} onChange={field.onChange} onBusyChange={onBusyChange} error={fieldState.error?.message} />} />
    <label className="flex flex-col gap-1" htmlFor="brand-name">
      <span className="text-sm">نام انگلیسی برند *</span>
      <BrandInput id="brand-name" dir="ltr" {...register('name', {
        required: 'نام برند الزامی است', validate: value => !!value.trim() || 'نام برند الزامی است',
        maxLength: { value: 200, message: 'حداکثر ۲۰۰ حرف وارد کنید' },
        onChange: event => setValue('slug', englishSlug(event.target.value), { shouldDirty: true, shouldValidate: true }),
      })} aria-invalid={!!errors.name} />
      {errors.name && <span role="alert" className="text-sm text-red-500">{errors.name.message}</span>}
    </label>
    <label className="flex flex-col gap-1" htmlFor="brand-slug">
      <span className="text-sm">اسلاگ *</span>
      <BrandInput id="brand-slug" dir="ltr" {...register('slug', { required: 'اسلاگ الزامی است', pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'حروف کوچک انگلیسی، عدد و خط تیره وارد کنید' } })} aria-invalid={!!errors.slug} />
      {errors.slug && <span role="alert" className="text-sm text-red-500">{errors.slug.message}</span>}
    </label>
  </div>;
}
