/**
 * Title: Write a program using JavaScript on ProductCard
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
 * Date: 14, November 2023
 */

import React from "react";

const ProductCard = () => {
  return (
    <section className="flex min-w-0 flex-row items-center gap-3 rounded-lg border p-2 md:flex-col md:items-stretch md:gap-4 md:border-0 md:p-0">
      <div className="h-24 w-24 shrink-0 bg-gray-200 animate-pulse rounded md:h-[200px] md:w-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-y-2.5">
        <div className="flex flex-row gap-x-2 overflow-hidden">
          <div className="h-4 w-24 rounded-primary bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 rounded-primary bg-gray-200 animate-pulse" />
        </div>
        <div className="h-6 rounded bg-gray-200 animate-pulse" />
        <div className="flex flex-row flex-wrap gap-2 justify-between">
          <div className="h-4 w-24 rounded-primary bg-gray-200 animate-pulse" />
          <div className="h-4 w-16 rounded-primary bg-gray-200 animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default ProductCard;
