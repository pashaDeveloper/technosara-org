import React from 'react';
import NavigationButton from '@/components/shared/button/NavigationButton';
import ProfileAvatarInput from '@/components/shared/gallery/ProfileAvatarInput';

export default function AvatarStep({ errors, nextStep, setValue, watch }) {
  return <>
    <ProfileAvatarInput value={watch('avatarUrl')} error={errors.avatarUrl?.message}
      onChange={url => setValue('avatarUrl', url, { shouldDirty: true, shouldValidate: true })} />
    <div className="flex justify-start mt-12"><NavigationButton direction="next" onClick={nextStep} /></div>
  </>;
}