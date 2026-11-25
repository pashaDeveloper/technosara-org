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
 * Date: 14, January 2024
 */

"use client";

import Rows from "@/components/shared/skeletonLoading/Rows";
import { formatToman } from "@/libs/currency";
import { persianLabel } from "@/libs/persian";
import Dashboard from "@/components/shared/layouts/Dashboard";
import Image from "next/image";
import React from "react";
import { useSelector } from "react-redux";

const Page = () => {
  const user = useSelector((state) => state.auth.user);

  return (
    <Dashboard>
      {!user?.purchases?.length ? (
        <Rows />
      ) : (
        <section className="w-full h-full">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-100">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    شناسه مشتری
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    شناسه سفارش
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    تصویر
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    عنوان
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    قیمت (تومان)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    گالری تصاویر
                  </th>
                  
                  
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    تعداد
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    قیمت کل (تومان)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    وضعیت
                  </th>
                </tr>
              </thead>
              <tbody>
                {user?.purchases?.map(
                  ({
                    customerId,
                    orderId,
                    products,
                    _id,
                    totalAmount,
                    status,
                  }) =>
                    products?.map(({ product, quantity }) => (
                      <tr
                        key={_id}
                        className="odd:bg-white even:bg-gray-100 hover:odd:bg-gray-100"
                      >
                        <td className="px-6 py-4">
                          <span className="whitespace-nowrap w-60 overflow-x-auto block scrollbar-hide text-sm">
                            {customerId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="whitespace-nowrap w-60 overflow-x-auto block scrollbar-hide text-sm">
                            {orderId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Image
                            src={product?.thumbnail?.url}
                            alt={product?.thumbnail?.public_id}
                            height={30}
                            width={30}
                            className="h-[30px] w-[30px] rounded-secondary border border-green-500/50 object-cover"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="whitespace-nowrap w-60 overflow-x-auto block scrollbar-hide text-sm">
                            {product?.title}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="whitespace-nowrap scrollbar-hide text-sm">
                            {formatToman(product?.price)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex -space-x-4">
                            {product?.gallery?.map((thumbnail) => (
                              <Image
                                key={thumbnail?._id}
                                src={thumbnail?.url}
                                alt={thumbnail?.public_id}
                                height={30}
                                width={30}
                                className="h-[30px] w-[30px] rounded-secondary border border-green-500/50 object-cover"
                              />
                            ))}
                          </div>
                        </td>
                        
                        
                        <td className="px-6 py-4">
                          <span className="whitespace-nowrap scrollbar-hide text-sm">
                            {quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="whitespace-nowrap scrollbar-hide text-sm">
                            {formatToman(totalAmount / 100)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {status === "pending" && (
                            <span className="bg-red-50 border border-red-900 px-2 rounded-secondary text-red-900 text-xs uppercase">
                              {persianLabel(status)}
                            </span>
                          )}
                          {status === "delivered" && (
                            <span className="bg-green-50 border border-green-900 px-2 rounded-secondary text-green-900 text-xs uppercase">
                              {persianLabel(status)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Dashboard>
  );
};

export default Page;
