import { formatNumber } from "./gameDetailMedia";

export default function GameRatings({ rating }) {
  let scores = rating;
  if (typeof rating === "string") {
    try { scores = JSON.parse(rating); } catch { return null; }
  }
  const validScore = (value) => Number.isFinite(value) && value >= 0 && value <= 1;
  if (!validScore(scores?.mean)) return null;
  const stars = Math.round(scores.mean * 5);

  return (
    <section className="edge-panel edge-reviews" aria-labelledby="game-ratings-title">
      <h2 id="game-ratings-title">ارزیابی بازی</h2>
      <div className="edge-review-score">
        <div>
          <strong>{formatNumber.format(scores.mean * 10)}</strong>
          <span>
            <b aria-label={`${formatNumber.format(stars)} از ۵ ستاره`}>{"★".repeat(stars) + "☆".repeat(5 - stars)}</b>
            {Number.isFinite(scores.count) && <small>{formatNumber.format(scores.count)} ارزیابی</small>}
          </span>
        </div>
        {[["mean", "کلی"], ["mean_players", "کاربران"], ["mean_critics", "منتقدان"]].map(([key, label]) => (
          validScore(scores[key]) && <div className="edge-rating-row" key={key}>
            <span>{label} <em>{formatNumber.format(scores[key] * 10)} از ۱۰</em></span>
            <i aria-hidden="true"><b style={{ width: `${scores[key] * 100}%` }} /></i>
          </div>
        ))}
      </div>
    </section>
  );
}
