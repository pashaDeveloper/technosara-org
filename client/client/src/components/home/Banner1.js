/**
 * Title: Write a program using JavaScript on Banner1
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

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AiTwotoneFire } from "react-icons/ai";
import Container from "../shared/Container";
import Link from "next/link";

const getTimeLeft = (releaseTime) => {
  const seconds = Math.max(0, Math.floor((releaseTime - Date.now()) / 1000));
  return [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ];
};

const Banner1 = () => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    // Midnight on the release date in the visitor's local timezone.
    const releaseTime = new Date(2026, 10, 19).getTime();
    const updateCountdown = () => setTimeLeft(getTimeLeft(releaseTime));
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container>
      <div
        className="bg-[linear-gradient(264deg,_#265ef4,_#d82abd)] h-full w-full rounded-primary relative isolate overflow-visible [clip-path:inset(0_-16px_0_0)] md:overflow-hidden md:[clip-path:none] lg:overflow-visible lg:[clip-path:inset(-100%_0_0_0)] flex flex-col gap-y-8 lg:p-24 pt-8 pb-8 md:pb-0"
      >
        <Image
          src="/assets/home/banner/model1.png"
          alt="تصویر بنر"
          height={872}
          width={500}
          className="absolute inset-y-0 left-0 h-full w-[calc(100%+16px)] max-w-none object-cover object-top pointer-events-none md:static md:inset-auto md:h-auto md:w-auto md:max-w-full md:object-contain lg:absolute lg:bottom-0 lg:right-0 order-2 lg:w-[500px] lg:ml-0 md:ml-auto"
        />
        <article className="relative z-10 flex flex-col justify-start items-end order-1 px-8">
          <div className="flex min-w-0 w-full flex-col gap-y-4 max-w-lg z-20 mr-auto sm:max-w-3xl sm:[container-type:inline-size]">
            <h1
              dir="ltr"
              className="w-full text-center text-[clamp(2.5rem,12vw,4.5rem)] font-black leading-none drop-shadow-md sm:whitespace-nowrap sm:text-left sm:text-[9cqw] sm:leading-tight"
            >
              <span className="block text-white sm:inline-block">
              {["Grand", "Theft", "Auto"].map((word) => (
                <React.Fragment key={word}>
                  <span className={`text-white block sm:inline ${word === "Theft" ? "text-center" : word === "Auto" ? "text-right" : "text-left"}`}>
                    {word}
                  </span>{" "}
                </React.Fragment>
              ))}
              </span>{" "}
              <span className="mt-2 block text-[1.8em] sm:mt-0 sm:inline sm:text-[1em]">
                <span className="text-[#265ef4]">V</span><span className="text-[#d82abd]">I</span>
              </span>
            </h1>
            <Link href="/products" dir="rtl" className="mr-0 ml-auto md:mr-auto md:ml-0 flex w-fit max-w-full flex-row items-center gap-x-2 rounded-secondary border border-black bg-black px-3 py-1.5 text-sm text-white drop-shadow transition-colors hover:bg-black/90 sm:px-4 sm:py-2 sm:text-base">
             این بازی  ، حد و مرز  نداره
              <AiTwotoneFire className="text-[#ffa384] w-6 h-6 drop-shadow" />
            </Link>
            <div
              dir="ltr"
              role="timer"
              aria-label="زمان باقی‌مانده تا انتشار GTA VI"
              className="mt-4 mr-auto ml-0 grid w-full max-w-sm grid-cols-4 gap-2 sm:gap-3"
            >
              {["روز", "ساعت", "دقیقه", "ثانیه"].map((label, index) => (
                <div
                  key={label}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/30 bg-black/20 p-2 shadow-lg backdrop-blur-sm"
                >
                  <span dir="ltr" className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                    {timeLeft ? String(timeLeft[index]).padStart(2, "0") : "--"}
                  </span>
                  <span className="text-xs text-white/80 sm:text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </Container>
  );
};

export default Banner1;
