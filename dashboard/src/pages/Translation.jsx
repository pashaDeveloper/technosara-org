import React from 'react';
import ControlPanel from './ControlPanel';
import PersianToEnglish from '../components/shared/translation/PersianToEnglish';

export default function Translation() {
  return <ControlPanel>
    <h1 className="mb-6 text-2xl font-bold text-gray-800 dark:text-gray-100">ترجمهٔ فارسی به انگلیسی</h1>
    <div className="max-w-3xl"><PersianToEnglish /></div>
  </ControlPanel>;
}
