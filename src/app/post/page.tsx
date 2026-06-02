"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { US_STATES, MAKES, CONDITIONS } from "@/lib/utils";
import type { Category } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR + 1 - i);

export default function PostListingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category_id: "", title: "", description: "",
    price: "", price_obo: false,
    year: "", make: "", model: "", mileage: "", engine_cc: "",
    color: "", condition: "", vin: "",
    city: "", state: "", zip: "",
  });

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { router.push("/auth/login"); return; }
    setUploading(true);
    setError("");

    try {
      // 1. Create listing
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create listing.");
      }
      const { id: listingId } = await res.json();

      // 2. Upload photos
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type, listingId }),
        });
        if (!uploadRes.ok) continue;
        const { uploadUrl, publicUrl, key } = await uploadRes.json();

        // Upload to R2
        await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

        // Save photo record
        await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, url: publicUrl, key, sortOrder: i }),
        });
      }

      router.push(`/listings/${listingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setUploading(false);
    }
  }

  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 mb-3">Sign in to post a listing</h1>
          <p className="text-zinc-500 mb-6">You need an account to sell on Daddy Moto.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth/login" className="btn-primary">Sign in</Link>
            <Link href="/auth/register" className="btn-outline">Create account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-10 max-w-2xl">
      <h1 className="text-2xl font-black tracking-tight text-white mb-2">Post a Listing</h1>
      <p className="text-zinc-500 mb-8">Fill out the details below. More info = more inquiries.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Category + Title */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Listing Info</h2>
          <div>
            <label className="label">Category *</label>
            <select className="select" value={form.category_id} onChange={(e) => set("category_id", e.target.value)} required>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Listing Title *</label>
            <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 2019 Kawasaki Z900 ABS — clean title" required maxLength={255} />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea className="input resize-none" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the bike, its history, condition, mods, what comes with it…" required />
          </div>
        </div>

        {/* Price */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Price</h2>
          <div>
            <label className="label">Asking Price (USD)</label>
            <input type="number" className="input" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Leave blank for Make Offer" min={0} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-600 bg-zinc-800 text-red-500" checked={form.price_obo} onChange={(e) => set("price_obo", e.target.checked)} />
            <span className="text-sm text-zinc-300">Or best offer (OBO)</span>
          </label>
        </div>

        {/* Specs */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Specs</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Year</label>
              <select className="select" value={form.year} onChange={(e) => set("year", e.target.value)}>
                <option value="">—</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Make</label>
              <select className="select" value={form.make} onChange={(e) => set("make", e.target.value)}>
                <option value="">—</option>
                {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. CBR600RR" />
            </div>
            <div>
              <label className="label">Mileage</label>
              <input type="number" className="input" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} placeholder="miles" min={0} />
            </div>
            <div>
              <label className="label">Engine (cc)</label>
              <input type="number" className="input" value={form.engine_cc} onChange={(e) => set("engine_cc", e.target.value)} placeholder="e.g. 600" min={0} />
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="e.g. Matte Black" />
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="select" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
                <option value="">—</option>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">VIN (optional)</label>
              <input className="input" value={form.vin} onChange={(e) => set("vin", e.target.value)} placeholder="17 characters" maxLength={17} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Location</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label className="label">State</label>
              <select className="select" value={form.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">—</option>
                {US_STATES.map(([code]) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="input" value={form.zip} onChange={(e) => set("zip", e.target.value)} maxLength={10} />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Photos</h2>
          <p className="text-xs text-zinc-500">First photo will be the cover. Max 10 photos.</p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer"
            onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 10))}
          />
          {photos.length > 0 && (
            <p className="text-xs text-zinc-500">{photos.length} photo{photos.length !== 1 ? "s" : ""} selected</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={uploading} className="btn-primary w-full py-4 text-base">
          {uploading ? "Posting…" : "Publish Listing"}
        </button>
      </form>
    </div>
  );
}
