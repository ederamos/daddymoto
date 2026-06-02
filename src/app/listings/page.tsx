import { query } from "@/lib/db";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { SearchFilters } from "@/components/listings/SearchFilters";
import type { ListingCard, Category } from "@/types";

interface PageProps {
  searchParams: { [key: string]: string | undefined };
}

async function getListings(params: PageProps["searchParams"]): Promise<ListingCard[]> {
  const conditions: string[] = ["l.status = 'active'"];
  const values: unknown[] = [];
  let idx = 1;

  if (params.category) {
    conditions.push(`c.slug = $${idx++}`);
    values.push(params.category);
  }
  if (params.state) {
    conditions.push(`l.state = $${idx++}`);
    values.push(params.state);
  }
  if (params.make) {
    conditions.push(`l.make ILIKE $${idx++}`);
    values.push(params.make);
  }
  if (params.price_min) {
    conditions.push(`l.price >= $${idx++}`);
    values.push(parseInt(params.price_min) * 100);
  }
  if (params.price_max) {
    conditions.push(`l.price <= $${idx++}`);
    values.push(parseInt(params.price_max) * 100);
  }
  if (params.year_min) {
    conditions.push(`l.year >= $${idx++}`);
    values.push(parseInt(params.year_min));
  }
  if (params.year_max) {
    conditions.push(`l.year <= $${idx++}`);
    values.push(parseInt(params.year_max));
  }
  if (params.condition) {
    conditions.push(`l.condition = $${idx++}`);
    values.push(params.condition);
  }
  if (params.q) {
    conditions.push(`to_tsvector('english', coalesce(l.title,'') || ' ' || coalesce(l.make,'') || ' ' || coalesce(l.model,'') || ' ' || coalesce(l.description,'')) @@ plainto_tsquery('english', $${idx++})`);
    values.push(params.q);
  }

  const orderMap: Record<string, string> = {
    newest:     "l.created_at DESC",
    price_asc:  "l.price ASC NULLS LAST",
    price_desc: "l.price DESC NULLS LAST",
    mileage_asc:"l.mileage ASC NULLS LAST",
  };
  const order = orderMap[params.sort || "newest"] || "l.created_at DESC";

  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 24;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT
      l.id, l.title, l.price, l.price_obo, l.year, l.make, l.model,
      l.mileage, l.city, l.state, l.condition, l.created_at, l.status,
      c.name AS category_name, c.slug AS category_slug,
      (SELECT url FROM listing_photos WHERE listing_id = l.id ORDER BY sort_order LIMIT 1) AS cover_photo
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${order}
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    const result = await query<ListingCard>(sql, values);
    return result.rows;
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const result = await query<Category>("SELECT * FROM categories ORDER BY sort_order");
    return result.rows;
  } catch {
    return [];
  }
}

export default async function ListingsPage({ searchParams }: PageProps) {
  const [listings, categories] = await Promise.all([
    getListings(searchParams),
    getCategories(),
  ]);

  return (
    <div className="page-container py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="lg:w-64 shrink-0">
          <SearchFilters categories={categories} searchParams={searchParams} />
        </aside>

        {/* Listings */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-zinc-100">
              {searchParams.category
                ? categories.find((c) => c.slug === searchParams.category)?.name || "Listings"
                : "All Listings"}
            </h1>
            <span className="text-sm text-zinc-500">{listings.length} results</span>
          </div>
          <ListingGrid listings={listings} />
        </div>
      </div>
    </div>
  );
}
