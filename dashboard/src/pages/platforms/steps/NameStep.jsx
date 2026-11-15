import { englishSlug } from '../../genres/genreFormUtils';
import React from 'react';


import PlatformInput from '../components/PlatformInput';

export default function NameStep({ control, register, setValue, errors }) {
  return <div className="flex flex-col gap-4">

    <label className="flex flex-col gap-1" htmlFor="name">
      <span className="text-sm">نام انگلیسی پلتفرم *</span>
      <PlatformInput id="name" dir="ltr" {...register('name', { required: 'نام پلتفرم الزامی است', validate: value => Boolean(value.trim()) || 'نام پلتفرم الزامی است', onChange: event => setValue('slug', englishSlug(event.target.value), { shouldDirty: true, shouldValidate: true }) })} aria-invalid={Boolean(errors.name)} />
      {errors.name && <span role="alert" className="text-sm text-red-500">{errors.name.message}</span>}
    </label>
    <label className="flex flex-col gap-1" htmlFor="platform-short-name">
      <span className="text-sm">نام اختصاری (اختیاری)</span>
      <PlatformInput id="platform-short-name" dir="ltr" placeholder="PS3" {...register('short_name')} />
    </label>
    <label className="flex flex-col gap-1" htmlFor="platform-slug">
      <span className="text-sm">اسلاگ *</span>
      <PlatformInput id="platform-slug" dir="ltr" {...register('slug', { required: 'اسلاگ الزامی است', pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'حروف کوچک انگلیسی، عدد و خط تیره وارد کنید' } })} aria-invalid={Boolean(errors.slug)} />
      {errors.slug && <span role="alert" className="text-sm text-red-500">{errors.slug.message}</span>}
    </label>
  </div>;
}
