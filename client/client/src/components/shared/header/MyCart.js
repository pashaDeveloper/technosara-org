import Rows from "@/components/shared/skeletonLoading/Rows";
import StarRating from "@/components/shared/StarRating";
/**
 * Title: Write a program using JavaScript on Cart
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
 * Date: 13, November 2023
 */

import { formatToman } from "@/libs/currency";
import Cart from "@/components/icons/Cart";
import React, { useEffect, useRef, useState } from "react";
import OutsideClick from "../OutsideClick";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import Trash from "@/components/icons/Trash";
import { useAddToCartMutation, useDeleteFromCartMutation } from "@/services/cart/cartApi";
import { removeGuestItem, setCart } from "@/features/cart/cartSlice";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useCreatePaymentMutation } from "@/services/payment/paymentApi";

const MyCart = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const guestCart = useSelector((state) => state.cart.cart);
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);
  const syncing = useRef(false);
  const [addToCart] = useAddToCartMutation();
  const cart = user?._id ? [...(user.cart || []), ...guestCart] : guestCart;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("guestCart") || "[]");
      if (Array.isArray(saved)) {
        dispatch(setCart(saved.filter((item) => item?.product?._id &&
          Number.isInteger(item.quantity) && item.quantity > 0)));
      }
    } catch {
      // Ignore invalid or unavailable browser storage.
    }
    setReady(true);
  }, [dispatch]);

  useEffect(() => {
    if (!ready || !user?._id || !guestCart.length || syncing.current) return;
    syncing.current = true;
    const sync = async () => {
      try {
        for (const item of guestCart) {
          await addToCart({ product: item.product._id, quantity: item.quantity }).unwrap();
          dispatch(removeGuestItem(item._id));
        }
      } catch {
        toast.error("انتقال سبد خرید انجام نشد. صفحه را دوباره بارگذاری کنید.");
      } finally {
        syncing.current = false;
      }
    };
    sync();
  }, [ready, user?._id, guestCart, addToCart, dispatch]);
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
    <>
      <button
        aria-label="سبد خرید"
        className="flex h-10 w-10 aspect-square shrink-0 items-center justify-center p-2 rounded-secondary hover:bg-slate-100 transition-colors relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Cart className="h-6 w-6" />

        {cart.length > 0 && (
          <span className="h-2 w-2 bg-red-500 rounded-secondary absolute top-1 right-1"></span>
        )}
      </button>

      {isOpen && (
        <OutsideClick
          onOutsideClick={() => setIsOpen(false)}
          className="absolute top-full end-0 w-80 h-96 overflow-y-auto bg-white border rounded p-4 flex flex-col gap-y-2.5"
        >
          <div className="w-full h-full flex flex-col gap-y-8">
            {cart.length === 0 ? (
              <Rows />
            ) : (
              <div className="h-full w-full flex flex-col gap-y-4">
                <div className="h-full overflow-y-auto scrollbar-hide">
                  {cart.map(({ product, quantity, _id }) => (
                    <div
                      key={_id}
                      className="flex flex-row gap-x-2 transition-all border border-transparent p-2 rounded hover:border-gray-400 group relative"
                    >
                      <Image
                        src={product?.thumbnail?.url}
                        alt={product?.thumbnail?.public_id}
                        width={50}
                        height={50}
                        className="rounded h-[50px] w-[50px] object-cover"
                      />
                      <article className="flex min-w-0 flex-1 flex-col gap-y-2">
                        <div className="flex flex-col gap-y-0.5">
                          <h2 className="text-base line-clamp-1">
                            {product?.title}
                          </h2>
                          <p className="text-xs line-clamp-1">
                            {product?.summary}
                          </p>
                          <StarRating reviews={product?.reviews} />
                        </div>
                        <div className="flex flex-col gap-y-1">
                          <p className="flex flex-row justify-between">
                            <span className="text-xs flex flex-row gap-x-0.5 items-baseline">

                              <span className="text-sm text-black">
                                {formatToman(product?.price * quantity)}
                              </span>
                            </span>
                            <span className="text-xs flex flex-row gap-x-0.5 items-baseline">
                              تعداد
                              <span className="text-sm text-black">
                                {quantity}
                              </span>
                            </span>
                          </p>
                          <div className="flex flex-row gap-x-1">
                            <span className="whitespace-nowrap text-[10px] bg-purple-300/50 text-purple-500 border border-purple-500 px-1.5 rounded">
                              {product?.store?.title}
                            </span>
                            <span className="whitespace-nowrap text-[10px] bg-indigo-300/50 text-indigo-500 border border-indigo-500 px-1.5 rounded">
                              {product?.brand?.title}
                            </span>
                            <span className="whitespace-nowrap text-[10px] bg-blue-300/50 text-blue-500 border border-blue-500 px-1.5 rounded">
                              {product?.category?.title}
                            </span>
                          </div>
                        </div>
                      </article>

                      <button
                        type="button"
                        className="md:opacity-0 transition-opacity group-hover:opacity-100 absolute top-2 right-2 border p-1 rounded-secondary bg-red-100 text-red-900 border-red-900"
                        onClick={() => guestCart.some((item) => item._id === _id)
                          ? dispatch(removeGuestItem(_id)) : removeFromCart(_id)}
                      >
                        <Trash />
                      </button>
                    </div>
                  ))}
                </div>
                {user?._id ? (
                  <Purchase cart={user.cart || []} disabled={guestCart.length > 0} />
                ) : (
                  <Link href="/auth/signin" className="rounded-secondary bg-black px-4 py-2 text-center text-white">
                    ورود و ادامه خرید
                  </Link>
                )}
              </div>
            )}
          </div>
        </OutsideClick>
      )}
    </>
  );
};

function Purchase({ cart, disabled }) {
  const [createPayment, { isLoading, data, error }] =
    useCreatePaymentMutation();

  useEffect(() => {
    if (isLoading) {
      toast.loading("در حال آماده‌سازی پرداخت…", { id: "createPayment" });
    }

    if (data) {
      toast.success(data?.description, { id: "createPayment" });
      window.open(data?.url, "_blank");
    }

    if (error?.data) {
      toast.error(error?.data?.description, { id: "createPayment" });
    }
  }, [isLoading, data, error]);

  const result = cart.map(
    ({
      product: { title, thumbnail, price, summary, _id: pid },
      quantity,
      _id: cid,
    }) => ({
      name: title,
      quantity,
      price,
      thumbnail: thumbnail?.url,
      description: summary,
      pid,
      cid,
    })
  );

  return (
    <>
      <button
        type="button"
        disabled={disabled || isLoading || cart.length === 0}
        className="px-8 py-2 border border-black rounded-secondary bg-black hover:bg-black/90 text-white transition-colors drop-shadow flex flex-row gap-x-2 items-center justify-center"
        onClick={() => createPayment(result)}
      >
        پرداخت
      </button>
      <p className="text-xs leading-6">مبلغ نهایی درگاه Stripe به دلار دریافت می‌شود.</p>
    </>
  );
}

export default MyCart;
