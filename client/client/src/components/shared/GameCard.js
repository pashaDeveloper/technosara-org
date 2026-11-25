import Image from "next/image";
import Link from "next/link";
import StarRating from "./StarRating";

export default function GameCard({ game, compact = false }) {
  return (
    <Link href={`/game?game_id=${encodeURIComponent(game._id)}`} className={`flex min-w-0 flex-col gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${compact ? "w-44 shrink-0 snap-start md:w-56" : ""}`}>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        {game.image ? <Image src={game.image} alt="" fill unoptimized className="object-cover" /> : <div aria-hidden="true" className="absolute inset-0 bg-gray-200 motion-safe:animate-pulse" />}
        <div className="absolute bottom-2 left-2 flex rounded-md bg-black/75 px-2 py-1">
          <StarRating rating={(typeof game.rating === "number" ? game.rating : game.rating?.mean || 0) * 5} />
        </div>
      </div>
      <h3 title={game.title} dir="auto" className="truncate text-left text-sm font-bold md:text-base">{game.title}</h3>
    </Link>
  );
}
