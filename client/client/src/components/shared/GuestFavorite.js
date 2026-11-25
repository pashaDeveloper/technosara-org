"use client";

import { useEffect, useState } from "react";
import { MdFavorite } from "react-icons/md";
import { toast } from "react-hot-toast";

const COOKIE = "guestFavorites";
const readFavorites = () => {
  try {
    const value = document.cookie.split("; ").find((part) => part.startsWith(`${COOKIE}=`));
    const ids = JSON.parse(decodeURIComponent(value?.slice(COOKIE.length + 1) || "[]"));
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export default function GuestFavorite({ product }) {
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    const update = () => setSelected(readFavorites().includes(product._id));
    update();
    window.addEventListener("guest-favorites-change", update);
    window.addEventListener("focus", update);
    return () => {
      window.removeEventListener("guest-favorites-change", update);
      window.removeEventListener("focus", update);
    };
  }, [product._id]);

  const toggle = () => {
    const ids = readFavorites();
    const exists = ids.includes(product._id);
    if (!exists && ids.length >= 100) {
      toast.error("ظرفیت علاقه‌مندی‌ها پر شده؛ ابتدا یک محصول را حذف کنید.");
      return;
    }
    const updated = exists ? ids.filter((id) => id !== product._id) : [...ids, product._id];
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(updated))}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    if (readFavorites().includes(product._id) !== !exists) {
      toast.error("برای ذخیره علاقه‌مندی، کوکی مرورگر را فعال کنید.");
      return;
    }
    window.dispatchEvent(new Event("guest-favorites-change"));
    toast.success(exists ? "از علاقه‌مندی‌ها حذف شد." : "به علاقه‌مندی‌ها اضافه شد.");
  };

  return (
    <button type="button" aria-label={selected ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"} aria-pressed={selected} onClick={toggle} className="absolute bottom-4 left-4 rounded-secondary border border-transparent bg-white p-1 shadow transition-all hover:border-gray-400 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100">
      <MdFavorite className={`h-5 w-5 ${selected ? "text-red-500" : "text-gray-500"}`} />
    </button>
  );
}
