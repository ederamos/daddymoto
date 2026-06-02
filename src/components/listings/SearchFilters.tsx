"use client";
import { useRouter, usePathname } from "next/navigation";
import { US_STATES, MAKES, CONDITIONS } from "@/lib/utils";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
  searchParams: Record<string, string | undefined>;
}

export function SearchFilters({ categories, searchParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v !== undefined)) as Record<string, string>
    );
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    router.push(pathname);
  }

  const hasFilters = Object.values(searchParams).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Filters</h2>
        {hasFilters && (
          <button onClick={clear} className="text-xs text-red-400 hover:text-red-300">
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="label">Category</label>
        <select
          className="select"
          value={searchParams.category || ""}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* State */}
      <div>
        <label className="label">State</label>
        <select
          className="select"
          value={searchParams.state || ""}
          onChange={(e) => update("state", e.target.value)}
        >
          <option value="">All states</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>

      {/* Make */}
      <div>
        <label className="label">Make</label>
        <select
          className="select"
          value={searchParams.make || ""}
          onChange={(e) => update("make", e.target.value)}
        >
          <option value="">All makes</option>
          {MAKES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div>
        <label className="label">Price</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            className="input"
            value={searchParams.price_min || ""}
            onChange={(e) => update("price_min", e.target.value)}
          />
          <input
            type="number"
            placeholder="Max"
            className="input"
            value={searchParams.price_max || ""}
            onChange={(e) => update("price_max", e.target.value)}
          />
        </div>
      </div>

      {/* Year */}
      <div>
        <label className="label">Year</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="From"
            className="input"
            min={1900}
            max={new Date().getFullYear() + 1}
            value={searchParams.year_min || ""}
            onChange={(e) => update("year_min", e.target.value)}
          />
          <input
            type="number"
            placeholder="To"
            className="input"
            min={1900}
            max={new Date().getFullYear() + 1}
            value={searchParams.year_max || ""}
            onChange={(e) => update("year_max", e.target.value)}
          />
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="label">Condition</label>
        <select
          className="select"
          value={searchParams.condition || ""}
          onChange={(e) => update("condition", e.target.value)}
        >
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="label">Sort by</label>
        <select
          className="select"
          value={searchParams.sort || "newest"}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="mileage_asc">Lowest mileage</option>
        </select>
      </div>
    </div>
  );
}
