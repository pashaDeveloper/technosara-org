/**
 * Title: Write a program using JavaScript on Steps
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
 * Date: 09, October 2023
 */

import Image from "next/image";
import React from "react";
import Container from "../shared/Container";

const Steps = () => {
  const steps = [
    {
      badge: (
        <span className="inline-flex px-2.5 py-1 rounded-secondary text-xs text-red-800 bg-red-100 relative">
          مرحله ۱
        </span>
      ),
      title: "جست‌وجو و انتخاب",
      description: "با فیلترها و پیشنهادهای هوشمند، محصول دلخواهتان را پیدا کنید.",
      thumbnail: "/assets/home/steps/step-1.png",
    },
    {
      badge: (
        <span className="inline-flex px-2.5 py-1 rounded-secondary text-xs text-indigo-800 bg-indigo-100 relative">
          مرحله ۲
        </span>
      ),
      title: "افزودن به سبد خرید",
      description: "محصولات دلخواهتان را انتخاب کنید و به سبد خرید اضافه کنید.",
      thumbnail: "/assets/home/steps/step-2.png",
    },
    {
      badge: (
        <span className="inline-flex px-2.5 py-1 rounded-secondary text-xs text-yellow-800 bg-yellow-100 relative">
          مرحله ۳
        </span>
      ),
      title: "ارسال سریع",
      description: "سفارش شما تأیید و در کوتاه‌ترین زمان ارسال می‌شود.",
      thumbnail: "/assets/home/steps/step-3.png",
    },
    {
      badge: (
        <span className="inline-flex px-2.5 py-1 rounded-secondary text-xs text-purple-800 bg-purple-100 relative">
          مرحله ۴
        </span>
      ),
      title: "از خریدتان لذت ببرید",
      description: "محصولات باکیفیت خود را تحویل بگیرید و لذت ببرید.",
      thumbnail: "/assets/home/steps/step-4.png",
    },
  ];

  return (
    <Container>
      <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-16 xl:gap-20">
        <picture className="hidden md:block absolute inset-x-0 top-5">
          <source srcSet="/assets/home/steps/step-bg.svg" type="image/svg" />
          <img src="/assets/home/steps/step-bg.svg" alt="تصویر تزئینی" />
        </picture>
        {steps.map((step, index) => (
          <div
            key={index}
            className="relative flex flex-col gap-y-8 items-center max-w-xs mx-auto"
          >
            <div className="max-w-[100px] mx-auto">
              <Image
                src={step.thumbnail}
                alt={step.title}
                height={100}
                width={100}
                className="w-[100px] h-[100px] object-contain"
              />
            </div>
            <div className="flex flex-col gap-y-4 items-center justify-center">
              {step.badge}
              <h2 className="text-base">{step.title}</h2>
              <span className="block text-slate-600 dark:text-slate-400 text-sm leading-6 text-center">
                {step.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default Steps;
