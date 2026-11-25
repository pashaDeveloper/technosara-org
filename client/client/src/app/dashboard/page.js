/**
 * Title: Write a program using JavaScript on Control Panel
 * Author: Hasibul Islam
 * Portfolio: https://devhasibulislam.vercel.app
 * Linkedin: https://linkedin.com/in/devhasibulislam
 * GitHub: https://github.com/devhasibulislam
 * Facebook: https://facebook.com/devhasibulislam
 * Instagram: https://instagram.com/devhasibulislam
 * Twitter: https://twitter.com/devhasibulislam
 * Pinterest: https://pinterest.com/devhasibulislam
 * WhatsApp: https://wa.me/8801906315901
 * Telegram: devhasibulislam
 * Date: 09, November 2023
 */

import Dashboard from "@/components/shared/layouts/Dashboard";
import React from "react";
import Link from "next/link";

const ControlPanel = () => {
  return (
    <Dashboard>
      <div className="w-full h-full flex flex-col gap-4 justify-center items-center !rounded p-8 text-center">
        <h1 className="text-3xl font-bold">به داشبورد تکنوسرا خوش آمدید</h1>
        <p>از منوی حساب، خریدها و اطلاعات خود را مدیریت کنید.</p>
        <Link href="/products" className="rounded-secondary bg-black px-6 py-3 text-white">
          مشاهده محصولات
        </Link>
      </div>
    </Dashboard>
  );
};

export default ControlPanel;
