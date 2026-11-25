/**
 * Title: Write a program using JavaScript on Description
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

import Rows from "@/components/shared/skeletonLoading/Rows";
import React, { useEffect, useState } from "react";
import DetailCard from "./DetailCard";
import Modal from "../shared/Modal";
import Image from "next/image";
import { useAddReviewMutation } from "@/services/review/reviewApi";
import { toast } from "react-hot-toast";
import StarRating from "../shared/StarRating";

const Description = ({ product }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [addReview, { isLoading, data, error }] = useAddReviewMutation();

  useEffect(() => {
    if (isLoading) {
      toast.loading("در حال ثبت دیدگاه…", { id: "addReview" });
    }

    if (data) {
      toast.success(data?.description, { id: "addReview" });
    }
    if (error?.data) {
      toast.error(error?.data?.description, { id: "addReview" });
    }
  }, [isLoading, data, error]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await addReview({
        product: product?._id,
        rating: Number(form.rating.value),
        comment: form.comment.value,
      }).unwrap();
      form.reset();
    } catch {
      // Preserve the draft so the visitor can retry after an API error.
    }
  };

  return (
    <section className="flex flex-col gap-y-2.5">
      <div className="flex flex-row gap-x-2 items-center">
        <span className="whitespace-nowrap text-sm text-black">
          جزئیات محصول
        </span>
        <hr className="w-full" />
      </div>
      <article className="flex flex-col gap-y-4">
        <p className="text-sm">{product?.summary}</p>
        <button
          className="px-8 py-2 border border-black rounded-secondary bg-black hover:bg-black/90 text-white transition-colors drop-shadow w-fit flex flex-row gap-x-2 items-center"
          onClick={() => setIsOpen(!isOpen)}
        >
          دیدگاه‌ها
        </button>
        <div className="flex flex-row gap-x-2 items-center">
          <span className="whitespace-nowrap text-sm text-black">
            ویژگی‌ها و شرایط محصول
          </span>
          <hr className="w-full" />
        </div>
        <div className="flex flex-col gap-y-4">
          {product?.features?.map((explanation, index) => (
            <DetailCard
              key={index}
              title={explanation?.title}
              content={explanation?.content}
            />
          ))}
        </div>
      </article>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          className="p-6 lg:w-1/3 md:w-1/2 w-full h-96"
        >
          <section className="h-full flex flex-col gap-y-6">
            <form
              action=""
              className="flex flex-row gap-x-2 items-center"
              onSubmit={handleAddReview}
            >
              <input
                type="text"
                name="comment"
                required
                maxLength={200}
                id="comment"
                placeholder="دیدگاه خود را بنویسید…"
                className="w-full text-sm"
              />
              <input
                type="number"
                name="rating"
                required
                step="1"
                id="rating"
                min="1"
                max="5"
                placeholder="امتیاز"
                className="w-fit text-sm"
              />
              <input
                type="submit"
                disabled={isLoading}
                value="ثبت دیدگاه"
                className="text-sm p-2 border bg-black text-white rounded cursor-pointer"
              />
            </form>

            {!product?.reviews?.length ? (
              <Rows />
            ) : (
              <div className="h-full overflow-y-auto scrollbar-hide flex flex-col gap-y-4">
                {product?.reviews?.map((review, index) => (
                  <article
                    key={index}
                    className="flex flex-col gap-y-2 p-4 bg-slate-50 rounded"
                  >
                    <div className="flex flex-row gap-x-2">
                      {review?.reviewer?.avatar?.url ? <Image
                        src={review?.reviewer?.avatar?.url}
                        alt={review?.reviewer?.avatar?.public_id}
                        width={40}
                        height={40}
                        className="rounded object-cover h-[40px] w-[40px]"
                      /> : <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-pink-100 text-sm text-pink-700">م</div>}
                      <div className="flex flex-col gap-y-1">
                        <h2 className="text-base">{review?.reviewer?.name || "کاربر مهمان"}</h2>
                        <p className="text-xs">{review?.reviewer?.email}</p>
                        <p className="text-xs">
                          {new Date(review?.createdAt).toLocaleDateString(
                            "fa-IR"
                          )}{" "}
                        </p>
                        <StarRating rating={review?.rating} />
                      </div>
                    </div>
                    <p className="text-sm">{review?.comment}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </Modal>
      )}
    </section>
  );
};

export default Description;
