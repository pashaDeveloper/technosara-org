import Modal from "@/components/shared/modal/Modal";
import Avatar from "./Avatar";
import React, { useState, useEffect, useRef } from "react";
import  CloudUpload  from "@/components/icons/CloudUpload";
import ImageEditorModal from "./ImageEditorModal";
import { uploadFilesToArvan } from "@/utils/directUpload";
import { toast } from 'react-hot-toast';

const ProfileImageSelector = ({
  onImageSelect,
  onUploadStateChange,
  uploadName,
  uploadOnSelect = false,
  deviceOnly = false,
  disabled = false,
  editorTitle = "ویرایش عکس پروفایل",
  editorWidth = 800,
  editorHeight = 800,
  buttonClassName = "",
  renderTrigger,
}) => {
  const deviceInput = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [isGeneral, setIsGeneral] = useState(true);
  const [avatarUrls, setAvatarUrls] = useState([]); 
  const [cropFile, setCropFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const maleAvatars = Array.from({ length: 50 }, (_, index) => `/avatar/male/${index + 1}.png`);
  const femaleAvatars = Array.from({ length: 50 }, (_, index) => `/avatar/female/${index + 51}.png`);

  const handleDeviceSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        toast.error('یک تصویر PNG، JPEG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید');
        e.target.value = '';
        return;
      }
      setCropFile(file);
    }
    e.target.value = "";
  };

  const setUploading = (value) => {
    setIsUploading(value);
    onUploadStateChange?.(value);
  };

  const applyDeviceImage = async (file, previewUrl) => {
    if (!file) return;
    if (!uploadOnSelect) {
      try {
        setUploading(true);
        await onImageSelect(file);
        setCropFile(null);
        setShowModal(false);
      } catch (error) {
        toast.error(error.message || 'انتخاب تصویر انجام نشد');
      } finally {
        setUploading(false);
        if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      }
      return;
    }

    try {
      setUploading(true);
      const uploadedFiles = await uploadFilesToArvan({
        files: file,
        fieldName: "avatar",
        folder: "avatar",
        options: {
          uploadName,
          width: 800,
          height: 800,
          fit: "cover",
        },
      });
      await onImageSelect(uploadedFiles[0] || null, previewUrl);
      setCropFile(null);
      setShowModal(false);
    } finally {
      setUploading(false);
    }
  };

  const handleGenderSelection = (gender) => {
    if (gender === "male") {
      setAvatarUrls(maleAvatars);
    } else if (gender === "female") {
      setAvatarUrls(femaleAvatars);
    }
  };

  useEffect(() => {
    setIsGeneral(true);
    handleGenderSelection("female"); 
  }, [showModal]);

  const handleAvatarClick = async (url) => {
    try {
      await onImageSelect(url);
      setShowModal(false);
    } catch (error) {
      toast.error(error.message || 'انتخاب تصویر انجام نشد');
    }
  };

  return (
    <>

      {renderTrigger ? renderTrigger({ onClick: () => deviceOnly ? deviceInput.current?.click() : setShowModal(true), disabled: disabled || isUploading }) : <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => deviceOnly ? deviceInput.current?.click() : setShowModal(true)}
        className={`py-1 px-4 flex flex-row gap-x-2 dark:bg-blue-100 bg-green-100 border dark:text-blue-700 dark:border-blue-900 border-green-900 text-green-900 rounded-secondary w-fit text-sm ${buttonClassName}`}
      >
        <CloudUpload className="h-5 w-5 dark:!text-blue-700" />
        {deviceOnly ? 'انتخاب عکس از سیستم' : 'انتخاب عکس پروفایل*'}
      </button>}

      {deviceOnly && <input ref={deviceInput} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleDeviceSelection} disabled={disabled || isUploading} />}
      {!deviceOnly && <Modal
        isOpen={showModal}
        className={`lg:!w-1/3 md:!w-2/5`}
        onClose={() => setShowModal(false)}
      >
        <div className="flex flex-col p-2 gap-y-4 justify-center items-center">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isGeneral}
              onChange={(event) => {
                setIsGeneral(event.target.checked);
                handleGenderSelection(event.target.checked ? 'female' : 'male');
              }}
              className="peer sr-only"
            />
            <div className="peer flex h-8 justify-center items-center gap-4 rounded-lg bg-orange-600 after:absolute after:left-1 after:h-6 after:w-[154px] after:rounded-lg after:bg-white/40 after:transition-all after:content-[''] peer-checked:bg-orange-600 peer-checked:after:translate-x-full peer-focus:outline-none text-sm ">
              <span className="mr-auto w-[150px] text-center text-white">خانم</span>
              <span className="mr-auto w-[150px] text-center text-white">آقا</span>
            </div>
          </label>
          
          <div className="flex flex-wrap gap-y-2 overflow-y-auto scrollbar-hide h-[250px]">
            {avatarUrls.map((url, index) => (
              <div key={index} className="w-1/3">
                <Avatar avatarUrl={url} onAvatarClick={() => handleAvatarClick(url)} />
              </div>
            ))}
          </div>
          
          {/* دکمه آپلود از دستگاه */}
          <label htmlFor="avatar" className="flex flex-col gap-y-2">
            <input
              type="file"
              name="avatar"
              id="avatar"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleDeviceSelection}
              disabled={isUploading}
            />
            <span className="py-1 px-4 flex flex-row gap-x-2 dark:bg-blue-100 bg-green-100 border dark:text-blue-700 dark:border-blue-900 border-green-900 text-green-900 rounded-secondary w-fit text-sm cursor-pointer">
              <CloudUpload className="h-5 w-5 dark:!text-blue-700" />
              انتخاب از دستگاه
            </span>
          </label>
        </div>
      </Modal>}

      <ImageEditorModal
        file={cropFile}
        height={editorHeight}
        width={editorWidth}
        onApply={applyDeviceImage}
        onCancel={() => setCropFile(null)}
        title={editorTitle}
      />
    </>
  );
};

export default ProfileImageSelector;
