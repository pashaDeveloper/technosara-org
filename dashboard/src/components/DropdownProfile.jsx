import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSignOutMutation } from '../services/auth/authApi';
import { toast } from 'react-hot-toast';
import Transition from '../utils/Transition';

import UserAvatar from '../images/user-avatar-32.png';

function DropdownProfile({
  align
}) {

  const user = useSelector(state => state.auth.admin);
  const avatarUrl = user?.avatar?.url || UserAvatar;
  const [failedAvatar, setFailedAvatar] = useState(null);
  const approvedLevel = Math.max(1, Math.min(3, Number(user?.profileApproval?.approvedLevel) || 1));
  const levelLabel = `سطح تأییدشده: ${approvedLevel.toLocaleString('fa-IR')}`;
  const [signOut, { isLoading }] = useSignOutMutation();
  const logout = async () => { try { await signOut().unwrap(); localStorage.removeItem('accessToken'); window.location.assign('/signin'); } catch { toast.error('خروج انجام نشد؛ دوباره تلاش کنید'); } };
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const trigger = useRef(null);
  const dropdown = useRef(null);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        type="button"
        className="inline-flex min-w-0 justify-center items-center gap-2 group"
        aria-label={`${user?.name || 'حساب کاربری'}، ${levelLabel}`}
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <img className="w-8 h-8 shrink-0 rounded-full object-cover" src={failedAvatar === avatarUrl ? UserAvatar : avatarUrl} width="32" height="32" alt="تصویر پروفایل کاربر" onError={() => setFailedAvatar(avatarUrl)} />
        <div className="flex min-w-0 flex-col gap-0.5 text-right">
          <span title={user?.name} className="max-w-24 truncate text-xs sm:max-w-40 sm:text-sm font-medium text-gray-600 dark:text-gray-100 group-hover:text-gray-800 dark:group-hover:text-white">{user?.name || "حساب کاربری"}</span>
          <span className="whitespace-nowrap text-[10px] sm:text-xs !text-green-700 dark:!text-green-400">{levelLabel}</span>
        </div>
          <svg aria-hidden="true" className="w-3 h-3 shrink-0 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
            <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
          </svg>
      </button>

      <Transition
        className={`origin-top-right z-10 absolute top-full min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
        show={dropdownOpen}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div
          ref={dropdown}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setDropdownOpen(false)}
        >
          <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
            <div className="font-medium text-gray-800 dark:text-gray-100">{user?.name || "حساب کاربری"}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role === 'superAdmin' ? 'مدیر کل' : 'مدیر'}</div>
            <div className="mt-1 text-xs text-green-700 dark:text-green-400">{levelLabel}</div>
          </div>
          <ul>
            <li>
              <Link className="font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1 px-3" to="/my-profile" onClick={() => setDropdownOpen(false)}>پروفایل من</Link>
            </li>
            <li>
              <Link
                className="font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1 px-3"
                to="/settings"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                تنظیمات
              </Link>
            </li>
            <li>
              <button
                className="font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1 px-3" type="button" disabled={isLoading} onClick={logout}>خروج</button>
            </li>
          </ul>
        </div>
      </Transition>
    </div>
  )
}

export default DropdownProfile;
