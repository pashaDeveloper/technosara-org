import React, { useState, useRef, useEffect } from 'react';
import UploadSettings from '../pages/settings/UploadSettings';
import { createPortal } from 'react-dom';

function UploadSettingsMenu() {

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const trigger = useRef(null);
  const dropdown = useRef(null);

  useEffect(() => {
    if (dropdownOpen) dropdown.current?.focus();
  }, [dropdownOpen]);

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
      trigger.current?.focus();
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        ref={trigger}
        className={`h-8 px-2 gap-1 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full ${dropdownOpen && 'bg-gray-200 dark:bg-gray-800'}`}
        aria-haspopup="dialog"
        aria-controls="header-upload-settings"
        title="تنظیمات آپلود"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="sr-only">تنظیمات آپلود</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg>
        <span>آپلود</span>
      </button>

      {createPortal(
        <aside ref={dropdown} tabIndex={-1} id="header-upload-settings" role="dialog" aria-labelledby="header-upload-title" aria-hidden={!dropdownOpen} inert={dropdownOpen ? undefined : ''} dir="rtl" className={`fixed bottom-0 left-0 top-0 z-50 w-full max-w-lg overflow-y-auto overscroll-contain border-r border-gray-200 bg-white p-5 text-gray-800 shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${dropdownOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}`}>
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
            <h2 id="header-upload-title" className="font-semibold text-gray-800 dark:text-gray-100">تنظیمات آپلود</h2>
            <button type="button" aria-label="بستن تنظیمات آپلود" className="rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setDropdownOpen(false); trigger.current?.focus(); }}>×</button>
          </div>
          {dropdownOpen && <UploadSettings embedded />}
        </aside>, document.body)}
    </div>
  )
}

export default UploadSettingsMenu;
