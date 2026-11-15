import { useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AutoPersianToEnglish } from '../../components/shared/translation/PersianToEnglish';
import ProfileAvatarInput from '../../components/shared/gallery/ProfileAvatarInput';
import PlatformInput from '../platforms/components/PlatformInput';
import SendButton from '../../components/shared/button/SendButton';
import { definition, formValues } from './definitions';
import { englishSlug, gameModeBody } from './gameModeFormUtils';

export default function GameModeForm({ record, isLoading, onSubmit }) {
  const { search: listQuery } = useLocation();
  const { control, register, watch, setValue, handleSubmit, formState: { errors } } = useForm({ defaultValues: formValues(definition, record), mode: 'onChange' });
  const [translating, setTranslating] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const busy = isLoading || translating || readingImage;
  const update = (field, value) => setValue(field, value, { shouldDirty: true, shouldValidate: true });

  return <form className="w-full max-w-xl flex flex-col gap-y-4" noValidate onSubmit={handleSubmit(values => { if (!busy) return onSubmit(gameModeBody(values)); })}>
    <fieldset disabled={isLoading || readingImage} className="flex flex-col gap-y-4">
      <div className="flex flex-col items-center gap-y-2">
        <Controller name="image" control={control} render={({ field, fieldState }) => (
          <ProfileAvatarInput preserveQuality deviceOnly value={field.value} onChange={field.onChange} onBusyChange={setReadingImage} error={fieldState.error?.message} />
        )} />
      </div>
      {definition.fields.filter(field => ['name', 'name_en', 'slug', 'description'].includes(field.key)).map(field => (
        <React.Fragment key={field.key}>
          <label className="flex flex-col gap-1" htmlFor={`gameMode-${field.key}`}>
            <span className="text-sm">{field.label}{field.required ? ' *' : ''}</span>
            {React.createElement(PlatformInput, {
              as: field.type === 'textarea' ? 'textarea' : 'input',
              id: `gameMode-${field.key}`, dir: field.dir || 'rtl',
              ...(field.type === 'textarea' ? { rows: 4 } : { type: 'text' }),
              'aria-invalid': Boolean(errors[field.key]),
              ...register(field.key, {
                validate: value => !field.required || Boolean(value?.trim()) || `${field.label} الزامی است`,
                maxLength: { value: field.key === 'description' ? 10000 : 500, message: 'متن بیش از حد طولانی است' },
                ...(field.key === 'slug' ? { pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'اسلاگ را با حروف کوچک انگلیسی، عدد و خط تیره وارد کنید.' } } : {}),
              }),
            })}
            {errors[field.key] && <span role="alert" className="text-sm text-red-500">{errors[field.key].message}</span>}
          </label>
          {field.key === 'name' && <AutoPersianToEnglish sourceText={watch('name')} initialSource={record?.name || ''} disabled={isLoading} onBusyChange={setTranslating}
            onTranslated={english => { update('name_en', english); update('slug', englishSlug(english)); }} />}
        </React.Fragment>
      ))}
    </fieldset>
    <div className="flex items-center justify-between mt-8">
      <fieldset disabled={busy}><SendButton isLoading={isLoading} /></fieldset>
      <Link to={'/game-modes' + listQuery} className="reject-button rounded-md px-4 py-2">انصراف</Link>
    </div>
  </form>;
}
