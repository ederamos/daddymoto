"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ListingPhotoEditor from "@/components/listings/ListingPhotoEditor";
import { US_STATES, MAKES, CONDITIONS } from "@/lib/utils";
import type { Category, Listing } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR + 1 - i);

export default function EditListingPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
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
    fetch(`/api/listings/${params.id}/detail`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load listing.");
        return data;
      })
      .then((data: Listing) => {
        setListing(data);
        setForm({
          category_id: String(data.category_id),
          title: data.title,
          description: data.description,
          price: data.price != null ? String(data.price / 100) : "",
          price_obo: data.price_obo,
          year: data.year ? String(data.year) : "",
          make: data.make || "",
          model: data.model || "",
          mileage: data.mileage ? String(data.mileage) : "",
          engine_cc: data.engine_cc ? String(data.engine_cc) : "",
          color: data.color || "",
          condition: data.condition || "",
          vin: data.vin || "",
          city: data.city || "",
          state: data.state || "",
          zip: data.zip || "",
        });
        setLoading(false);
      })
      .catch((err) => { setError(err instanceof Error ? err.message : "Could not load listing."); setLoading(false); });
  }, [params.id]);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveListing(method: "PATCH" | "DELETE", body?: unknown) {
    if (photoBusy || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${params.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save listing. Please try again.");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save listing. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveListing("PATCH", form);
  }

  async function changeStatus(newStatus: string) {
    if (photoBusy || saving) return;
    if (!confirm(`Mark this listing as "${newStatus}"?`)) return;
    await saveListing("PATCH", { status: newStatus });
  }

  async function deleteListing() {
    if (photoBusy || saving) return;
    if (!confirm("Permanently delete this listing? This cannot be undone.")) return;
    await saveListing("DELETE");
  }

  if (status === "loading" || loading) return <div className="page-container py-20 text-center text-zinc-600">Loading…</div>;
  if (!session) { router.push("/auth/login"); return null; }
  if (error && !listing) return (
    <div className="page-container py-20 text-center">
      <p className="text-zinc-500 mb-4">{error}</p>
      <Link href="/dashboard" className="btn-secondary">Back to Dashboard</Link>
    </div>
  );

  return (
    <div className="page-container py-10 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Edit Listing</h1>
        <Link href="/dashboard" className="btn-outline text-sm">← Dashboard</Link>
      </div>

      {/* Status actions */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Status actions:</span>
        {listing?.status !== "sold" && (
          <button disabled={photoBusy || saving} onClick={() => changeStatus("sold")} className="btn-secondary text-xs py-1.5 px-3">
            Mark as Sold
          </button>
        )}
        {listing?.status !== "active" && (
          <button disabled={photoBusy || saving} onClick={() => changeStatus("active")} className="btn-secondary text-xs py-1.5 px-3">
            Re-activate
          </button>
        )}
        <button
          onClick={deleteListing}
          disabled={photoBusy || saving}
          className="btn text-xs py-1.5 px-3 text-red-400 border border-red-900/50 bg-red-950/30 hover:bg-red-950 ml-auto"
        >
          Delete Listing
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {listing && <ListingPhotoEditor key={listing.id} listingId={listing.id} initialPhotos={listing.photos || []} disabled={saving} onBusyChange={setPhotoBusy} />}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Listing Info</h2>
          <div>
            <label className="label">Category</label>
            <select className="select" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={255} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} required />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Price</h2>
          <input type="number" className="input" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Leave blank for Make Offer" min={0} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-600 bg-zinc-800 text-red-500" checked={form.price_obo} onChange={(e) => set("price_obo", e.target.checked)} />
            <span className="text-sm text-zinc-300">Or best offer (OBO)</span>
          </label>
        </div>

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
              <input className="input" value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>
            <div>
              <label className="label">Mileage</label>
              <input type="number" className="input" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} min={0} />
            </div>
            <div>
              <label className="label">Engine (cc)</label>
              <input type="number" className="input" value={form.engine_cc} onChange={(e) => set("engine_cc", e.target.value)} min={0} />
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" value={form.color} onChange={(e) => set("color", e.target.value)} />
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="select" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
                <option value="">—</option>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">VIN</label>
              <input className="input" value={form.vin} onChange={(e) => set("vin", e.target.value)} maxLength={17} />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Location</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
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

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={saving || photoBusy} className="btn-primary w-full py-4 text-base">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
