import { useLocation } from 'react-router-dom';
import React from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import ChevronRight from '../../components/icons/ChevronRight';
import StepGame from './steps/StepGame';

export default function AddGame() {
  const { search: listQuery } = useLocation();
  return <section className="w-full relative min-h-screen flex justify-center items-start px-4 py-8 pb-24" dir="rtl">
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none"><div className="wave" /><div className="wave wave2" /><div className="wave wave3" /></div>
    <div className="w-full max-w-[1600px] relative z-10 flex flex-col gap-y-4">
      <StepGame />
      <ThemeToggle />
    </div>
    <NavLink aria-label="Back" className="fixed bottom-4 right-4 reject-button rounded-full !p-4 z-50" to={'/games' + listQuery}><ChevronRight /></NavLink>
  </section>;
}
