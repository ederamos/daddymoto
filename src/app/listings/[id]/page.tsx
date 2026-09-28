import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { query } from "@/lib/db";
import { formatPrice, formatMileage, formatDate } from "@/lib/utils";
import { ContactForm } from "@/components/listings/ContactForm";
import { SaveButton } from "@/components/listings/SaveButton";
import { ShareButtons } from "@/components/listings/ShareButtons";
import type { Listing } from "@/types";

interface PageProps {
  params: { id: string };
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://daddymoto.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const result = await query<{
      title: string;
      description: string;
      year: number | null;
      make: string | null;
      model: string | null;
      status: string;
      cover_photo: string | null;
    }>(`
      SELECT l.title, l.description, l.year, l.make, l.model, l.status,
        (SELECT url FROM listing_photos WHERE listing_id = l.id ORDER BY sort_order LIMIT 1) AS cover_photo
      FROM listings l WHERE l.id = $1
    `, [params.id]);
    const listing = result.rows[0];
    if (!listing) return { title: "Listing not found" };

    const title = listing.year && listing.make && listing.model
      ? `${listing.year} ${listing.make} ${listing.model}`
      : listing.title;
    const description = listing.description.replace(/\s+/g, " ").trim().slice(0, 180);
    const url = new URL(`/listings/${params.id}`, siteUrl).toString();
    const images = listing.cover_photo ? [listing.cover_photo] : [];

    return {
      title,
      description,
      alternates: { canonical: url },
      robots: listing.status === "active" || listing.status === "sold" ? undefined : { index: false },
      openGraph: { title, description, url, type: "website", images },
      twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
    };
  } catch {
    return { title: "Motorcycle listing" };
  }
}

async function getListing(id: string): Promise<Listing | null> {
  try {
    // Increment views
    await query("UPDATE listings SET views = views + 1 WHERE id = $1", [id]);

    const result = await query<Listing>(`
      SELECT
        l.*,
        row_to_json(c) AS category,
        json_agg(
          json_build_object('id', p.id, 'url', p.url, 'sort_order', p.sort_order)
          ORDER BY p.sort_order
        ) FILTER (WHERE p.id IS NOT NULL) AS photos,
        json_build_object(
          'id', u.id, 'name', u.name, 'city', u.city, 'state', u.state, 'created_at', u.created_at
        ) AS seller
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      JOIN users u ON u.id = l.user_id
      LEFT JOIN listing_photos p ON p.listing_id = l.id
      WHERE l.id = $1
      GROUP BY l.id, c.id, u.id
    `, [id]);

    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export default async function ListingDetailPage({ params }: PageProps) {
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const photos = listing.photos || [];
  const title = listing.year && listing.make && listing.model
    ? `${listing.year} ${listing.make} ${listing.model}`
    : listing.title;

  const specs = [
    listing.year       && ["Year",      listing.year],
    listing.make       && ["Make",      listing.make],
    listing.model      && ["Model",     listing.model],
    listing.mileage    && ["Mileage",   formatMileage(listing.mileage)],
    listing.engine_cc  && ["Engine",    `${listing.engine_cc}cc`],
    listing.color      && ["Color",     listing.color],
    listing.condition  && ["Condition", listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)],
    listing.vin        && ["VIN",       listing.vin],
  ].filter(Boolean) as [string, string | number][];

  return (
    <div className="page-container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link href="/listings" className="hover:text-zinc-300">Listings</Link>
        <span>/</span>
        <Link href={`/listings?category=${listing.category?.slug}`} className="hover:text-zinc-300">
          {listing.category?.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-300 truncate">{title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: photos + details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo gallery */}
          <div className="card overflow-hidden">
            {photos.length > 0 ? (
              <div>
                <div className="relative aspect-[16/9] bg-zinc-800">
                  <Image
                    src={photos[0].url}
                    alt={title}
                    fill
                    className="object-cover"
                    priority
                  />
                  {listing.status === "sold" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-black text-4xl tracking-widest rotate-[-15deg]">SOLD</span>
                    </div>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto bg-zinc-950">
                    {photos.map((photo, i) => (
                      <div key={photo.id} className="relative w-20 h-14 shrink-0 rounded-lg overflow-hidden border border-zinc-700">
                        <Image src={photo.url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[16/9] bg-zinc-800 flex items-center justify-center">
                <svg className="w-16 h-16 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Specs */}
          {specs.length > 0 && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-4">Specs</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {specs.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-zinc-500 mb-0.5">{label}</dt>
                    <dd className="text-sm font-medium text-zinc-100">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Description */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-4">Description</h2>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>
        </div>

        {/* Right: price + contact */}
        <div className="space-y-4">
          {/* Price card */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl font-bold text-zinc-100 leading-snug">{title}</h1>
                {listing.city && listing.state && (
                  <p className="text-sm text-zinc-500 mt-1">
                    📍 {listing.city}, {listing.state}
                  </p>
                )}
              </div>
              <span className="badge-zinc capitalize">{listing.category?.name}</span>
            </div>

            <div className="text-3xl font-black text-red-400 mb-2">
              {formatPrice(listing.price, listing.price_obo)}
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-600 mb-6 pb-6 border-b border-zinc-800">
              <span>Posted {formatDate(listing.created_at)}</span>
              <span>{listing.views} views</span>
            </div>

            {/* Seller info */}
            {listing.seller && (
              <div className="mb-6">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Seller</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-semibold text-sm shrink-0">
                    {(listing.seller as { name: string }).name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{(listing.seller as { name: string }).name}</p>
                    {(listing.seller as { city?: string; state?: string }).city && (
                      <p className="text-xs text-zinc-500">
                        {(listing.seller as { city?: string; state?: string }).city}, {(listing.seller as { city?: string; state?: string }).state}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <SaveButton listingId={listing.id} />
            </div>

            {(listing.status === "active" || listing.status === "sold") && (
              <div className="mb-6 border-b border-zinc-800 pb-6">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Share this listing</p>
                <ShareButtons
                  title={title}
                  url={new URL(`/listings/${listing.id}`, siteUrl).toString()}
                />
              </div>
            )}

            {listing.status === "active" ? (
              <ContactForm listingId={listing.id} />
            ) : (
              <div className="text-center py-4 text-zinc-500 text-sm">
                This listing is no longer active.
              </div>
            )}
          </div>

          {/* Safety tip */}
          <div className="rounded-xl border border-yellow-900/40 bg-yellow-950/20 p-4">
            <p className="text-xs text-yellow-700 font-semibold mb-1">Safety Tip</p>
            <p className="text-xs text-yellow-900/80">
              Always meet in a public place. Never wire money or send payment before inspecting the bike in person.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
