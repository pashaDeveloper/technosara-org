import React from 'react';
import ProfileImageSelector from './ProfileImageSelector';
import PreviewableMedia from './PreviewableMedia';

async function profileDataUrl(file) {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 256);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    return canvas.toDataURL('image/jpeg', 0.75);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export default function ProfileAvatarInput({ value, onChange, onBusyChange, error, deviceOnly = false, preserveQuality = false }) {
  const handleImageSelect = async (image) => {
    const url = typeof image === 'string'
      ? new URL(image, window.location.origin).href
      : preserveQuality ? await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('خواندن عکس ناموفق بود'));
        reader.readAsDataURL(image);
      }) : await profileDataUrl(image);
    if (url.length > (preserveQuality ? 7 * 1024 * 1024 : 80 * 1024)) throw new Error('حجم تصویر زیاد است؛ کیفیت آن را در ویرایشگر کاهش دهید.');
    onChange(url);
  };

  return <div className="flex flex-col items-center">
    <div className="profile-container shine-effect rounded-full flex justify-center mb-4 h-[100px] w-[100px]">
      {value ? <PreviewableMedia src={value} alt="تصویر پروفایل" height={100} width={100}
        className="h-[100px] w-[100px] profile-pic rounded-full object-cover" />
        : <div className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-700" aria-label="تصویر پروفایل انتخاب نشده" />}
    </div>
    <ProfileImageSelector deviceOnly={deviceOnly} onImageSelect={handleImageSelect} onUploadStateChange={onBusyChange} />
    {error && <p role="alert" className="text-red-500 text-sm mt-2">{error}</p>}
  </div>;
}
