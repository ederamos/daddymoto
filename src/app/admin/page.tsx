import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/utils";
import Link from "next/link";
import { AdminActions } from "./AdminActions";

async function getStats() {
  const [listings, users, messages] = await Promise.all([
    query(`SELECT
      COUNT(*) FILTER (WHERE status = 'active')  AS active,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'sold')    AS sold,
      COUNT(*) FILTER (WHERE status = 'removed') AS removed,
      COUNT(*)                                    AS total
      FROM listings`),
    query("SELECT COUNT(*) AS total FROM users"),
    query("SELECT COUNT(*) FILTER (WHERE is_read = false) AS unread FROM messages"),
  ]);
  return {
    listings: listings.rows[0],
    users: users.rows[0],
    messages: messages.rows[0],
  };
}

async function getPendingListings() {
  const result = await query(`
    SELECT l.id, l.title, l.status, l.price, l.price_obo, l.created_at,
           u.name AS seller_name, u.email AS seller_email,
           c.name AS category_name
    FROM listings l
    JOIN users u ON u.id = l.user_id
    JOIN categories c ON c.id = l.category_id
    WHERE l.status IN ('active','pending')
    ORDER BY l.created_at DESC
    LIMIT 50
  `);
  return result.rows as {
    id: string; title: string; status: string; price: number | null;
    price_obo: boolean; created_at: string; seller_name: string;
    seller_email: string; category_name: string;
  }[];
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    redirect("/");
  }

  const [stats, listings] = await Promise.all([getStats(), getPendingListings()]);

  return (
    <div className="page-container py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Admin</h1>
        <span className="badge-red">Admin Panel</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {(
          [
            ["Active", stats.listings.active],
            ["Pending", stats.listings.pending],
            ["Sold", stats.listings.sold],
            ["Removed", stats.listings.removed],
            ["Users", stats.users.total],
          ] as [string, React.ReactNode][]
        ).map(([label, value]) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-black text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Listings table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Recent Listings</h2>
          <span className="text-xs text-zinc-600">{listings.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-widest">
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/listings/${l.id}`} className="font-medium text-zinc-200 hover:text-white line-clamp-1">
                      {l.title}
                    </Link>
                    <p className="text-xs text-zinc-600">{l.category_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-300 text-xs">{l.seller_name}</p>
                    <p className="text-zinc-600 text-xs">{l.seller_email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">
                    {formatPrice(l.price, l.price_obo)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      l.status === "active"  ? "badge-green" :
                      l.status === "pending" ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800/50" :
                      "badge-zinc"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{formatDate(l.created_at)}</td>
                  <td className="px-4 py-3">
                    <AdminActions listingId={l.id} currentStatus={l.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
