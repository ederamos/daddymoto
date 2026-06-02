import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listingId, url, key, sortOrder } = await req.json();
  if (!listingId || !url || !key) return NextResponse.json({ error: "Missing fields." }, { status: 400 });

  // Verify listing belongs to user
  const userId = (session.user as { id: string }).id;
  const listing = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND user_id = $2", [listingId, userId]);
  if (!listing.rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await query(
    "INSERT INTO listing_photos (listing_id, url, key, sort_order) VALUES ($1, $2, $3, $4)",
    [listingId, url, key, sortOrder || 0]
  );

  return NextResponse.json({ success: true });
}
