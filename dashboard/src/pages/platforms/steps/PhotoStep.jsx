import React from 'react';
import { Controller } from 'react-hook-form';
import ProfileAvatarInput from '../../../components/shared/gallery/ProfileAvatarInput';

export default function PhotoStep({ control }) {
  return <Controller name="logo" control={control} render={({ field, fieldState }) => (
    <ProfileAvatarInput preserveQuality deviceOnly value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
  )} />;
}
