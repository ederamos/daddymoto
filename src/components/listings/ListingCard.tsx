import Link from "next/link";
import Image from "next/image";
import { formatPrice, formatMileage, formatDate } from "@/lib/utils";
import type { ListingCard } from "@/types";

interface Props {
  listing: ListingCard;
}

export function ListingCard({ listing }: Props) {
  const title = listing.year && listing.make && listing.model
    ? `${listing.year} ${listing.make} ${listing.model}`
    : listing.title;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group flex flex-col hover:border-zinc-700 transition-all duration-200 hover:shadow-xl hover:shadow-black/30"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-zinc-800 overflow-hidden">
        {listing.cover_photo ? (
          <Image
            src={listing.cover_photo}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        {listing.status === "sold" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-black text-2xl tracking-widest rotate-[-15deg]">SOLD</span>
          </div>
        )}

        {/* Category pill */}
        <div className="absolute top-2 left-2">
          <span className="badge-zinc text-xs">{listing.category_name}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2 group-hover:text-white flex-1">
            {title}
          </h3>
          <span className="text-base font-bold text-red-400 whitespace-nowrap shrink-0">
            {formatPrice(listing.price, listing.price_obo)}
          </span>
        </div>

        {/* Mileage + condition */}
        {(listing.mileage || listing.condition) && (
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {listing.mileage && <span>{formatMileage(listing.mileage)}</span>}
            {listing.condition && (
              <span className="capitalize">{listing.condition}</span>
            )}
          </div>
        )}

        {/* Location + date */}
        <div className="flex items-center justify-between text-xs text-zinc-600 mt-auto pt-2 border-t border-zinc-800">
          {listing.city && listing.state ? (
            <span>{listing.city}, {listing.state}</span>
          ) : (
            <span>—</span>
          )}
          <span>{formatDate(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
