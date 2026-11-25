import Image from "next/image";
import Link from "next/link";
import StarRating from "./StarRating";

export default function GameCard({ game, compact = false }) {
  return (
    <Link href={`/game?game_id=${encodeURIComponent(game._id)}`} aria-label={game.title} className={`flex min-w-0 gap-3 rounded-lg border bg-white p-2 transition-colors hover:border-gray-400 ${compact ? "w-36 shrink-0 snap-start flex-col md:w-40" : "items-center md:flex-col md:items-stretch md:p-3"}`}>
      <div className={`relative aspect-square shrink-0 overflow-hidden rounded-md bg-gray-100 ${compact ? "w-full" : "w-24 md:w-full"}`}>
        {game.image ? <Image src={game.image} alt={game.title} fill unoptimized className="object-cover" /> : <div aria-hidden="true" className="absolute inset-0 bg-gray-200 motion-safe:animate-pulse" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 title={game.title} className={`truncate font-bold ${compact ? "text-xs md:text-sm" : "text-sm md:text-base"}`}>{game.title}</h3>
        <p title={game.summary} className="truncate text-xs leading-5 text-gray-500">{game.summary}</p>
        <StarRating rating={(typeof game.rating === "number" ? game.rating : game.rating?.mean || 0) * 5} />
      </div>
    </Link>
  );
}
