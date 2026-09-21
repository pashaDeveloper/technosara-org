import { NavLink } from "react-router-dom";
import React from  "react";
import ThemeToggle from "@/components/ThemeToggle";
import StepSignUp from "./steps/StepSignUp";
const Signup = () => {
  return (
    <section className="w-full relative min-h-screen min-h-[100dvh] flex justify-center items-center p-4">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="wave"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-900 z-50 flex flex-col gap-y-4  p-8 rounded-primary shadow-lg">
        <div className="flex flex-row items-center gap-x-2">
          <hr className="w-full   dark:border-gray-600" />{" "}
          <img
            src="/logo.png"
            alt="داشبورد"
            width={141}
            height={40}
            className="max-w-full cursor-pointer"
          />
          <hr className="w-full   dark:border-gray-600" />
        </div>
        <h1 className="text-xl text-center">ثبت‌نام</h1>
        <StepSignUp />
        <div className="flex flex-row justify-center items-center gap-x-2 text-xs">
          <NavLink to="/signin" className="">
            ورود
          </NavLink>
        </div>
        <div className="flex flex-row justify-center items-center gap-x-2 text-xs">
          <ThemeToggle />
        </div>
      </div>
    </section>
  );
};

export default Signup;
