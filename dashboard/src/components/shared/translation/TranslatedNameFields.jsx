import React from 'react';
import { useWatch } from 'react-hook-form';
import { AutoPersianToEnglish } from './PersianToEnglish';
import { englishSlug } from '../../../pages/genres/genreFormUtils';

export default function TranslatedNameFields({ control, register, setValue, errors, initialSource = '', sourceField = 'name', targetField = 'english_name', disabled, onBusyChange, inputComponent: Input = 'input' }) {
  const source = useWatch({ control, name: sourceField }) || '';
  return <div className="flex flex-col gap-4">
    <AutoPersianToEnglish sourceText={source} initialSource={initialSource} disabled={disabled} onBusyChange={onBusyChange} onTranslated={text => {
      setValue(targetField, text, { shouldDirty: true, shouldValidate: true });
      setValue('slug', englishSlug(text), { shouldDirty: true, shouldValidate: true });
    }} />
    {[targetField, 'slug'].map(key => <label key={key} className="flex flex-col gap-1">
      <span className="text-sm">{key === 'slug' ? 'اسلاگ' : 'نام انگلیسی'}</span>
      <Input dir="ltr" {...register(key, { required: 'این فیلد الزامی است', ...(key === 'slug' ? { pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'حروف کوچک انگلیسی، عدد و خط تیره وارد کنید' } } : {}) })} aria-invalid={!!errors[key]} />
      {errors[key] && <span role="alert" className="text-red-500 text-sm">{errors[key].message}</span>}
    </label>)}
  </div>;
}
