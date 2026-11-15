import React from 'react';
import GameImageAsset from './GameImageAsset';
export default function MainCoverPicker({ label = 'کاور کارت بازی', fieldName = 'thumbnail', onUploading, ...props }) {
  return <div className="min-w-0 space-y-2"><span className="block text-center text-sm font-medium">{label}</span><GameImageAsset {...props} fieldName={fieldName} label={label} portrait={fieldName === 'detail_poster'} onUploading={onUploading} /></div>;
}
