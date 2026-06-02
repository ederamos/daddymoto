import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

async function getMessages(userId: string) {
  const result = await query(`
    SELECT
      m.id, m.sender_name, m.sender_email, m.body, m.is_read, m.created_at,
      l.id AS listing_id, l.title AS listing_title
    FROM messages m
    JOIN listings l ON l.id = m.listing_id
    WHERE l.user_id = $1
    ORDER BY m.created_at DESC
  `, [userId]);
  return result.rows as {
    id: string; sender_name: string; sender_email: string; body: string;
    is_read: boolean; created_at: string; listing_id: string; listing_title: string;
  }[];
}

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  const userId = (session.user as { id: string }).id;
  const messages = await getMessages(userId);
  const unread = messages.filter((m) => !m.is_read).length;

  // Mark all as read
  await query(
    `UPDATE messages SET is_read = true WHERE listing_id IN (SELECT id FROM listings WHERE user_id = $1)`,
    [userId]
  );

  return (
    <div className="page-container py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Messages</h1>
        {unread > 0 && <span className="badge-red">{unread} new</span>}
      </div>

      {messages.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-zinc-500">No messages yet. They&apos;ll appear here when buyers contact you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`card p-5 ${!m.is_read ? "border-zinc-600" : ""}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-zinc-200">{m.sender_name}</p>
                  <a href={`mailto:${m.sender_email}`} className="text-sm text-red-400 hover:text-red-300">
                    {m.sender_email}
                  </a>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-zinc-600">{formatDate(m.created_at)}</p>
                  {!m.is_read && <span className="badge-red text-xs mt-1">New</span>}
                </div>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap mb-3">{m.body}</p>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <Link href={`/listings/${m.listing_id}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  Re: {m.listing_title}
                </Link>
                <a
                  href={`mailto:${m.sender_email}?subject=Re: ${encodeURIComponent(m.listing_title)}`}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Reply via Email
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
