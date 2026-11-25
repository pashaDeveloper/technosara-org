/**
 * Title: Write a program using JavaScript on Footer
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
 * Date: 17, October 2023
 */

"use client";

import React from "react";
import Container from "./Container";
import { IoAccessibilityOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";

const Footer = () => {
  const router = useRouter();
  const year = new Date().getFullYear();

  const sitemaps = [
    {
      name: "ویژگی‌ها",
      paths: [
        {
          name: "محصولات جذاب",
          path: "/",
        },
        {
          name: "پیشنهاد ویژه",
          path: "/",
        },
        {
          name: "پیشنهاد گروهی",
          path: "/",
        },
        {
          name: "ابزار توسعه‌دهندگان",
          path: "/",
        },
        {
          name: "پیشنهادهای بیشتر",
          path: "/",
        },
        {
          name: "آخرین پیشنهادها",
          path: "/",
        },
      ],
    },
    {
      name: "منابع",
      paths: [
        {
          name: "راهنما",
          path: "/",
        },
        {
          name: "راهنمای خرید",
          path: "/",
        },
        {
          name: "راهنماهای بیشتر",
          path: "/",
        },
        {
          name: "اطلاعات تکمیلی",
          path: "/",
        },
      ],
    },
    {
      name: "درباره ما",
      paths: [
        {
          name: "تیم ما",
          path: "/",
        },
        {
          name: "نشانی‌ها",
          path: "/",
        },
        {
          name: "حریم خصوصی",
          path: "/",
        },
        {
          name: "شرایط استفاده",
          path: "/",
        },
      ],
    },
    {
      name: "تماس با ما",
      paths: [
        {
          name: "راهنما",
          path: "/",
        },
        {
          name: "فروش",
          path: "/",
        },
        {
          name: "تبلیغات",
          path: "/",
        },
      ],
    },
    {
      name: "حقوقی",
      paths: [
        {
          name: "ثبت شکایت",
          path: "/",
        },
        {
          name: "شرایط خدمات",
          path: "/",
        },
        {
          name: "سیاست حفظ حریم خصوصی",
          path: "/",
        },
      ],
    },
    {},
    {
      name: "با ما در ارتباط باشید",
      paths: brand.socialLinks,
    },
  ];

  return (
    <footer className="footer-1 bg-gray-100 py-8 sm:py-12 m-6 p-6 rounded-xl">
      <div className="container mx-auto px-4 flex flex-col gap-y-10">
        <div className="flex md:flex-row md:flex-wrap md:justify-between flex-col gap-x-4 gap-y-8">
          {sitemaps?.map((sitemap, index) => (
            <div key={index} className="flex flex-col gap-y-3">
              <h2 className="text-2xl">{sitemap.name}</h2>
              <div className="flex flex-col gap-y-1.5">
                {sitemap?.paths?.map((path, index) => (
                  <Link key={index} href={path?.path} className="text-base">
                    {path?.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <hr />
        <p className="text-center">&copy; {year} تکنوسرا. همه حقوق محفوظ است.</p>
      </div>
    </footer>
  );
};

export default Footer;
