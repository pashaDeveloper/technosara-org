import React from 'react';
import { Controller } from 'react-hook-form';
import ProfileAvatarInput from '../../../components/shared/gallery/ProfileAvatarInput';

export default function PhotoStep({ control }) {
  return <div className="grid grid-cols-2 gap-4">{[['thumbnail', 'تصویر پلتفرم'], ['logo', 'لوگو']].map(([name, label]) => <div key={name}>
    <p className="mb-2 text-sm">{label}</p>
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <ProfileAvatarInput preserveQuality deviceOnly value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
    )} />
  </div>)}</div>;
}
