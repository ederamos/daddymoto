import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { RenewButton } from "./RenewButton";

async function getUserListings(userId: string) {
  const result = await query(`
    SELECT l.id, l.title, l.price, l.price_obo, l.status, l.views, l.created_at, l.expires_at,
           c.name AS category_name,
           (SELECT url FROM listing_photos WHERE listing_id = l.id ORDER BY sort_order LIMIT 1) AS cover_photo,
           (SELECT COUNT(*) FROM messages WHERE listing_id = l.id) AS message_count
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    WHERE l.user_id = $1
    ORDER BY l.created_at DESC
  `, [userId]);
  return result.rows;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = (session.user as { id: string }).id;
  const listings = await getUserListings(userId);

  const active = listings.filter((l) => l.status === "active").length;
  const sold = listings.filter((l) => l.status === "sold").length;
  const totalViews = listings.reduce((sum: number, l: { views: number }) => sum + (l.views || 0), 0);

  return (
    <div className="page-container py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white">My Listings</h1>
        <Link href="/post" className="btn-primary">+ New Listing</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          ["Active", active],
          ["Sold", sold],
          ["Total Views", totalViews.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-black text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Listings table */}
      {listings.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-zinc-500 mb-4">You haven&apos;t posted any listings yet.</p>
          <Link href="/post" className="btn-primary">Post your first listing</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800">
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-widest">
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Price</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Views</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Messages</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Posted</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {listings.map((l: {
                id: string; title: string; price: number | null; price_obo: boolean;
                status: string; views: number; created_at: string; category_name: string;
                message_count: string;
              }) => (
                <tr key={l.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/listings/${l.id}`} className="font-medium text-zinc-200 hover:text-white line-clamp-1">
                      {l.title}
                    </Link>
                    <p className="text-xs text-zinc-600">{l.category_name}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-zinc-300">
                    {formatPrice(l.price, l.price_obo)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-400">{l.views}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-400">{l.message_count}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      l.status === "active" ? "badge-green" :
                      l.status === "sold"   ? "badge-red" :
                      "badge-zinc"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-zinc-600 text-xs">
                    {formatDate(l.created_at)}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Link href={`/dashboard/listing/${l.id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
                      Edit
                    </Link>
                    {(l.status === "expired" || (l.status === "active" && new Date(l.expires_at) < new Date(Date.now() + 7 * 86400000))) && (
                      <RenewButton listingId={l.id} expired={l.status === "expired"} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
