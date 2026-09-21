import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import Dropdown from '../../../components/shared/select/Dropdown';
import GregorianDatePicker, { parseInputDate } from '../../../components/shared/date/GregorianDatePicker';
import CompanyInput from '../components/CompanyInput';
import { definition } from '../definitions';

const options = definition.fields.find(field => field.key === 'type').options;
export default function DetailsStep({ control, disabled }) {
  const [foundedYear, foundedDate] = useWatch({ control, name: ['founded_year', 'founded_date'] });
  return <div className="flex flex-col gap-y-4"><Controller name="type" control={control} rules={{ required: 'نوع فعالیت الزامی است' }}
    render={({ field, fieldState }) => <Dropdown label="نوع فعالیت *" inputComponent={CompanyInput}
      value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
      options={options} disabled={disabled} error={fieldState.error?.message} />} />
    <Controller name="founded_date" control={control} rules={{
      validate: value => {
        if (!value) return true;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(value) && parseInputDate(value);
        return (date && date.getFullYear() >= 1000 && date <= new Date()) || 'تاریخ تأسیس معتبر و حداکثر تا امروز وارد کنید';
      },
    }} render={({ field, fieldState }) => <GregorianDatePicker
      label="تاریخ تأسیس شرکت (میلادی)" inputComponent={CompanyInput}
      value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
      minYear={1800} maxYear={new Date().getFullYear()}
      disabled={disabled} error={fieldState.error?.message} />} />
    {foundedYear && !foundedDate && <p className="text-sm text-gray-500">سال تأسیس ثبت‌شده: {foundedYear}. در صورت اطلاع، تاریخ کامل را انتخاب کنید.</p>}
  </div>;
}
