/**
 * Title: Write a program using JavaScript on Header
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
import Container from "../Container";
import Image from "next/image";
import Categories from "./Categories";
import Auth from "./Auth";
import Dashboard from "@/components/icons/Dashboard";
import SearchFilter from "./SearchFilter";
import MyCart from "./MyCart";
import { useSelector } from "react-redux";

const Header = () => {
  const user = useSelector((state) => state?.auth?.user);

  return (
    <Container className="">
      <nav className="rounded-xl py-1 md:px-4 md:py-2 flex flex-row flex-wrap items-center gap-y-1 justify-between">
        <div className="flex flex-row gap-x-2 md:gap-x-4 items-center relative">
          <Image
            src="/logo.png"
            alt="نشان فروشگاه"
            width={180}
            height={40}
            className="order-2 block h-10 w-20 shrink-0 object-contain md:order-none md:h-12 md:w-32 cursor-pointer"
            onClick={() => window.open("/", "_self")}
          />

          <div className="hidden md:block border-l h-7 rounded" />

          <div className="order-1 md:order-none">
            <Categories />
          </div>
        </div>
        <div className="flex flex-row items-center gap-x-0 md:gap-x-2 relative">
          {user && Object?.keys(user)?.length > 0 && (
            <button
              aria-label="داشبورد"
              className="flex h-10 w-10 aspect-square shrink-0 items-center justify-center p-2 rounded-secondary hover:bg-slate-100 transition-colors"
              onClick={() => window.open("/dashboard", "_self")}
            >
              <Dashboard className="h-6 w-6" />
            </button>
          )}
          <SearchFilter />
          <Auth />
          <MyCart />
        </div>
      </nav>
    </Container>
  );
};

export default Header;
