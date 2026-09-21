import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const CompanyInput = forwardRef(function CompanyInput({ as: Component = 'input', className, type = 'text', ...props }, ref) {
  return <Component ref={ref} {...(Component === 'input' ? { type } : {})} {...props}
    className={twMerge('form-input w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-[#0a2d4d] dark:text-gray-100', Component === 'textarea' ? 'min-h-28 resize-y' : 'h-11', className)} />;
});

export default CompanyInput;
