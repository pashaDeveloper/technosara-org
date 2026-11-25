"use client";

import HorizontalScroll from "../shared/HorizontalScroll";

export default function PlatformBadges({ platforms = [], value = "", onChange, className = "mb-5" }) {
  if (!platforms.length) return null;
  return (
    <div dir="rtl" className={`min-w-0 max-w-full ${className}`}>
      <HorizontalScroll label="انتخاب پلتفرم" className="items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
        {[{ id: "", title: "همه پلتفرم‌ها" }, ...platforms].map((platform) => (
          <button key={platform.id} type="button" aria-pressed={value === platform.id} onClick={() => onChange(platform.id)} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm ${value === platform.id ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400"}`}>
            {platform.title}
          </button>
        ))}
      </HorizontalScroll>
    </div>
  );
}
