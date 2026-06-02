import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

// Renew an expired or about-to-expire listing for another 60 days
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const check = await query("SELECT user_id, status FROM listings WHERE id = $1", [params.id]);
  if (!check.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (check.rows[0].user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["active", "expired"].includes(check.rows[0].status)) {
    return NextResponse.json({ error: "Only active or expired listings can be renewed." }, { status: 400 });
  }

  await query(
    "UPDATE listings SET status = 'active', expires_at = NOW() + INTERVAL '60 days' WHERE id = $1",
    [params.id]
  );

  return NextResponse.json({ success: true });
}
