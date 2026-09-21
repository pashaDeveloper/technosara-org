import React, { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import Dropdown from '../../../components/shared/select/Dropdown';
import BrandInput from '../components/BrandInput';

function CountryFlag({ option }) {
  return <img src={'https://flagcdn.com/w40/' + option.value.toLowerCase() + '.png'} alt="" width="24" height="16" className="h-4 w-6 shrink-0 rounded-sm object-cover" />;
}
export default function ContactStep({ control, register, errors, countries, disabled }) {
  const options = useMemo(() => (countries.data?.data || []).map(country => ({
    value: country.code, label: country.name_fa || country.name,
    searchText: [country.name_fa, country.name, country.code, country.code_alpha3].join(' '),
  })), [countries.data]);
  return <div className="flex flex-col gap-4">
    <Controller name="country_code" control={control} render={({ field, fieldState }) =>
      <Dropdown label="کشور" inputComponent={BrandInput} optionIcon={CountryFlag} options={options}
        value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
        disabled={disabled || countries.isFetching || Boolean(countries.error)} error={fieldState.error?.message} />} />
    <label htmlFor="brand-website" className="flex flex-col gap-1">
      <span className="text-sm">وب‌سایت</span>
      <BrandInput id="brand-website" type="url" dir="ltr" {...register('website', {
        validate: value => {
          if (!value?.trim()) return true;
          try { const url = new URL(value); return (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) || 'نشانی معتبر وارد کنید'; }
          catch { return 'نشانی معتبر وارد کنید'; }
        },
      })} aria-invalid={Boolean(errors.website)} />
      {errors.website && <span role="alert" className="text-sm text-red-500">{errors.website.message}</span>}
    </label>
  </div>;
}
