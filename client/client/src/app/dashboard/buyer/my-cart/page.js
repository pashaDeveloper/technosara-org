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
import Trash from "@/components/icons/Trash";
import Dashboard from "@/components/shared/layouts/Dashboard";
import { useDeleteFromCartMutation } from "@/services/cart/cartApi";
import Image from "next/image";
import React, { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";

const Page = () => {
  const user = useSelector((state) => state.auth.user);
  const [removeFromCart, { isLoading, data, error }] =
    useDeleteFromCartMutation();

  useEffect(() => {
    if (isLoading) {
      toast.loading("در حال حذف محصول از سبد خرید…", { id: "removeFromCart" });
    }

    if (data) {
      toast.success(data?.description, { id: "removeFromCart" });
    }

    if (error?.data) {
      toast.error(error?.data?.description, { id: "removeFromCart" });
    }
  }, [isLoading, data, error]);

  return (
    <Dashboard>
      {!user?.cart?.length ? (
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
                    تعداد
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
                    دسته‌بندی
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    برند
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    فروشگاه
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                  >
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody>
                {user?.cart?.map(({ product, quantity, _id }) => (
                  <tr
                    key={product?._id}
                    className="odd:bg-white even:bg-gray-100 hover:odd:bg-gray-100"
                  >
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
                        {quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="whitespace-nowrap scrollbar-hide text-sm">
                        {formatToman(product?.price * quantity)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-4">
                        {product?.gallery.map((thumbnail) => (
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
                        {product?.category?.title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="whitespace-nowrap scrollbar-hide text-sm">
                        {product?.brand?.title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="whitespace-nowrap scrollbar-hide text-sm">
                        {product?.store?.title}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="submit"
                        className="bg-red-50 border border-red-900 p-0.5 rounded-secondary text-red-900"
                        onClick={() => removeFromCart(_id)}
                      >
                        <Trash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Dashboard>
  );
};

export default Page;
