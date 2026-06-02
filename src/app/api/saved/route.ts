import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { listingId } = await req.json();

  // Toggle: insert if not exists, delete if exists
  const existing = await query(
    "SELECT 1 FROM saved_listings WHERE user_id = $1 AND listing_id = $2",
    [userId, listingId]
  );

  if (existing.rows.length > 0) {
    await query("DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2", [userId, listingId]);
    return NextResponse.json({ saved: false });
  } else {
    await query("INSERT INTO saved_listings (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, listingId]);
    return NextResponse.json({ saved: true });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const listingId = req.nextUrl.searchParams.get("listingId");

  if (listingId) {
    const result = await query(
      "SELECT 1 FROM saved_listings WHERE user_id = $1 AND listing_id = $2",
      [userId, listingId]
    );
    return NextResponse.json({ saved: result.rows.length > 0 });
  }

  // Return all saved listing IDs
  const result = await query("SELECT listing_id FROM saved_listings WHERE user_id = $1", [userId]);
  return NextResponse.json({ ids: result.rows.map((r: { listing_id: string }) => r.listing_id) });
}
