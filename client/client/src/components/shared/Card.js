/**
 * Title: Write a program using JavaScript on Card
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
 * Date: 15, October 2023
 */

"use client";

import { formatToman } from "@/libs/currency";
import React, { useEffect } from "react";
import StarRating from "./StarRating";
import { MdFavorite } from "react-icons/md";
import Discount from "../icons/Discount";
import SoldOut from "../icons/SoldOut";
import Arrival from "../icons/Arrival";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useAddToFavoriteMutation,
  useRemoveFromFavoriteMutation,
} from "@/services/favorite/favoriteApi";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import Spinner from "./Spinner";
import GuestFavorite from "./GuestFavorite";

const Card = ({ index, product, ...rest }) => {
  const router = useRouter();
  const user = useSelector((state) => state?.auth?.user);

  // check if product._id match with favorites array of object's product._id
  const favorite = user?.favorites?.find(
    (fav) => fav?.product?._id === product?._id
  );

  return (
    <div
      {...rest}
      className="min-w-0 flex-shrink-0 flex flex-row items-center gap-3 p-2 md:flex-col md:items-stretch md:gap-x-0 md:gap-y-6 md:p-0 group border hover:border-gray-400 transition-colors rounded-lg"
    >
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-md bg-white md:w-full">
        <Image
          src={product?.thumbnail?.url || "/logo.png"}
          unoptimized
          alt={product?.title}
          fill
          quality={90}
          sizes="(max-width: 767px) 96px, (max-width: 1024px) 50vw, 320px"
          className="rounded-md object-contain transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {product?.campaign && (
          <span className="max-w-full text-[10px] md:text-xs bg-white/80 px-1 md:px-2.5 py-0.5 rounded-xl absolute bottom-1 right-1 md:bottom-4 md:right-4 cursor-not-allowed">
            {product?.campaign?.state === "discount" && (
              <span className="flex flex-row gap-x-0.5 items-center">
                <Discount /> {product?.campaign.title}
              </span>
            )}
            {product?.campaign?.state === "sold-out" && (
              <span className="flex flex-row gap-x-0.5 items-center">
                <SoldOut /> {product?.campaign.title}
              </span>
            )}
            {product?.campaign?.state === "new-arrival" && (
              <span className="flex flex-row gap-x-0.5 items-center">
                <Arrival /> {product?.campaign.title}
              </span>
            )}
            {product?.campaign?.state === "on-sale" && (
              <span className="flex flex-row gap-x-0.5 items-center">
                <Arrival /> {product?.campaign.title}
              </span>
            )}
          </span>
        )}
        {!user?._id ? (
          <GuestFavorite product={product} />
        ) : favorite ? (
          <RemoveFromFavorite favorite={favorite} />
        ) : (
          <AddToFavorite product={product} />
        )}
      </div>
      <article className="flex min-w-0 flex-1 flex-col py-1 md:py-0 md:gap-y-3.5 md:px-4 md:h-full">
        <div
          className="flex min-w-0 flex-col gap-y-2 cursor-pointer md:gap-y-4 md:h-full"
          onClick={() =>
            router.push(
              `/product?product_id=${
                product?._id
              }&product_title=${product?.title
                .replace(/ /g, "-")
                .toLowerCase()}}`
            )
          }
        >
          <h2 className="truncate text-sm md:text-base">{product?.title}</h2>
          <p title={product?.summary} className="line-clamp-1 text-xs leading-5 text-gray-500">{product?.summary}</p>
          <div className="flex flex-row flex-wrap gap-2 items-end justify-between mt-auto">
            <span className="flex items-center border-2 border-green-500 rounded py-1 px-1.5 md:py-1.5 md:px-2.5 text-xs md:text-sm font-medium">
              <span className="text-green-500 !leading-none">
                {formatToman(product?.price)}
              </span>
            </span>
            <StarRating reviews={product?.reviews} />
          </div>
        </div>
      </article>
      <div className="hidden md:block"></div>
    </div>
  );
};

function AddToFavorite({ product }) {
  const user = useSelector((state) => state?.auth?.user);
  const [addToFavorite, { isLoading, data, error }] =
    useAddToFavoriteMutation();

  useEffect(() => {
    if (isLoading) {
      toast.loading("در حال افزودن به علاقه‌مندی‌ها…", { id: "addToFavorite" });
    }

    if (data) {
      toast.success(data?.description, { id: "addToFavorite" });
    }

    if (error?.data) {
      toast.error(error?.data?.description, { id: "addToFavorite" });
    }
  }, [isLoading, data, error]);

  return (
    <button
      className="border border-transparent bg-white hover:border-gray-400 shadow p-1 absolute bottom-4 left-4 rounded-secondary opacity-0 group-hover:opacity-100 transition-all"
      onClick={() => addToFavorite({ product: product?._id })}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <MdFavorite className={`w-5 h-5 text-gray-500`} />
      )}
    </button>
  );
}

function RemoveFromFavorite({ favorite }) {
  const user = useSelector((state) => state?.auth?.user);
  const [removeFromFavorite, { isLoading, data, error }] =
    useRemoveFromFavoriteMutation();

  useEffect(() => {
    if (isLoading) {
      toast.loading("در حال افزودن به علاقه‌مندی‌ها…", { id: "addToFavorite" });
    }

    if (data) {
      toast.success(data?.description, { id: "addToFavorite" });
    }

    if (error?.data) {
      toast.error(error?.data?.description, { id: "addToFavorite" });
    }
  }, [isLoading, data, error]);

  return (
    <button
      className="border border-transparent bg-white hover:border-gray-400 shadow p-1 absolute bottom-4 left-4 rounded-secondary opacity-0 group-hover:opacity-100 transition-all"
      onClick={() => removeFromFavorite({ id: favorite?._id })}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <MdFavorite className={`w-5 h-5 text-red-500`} />
      )}
    </button>
  );
}

export default Card;
