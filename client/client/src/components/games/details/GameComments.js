import { FiMessageSquare, FiUser } from "react-icons/fi";
import Rows from "@/components/shared/skeletonLoading/Rows";
import { asArray, formatNumber } from "./gameDetailMedia";

export default function GameComments({ reviews }) {
  const comments = asArray(reviews).filter((review) => typeof review?.comment === "string" && review.comment.trim());

  return (
    <section className="edge-panel edge-game-comments" aria-labelledby="game-comments-title">
      <h2 id="game-comments-title"><FiMessageSquare aria-hidden="true" /> نظرات کاربران</h2>
      {comments.length ? (
        <ul className="edge-comment-list">
          {comments.slice(0, 3).map((review, index) => (
            <li key={review._id ?? index}>
              <div className="edge-comment-author">
                <FiUser aria-hidden="true" />
                <bdi>{review.reviewer?.name || "کاربر"}</bdi>
                {Number.isFinite(review.rating) && <span>★ {formatNumber.format(review.rating)}</span>}
              </div>
              <p dir="auto">{review.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Rows count={2} />
      )}
    </section>
  );
}
