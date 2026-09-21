import React from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import ChevronRight from '../../components/icons/ChevronRight';
import StepUpdatePlatform from './steps/StepUpdatePlatform';

export default function UpdatePlatform() {
  return <section className="w-full relative min-h-screen min-h-[100dvh] flex justify-center items-center p-4" dir="rtl">
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none"><div className="wave" /><div className="wave wave2" /><div className="wave wave3" /></div>
    <div className="max-w-md w-full bg-white dark:bg-gray-900 z-50 flex flex-col gap-y-4 p-8 rounded-primary shadow-lg">
      <StepUpdatePlatform />
      <ThemeToggle />
    </div>
    <NavLink aria-label="Back" className="fixed bottom-4 right-4 reject-button rounded-full !p-4 z-50" to="/platforms"><ChevronRight /></NavLink>
  </section>;
}
