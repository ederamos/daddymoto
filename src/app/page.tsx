import Link from "next/link";
import { query } from "@/lib/db";
import { ListingGrid } from "@/components/listings/ListingGrid";
import type { ListingCard, Category } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  sport: "⚡",
  cruiser: "⚓",
  adventure: "🗺️",
  dirt: "🌲",
  touring: "🧭",
  naked: "🏍️",
  scooter: "💨",
  electric: "🔋",
  parts: "🔧",
  gear: "🛡️",
  wanted: "🔍",
  other: "•••",
};

async function getRecentListings(): Promise<ListingCard[]> {
  try {
    const result = await query<ListingCard>(`
      SELECT
        l.id, l.title, l.price, l.price_obo, l.year, l.make, l.model,
        l.mileage, l.city, l.state, l.condition, l.created_at, l.status,
        c.name AS category_name, c.slug AS category_slug,
        (SELECT url FROM listing_photos WHERE listing_id = l.id ORDER BY sort_order LIMIT 1) AS cover_photo
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
      LIMIT 8
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const result = await query<Category>(
      "SELECT * FROM categories ORDER BY sort_order"
    );
    return result.rows;
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const result = await query<{ count: string }>(
      "SELECT COUNT(*) FROM listings WHERE status = 'active'"
    );
    return { activeListings: parseInt(result.rows[0]?.count || "0") };
  } catch {
    return { activeListings: 0 };
  }
}

export default async function HomePage() {
  const [listings, categories, stats] = await Promise.all([
    getRecentListings(),
    getCategories(),
    getStats(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-b border-zinc-800">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />

        <div className="page-container py-20 md:py-28 relative">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="badge-red text-xs uppercase tracking-widest font-bold">
                🏍 Moto Classifieds
              </span>
              {stats.activeListings > 0 && (
                <span className="text-xs text-zinc-500">
                  {stats.activeListings.toLocaleString()} active listings
                </span>
              )}
            </div>

            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-none mb-6">
              Find your next
              <span className="block text-red-500">ride.</span>
            </h1>

            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              The best classifieds for motorcycle enthusiasts. Real sellers,
              real bikes, real gear — no corporate noise.
            </p>

            {/* Search bar */}
            <form action="/search" className="flex gap-2">
              <input
                name="q"
                type="search"
                placeholder="Search by make, model, or keyword…"
                className="input flex-1 text-base py-3"
              />
              <button type="submit" className="btn-primary px-6 py-3">
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-2 mt-4">
              {["Honda CB750", "Ducati Monster", "KTM 390", "Harley Sportster", "Kawasaki Ninja"].map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 border-b border-zinc-800">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Browse by Category</h2>
            <Link href="/categories" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-150 text-center group"
              >
                <span className="text-2xl">{CATEGORY_ICONS[cat.slug] || "•"}</span>
                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent listings */}
      <section className="py-12">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Just Listed</h2>
            <Link href="/listings" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Browse all →
            </Link>
          </div>
          <ListingGrid listings={listings} emptyMessage="No listings yet — be the first to post!" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-zinc-800 bg-zinc-900/50">
        <div className="page-container text-center">
          <h2 className="text-3xl font-black tracking-tight text-white mb-3">
            Got something to sell?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            List your bike, parts, or gear in minutes. Free to post, seen by riders everywhere.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/post" className="btn-primary px-8 py-3 text-base">
              Post a Free Listing
            </Link>
            <Link href="/auth/register" className="btn-outline px-8 py-3 text-base">
              Create an Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
