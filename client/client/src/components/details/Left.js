/**
 * Title: Write a program using JavaScript on Left
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
 * Date: 24, October 2023
 */

import React from "react";
import LoadImage from "../shared/LoadImage";
import Discount from "../icons/Discount";
import SoldOut from "../icons/SoldOut";
import Arrival from "../icons/Arrival";
import DetailCard from "./DetailCard";

const Left = ({ product }) => {
  const gallery = (product?.gallery || []).filter(
    (image, index, images) =>
      image?.url &&
      image.url !== product?.thumbnail?.url &&
      images.findIndex((item) => item?.url === image.url) === index
  );

  // Function to determine the column span class
  function getColumnSpanClass(index, totalThumbnails) {
    if (totalThumbnails === 1) {
      return "col-span-12";
    } else if (totalThumbnails === 2) {
      return index <= 1 ? "col-span-6" : "col-span-6";
    } else if (totalThumbnails === 3) {
      return index === 0 ? "col-span-12" : "col-span-6";
    } else if (totalThumbnails === 4) {
      return "col-span-6";
    } else if (totalThumbnails === 5) {
      return index <= 1 ? "col-span-6" : "col-span-4";
    } else {
      return "";
    }
  }

  const hashTags = [
    ...(product?.category?.tags || []),
    ...(product?.brand?.tags || []),
    ...(product?.store?.tags || []),
  ].filter((tag) => tag !== undefined);

  return (
    <section className="lg:col-span-6 md:col-span-6 col-span-12 flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-4">
        <LoadImage
          src={product.thumbnail?.url || "/logo.png"}
          unoptimized
          alt={product.title}
          width={1024}
          height={1024}
          quality={90}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="aspect-square rounded w-full h-auto bg-white object-contain"
        />
        {gallery.length > 0 && <div className="grid grid-cols-12 gap-4">
          {gallery.map((thumbnail, index) => (
            <LoadImage
              src={thumbnail?.url}
              unoptimized
              key={index}
              alt={product.title}
              className={
                "rounded object-cover max-w-full w-full h-full" +
                " " +
                getColumnSpanClass(index, gallery.length)
              }
              width={480}
              height={200}
            />
          ))}
        </div>}
      </div>
      <article className="flex flex-col gap-y-4">
        <div className="flex flex-row gap-x-2.5">
          {product?.campaign?.state === "discount" && (
            <Badge className="text-cyan-800 bg-cyan-100 flex flex-row items-center gap-x-1">
              <Discount /> {product?.campaign?.title}
            </Badge>
          )}
          {product?.campaign?.state === "sold-out" && (
            <Badge className="text-cyan-800 bg-cyan-100 flex flex-row items-center gap-x-1">
              <SoldOut /> {product?.campaign?.title}
            </Badge>
          )}
          {product?.campaign?.state === "arrival" && (
            <Badge className="text-cyan-800 bg-cyan-100 flex flex-row items-center gap-x-1">
              <Arrival /> {product?.campaign?.title}
            </Badge>
          )}
          {product?.campaign?.state === "on-sale" && (
            <Badge className="text-blue-800 bg-blue-100 flex flex-row items-center gap-x-1">
              <Arrival /> {product?.campaign?.title}
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-y-2.5">
          <DetailCard
            title={`دسته‌بندی ${product?.category?.title}`}
            content={product?.category?.keynotes}
          />
          <DetailCard
            title={`برند ${product?.brand?.title}`}
            content={product?.brand?.keynotes}
          />
          <DetailCard
            title={`فروشگاه ${product?.store?.title}`}
            content={product?.store?.keynotes}
          />

          <div className="flex flex-row flex-wrap gap-1 mt-4">
            {hashTags.map((hashTag, index) => (
              <span key={index} className="!text-xs border px-2 py-0.5 rounded-sm">{`#${hashTag}`}</span>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
};

function Badge({ props, children, className }) {
  return (
    <span
      className={
        "px-3 py-1 rounded text-xs w-fit" + (className ? " " + className : "")
      }
      {...props}
    >
      {children}
    </span>
  );
}

export default Left;
