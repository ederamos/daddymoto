import { ListingCard } from "./ListingCard";
import type { ListingCard as ListingCardType } from "@/types";

interface Props {
  listings: ListingCardType[];
  emptyMessage?: string;
}

export function ListingGrid({ listings, emptyMessage = "No listings found." }: Props) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
