import React, { useEffect } from "react";
import Spinner from "@/components/shared/Spinner";
import { NavLink, useNavigate } from "react-router-dom";
import { useSignInMutation } from "@/services/auth/authApi";
import { toast } from "react-hot-toast";
import ThemeToggle from "@/components/ThemeToggle";
import logo from "/logo.png";
const Signin = () => {
  const [signin, { isLoading, data, error }] = useSignInMutation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) {
      toast.loading("در حال ورود...", { id: "signin" });
    }

    if (data?.status === 'success') {
      toast.success(data.description || "ورود با موفقیت انجام شد", { id: "signin" });
      navigate('/', { replace: true });
    }
    if (error) {
      toast.error(error?.data?.message || "ورود ناموفق بود؛ اتصال به سرور را بررسی کنید", { id: "signin" });
    }
    if (data && data.status !== 'success') {
      toast.error(data.description || "پاسخ ورود معتبر نیست", { id: "signin" });
    }
  }, [isLoading, data, error, navigate]);

  const handleSignin = async (e) => {
    e.preventDefault();

    signin({
      email: e.target.email.value.trim().toLowerCase(),
      password: e.target.password.value,
    });

  };

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
            src={logo}
            alt="داشبورد"
            width={141}
            height={40}
            className="max-w-full cursor-pointer"
          />
          <hr className="w-full   dark:border-gray-600" />
        </div>
        <form
          action=""
          className="w-full flex flex-col gap-y-4"
          onSubmit={handleSignin}
        >
          <label htmlFor="email" className="flex flex-col gap-y-1">
            <span className="text-sm">ایمیل خود را وارد کنید</span>
            <input
              type="email" autoComplete="email" dir="ltr"
              name="email"
              id="email"
              placeholder="مانند example@gmail.com"
              className=""
              required
            />
          </label>
          <label htmlFor="password" className="flex flex-col gap-y-1">
            <span className="text-sm">رمز عبور خود را وارد کنید</span>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="رمز عبور"
              autoComplete="current-password"
              className=""
              required
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="py-2 border border-black rounded-secondary bg-black hover:bg-black/90 dark:bg-white text-white dark:text-black transition-colors drop-shadow disabled:bg-gray-200 disabled:border-gray-200 disabled:text-black/50 disabled:cursor-not-allowed flex flex-row justify-center items-center text-sm"
          >
            {isLoading ? <Spinner /> : "ورود"}
          </button>
        </form>
        <div className="flex flex-row justify-center items-center gap-x-2 text-xs">
          <NavLink to="/signup">ثبت‌نام</NavLink>
        </div>
        <div className="flex flex-row justify-center items-center gap-x-2 text-xs">
          <ThemeToggle />
        </div>
      </div>
    </section>
  );
};

export default Signin;
