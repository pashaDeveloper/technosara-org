/**
 * Title: Write a program using JavaScript on Page
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
 * Date: 03, November 2023
 */

"use client";

import Banner1 from "@/components/home/Banner1";
import GenreTabs from "@/components/home/GenreTabs";
import Banner2 from "@/components/home/Banner2";
import ExpertChoice from "@/components/home/ExpertChoice";
import NewArrivals from "@/components/home/NewArrivals";
import AmazingDeals from "@/components/home/AmazingDeals";
import Trending from "@/components/home/Trending";
import Main from "@/components/shared/layouts/Main";

export default function Home() {
  return (
    <>
      <Main>
        <main className="flex flex-col gap-y-20 w-full">
          <Banner1 />
          <GenreTabs />
          <AmazingDeals />
          <NewArrivals />
          <Banner2 />
          <ExpertChoice />
          <Trending />
        </main>
      </Main>
    </>
  );
}
