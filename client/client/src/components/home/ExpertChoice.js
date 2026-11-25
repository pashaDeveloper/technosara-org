/**
 * Title: Write a program using JavaScript on ExpertChoice
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
import React, { useEffect, useMemo } from "react";
import Container from "../shared/Container";
import Image from "next/image";
import StarRating from "../shared/StarRating";
import { useRouter } from "next/navigation";
import { useGetProductsQuery } from "@/services/product/productApi";
import ExpertCard from "../shared/skeletonLoading/ExpertCard";
import { toast } from "react-hot-toast";

const ExpertChoice = ({ className }) => {
  const router = useRouter();

  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
  } = useGetProductsQuery();
  const products = useMemo(() => productsData?.data || [], [productsData]);

  useEffect(() => {
    if (productsError) {
      toast.error(productsError?.data?.description, { id: "expert-choice" });
    }
  }, [productsError]);

  return (
    <Container className={className ? className : ""}>
      <section className="flex flex-col gap-y-10">
        <h1 className="text-4xl">
          محبوب‌ترین‌ها
        </h1>

        <div className="grid grid-cols-2 gap-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-4">
          {productsLoading || !products?.length ? (
            <>
              {[1, 2, 3, 4].map((_, index) => (
                <ExpertCard key={index} />
              ))}
            </>
          ) : (
            <>
              {products?.slice(-8)?.map((product, index) => (
                <div
                  key={index}
                  className="flex min-w-0 flex-col gap-y-3 border p-2 md:gap-y-4 md:p-4 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/product?product_id=${
                        product?._id
                      }&product_title=${product.title
                        .replace(/ /g, "-")
                        .toLowerCase()}}`
                    )
                  }
                >
                  <div className="grid aspect-square grid-cols-12 grid-rows-6 gap-2 overflow-hidden rounded-md bg-white">
                    {product.gallery.map((thumbnail, idx) => (
                      <Image
                        key={idx}
                        src={thumbnail?.url}
                        alt={thumbnail?.public_id}
                        width={296}
                        height={200}
                        quality={90}
                        sizes="(max-width: 767px) 50vw, (max-width: 1024px) 50vw, 320px"
                        className={`${
                          product.gallery.length === 1
                            ? "col-span-12 row-span-6"
                            : product.gallery.length === 2
                            ? "col-span-12 row-span-3"
                            : product.gallery.length === 3
                            ? idx === 0
                              ? "col-span-12 row-span-3"
                              : "col-span-6 row-span-3"
                            : product.gallery.length === 4
                            ? "col-span-6 row-span-3"
                            : idx <= 1
                            ? "col-span-6 row-span-3"
                            : "col-span-4 row-span-3"
                        } h-full w-full bg-white object-contain rounded-md`}
                      />
                    ))}
                  </div>

                  <article className="flex min-w-0 flex-col gap-y-3.5">
                    <div className="flex min-w-0 flex-col gap-y-2 md:gap-y-4">
                      <h2 className="truncate text-sm md:text-base">{product?.title}</h2>
                      <p title={product?.summary} className="line-clamp-1 text-xs leading-5 text-gray-500">{product?.summary}</p>
                      <div className="flex flex-row flex-wrap gap-2 items-end justify-between">
                        <span className="flex items-center border-2 border-green-500 rounded py-1 px-1.5 md:py-1.5 md:px-2.5 text-xs md:text-sm font-medium">
                          <span className="text-green-500 !leading-none">
                            {formatToman(product?.price)}
                          </span>
                        </span>
                        <StarRating reviews={product?.reviews} />
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </Container>
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

export default ExpertChoice;
