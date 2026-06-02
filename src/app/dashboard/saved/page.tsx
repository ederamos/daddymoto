import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { ListingGrid } from "@/components/listings/ListingGrid";
import type { ListingCard } from "@/types";

async function getSavedListings(userId: string): Promise<ListingCard[]> {
  const result = await query<ListingCard>(`
    SELECT
      l.id, l.title, l.price, l.price_obo, l.year, l.make, l.model,
      l.mileage, l.city, l.state, l.condition, l.created_at, l.status,
      c.name AS category_name, c.slug AS category_slug,
      (SELECT url FROM listing_photos WHERE listing_id = l.id ORDER BY sort_order LIMIT 1) AS cover_photo
    FROM saved_listings s
    JOIN listings l ON l.id = s.listing_id
    JOIN categories c ON c.id = l.category_id
    WHERE s.user_id = $1
    ORDER BY s.created_at DESC
  `, [userId]);
  return result.rows;
}

export default async function SavedListingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  const userId = (session.user as { id: string }).id;
  const listings = await getSavedListings(userId);

  return (
    <div className="page-container py-10">
      <h1 className="text-2xl font-black tracking-tight text-white mb-8">Saved Listings</h1>
      <ListingGrid listings={listings} emptyMessage="You haven't saved any listings yet." />
    </div>
  );
}
