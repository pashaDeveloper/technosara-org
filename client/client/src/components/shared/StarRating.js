import { AiFillStar } from "react-icons/ai";

export default function StarRating({ reviews = [], rating }) {
  const ratings = reviews.map((review) => Number(review?.rating))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  const average = rating == null
    ? (ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0)
    : Number(rating);
  const score = Number.isFinite(average) ? Math.min(5, Math.max(0, average)) : 0;
  const label = score ? `امتیاز ${score.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از ۵` : "هنوز امتیازی ثبت نشده";

  return (
    <span role="img" aria-label={label} title={label} dir="ltr" className="inline-flex shrink-0 items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true" className="relative block h-3.5 w-3.5 md:h-4 md:w-4">
          <AiFillStar className="h-full w-full text-gray-200" />
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.min(1, Math.max(0, score - index)) * 100}%` }}>
            <AiFillStar className="h-3.5 w-3.5 max-w-none text-[#ffc242] md:h-4 md:w-4" />
          </span>
        </span>
      ))}
    </span>
  );
}
