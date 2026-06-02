import Link from "next/link";
import { query } from "@/lib/db";
import type { Category } from "@/types";

const ICONS: Record<string, string> = {
  sport: "⚡", cruiser: "⚓", adventure: "🗺️", dirt: "🌲",
  touring: "🧭", naked: "🏍️", scooter: "💨", electric: "🔋",
  parts: "🔧", gear: "🛡️", wanted: "🔍", other: "•••",
};

async function getCategoriesWithCounts() {
  try {
    const result = await query(`
      SELECT c.*, COUNT(l.id) FILTER (WHERE l.status = 'active') AS listing_count
      FROM categories c
      LEFT JOIN listings l ON l.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order
    `);
    return result.rows as (Category & { listing_count: string })[];
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <div className="page-container py-10">
      <h1 className="text-2xl font-black tracking-tight text-white mb-2">Browse by Category</h1>
      <p className="text-zinc-500 mb-8">Find exactly what you&apos;re looking for.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/listings?category=${cat.slug}`}
            className="card p-6 flex flex-col items-center text-center gap-3 hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-150 group"
          >
            <span className="text-4xl">{ICONS[cat.slug] || "•"}</span>
            <div>
              <h2 className="font-semibold text-zinc-200 group-hover:text-white">{cat.name}</h2>
              {cat.description && (
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{cat.description}</p>
              )}
            </div>
            <span className="text-xs text-zinc-600 mt-auto">
              {parseInt(cat.listing_count) || 0} listing{parseInt(cat.listing_count) !== 1 ? "s" : ""}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
