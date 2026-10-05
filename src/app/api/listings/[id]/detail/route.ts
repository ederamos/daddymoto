import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { listingIdSchema } from "@/lib/listing-photos";

// Fetch full listing and ordered photos for owner/admin editing (no view increment)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!listingIdSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
  }
  const userId = (session.user as { id: string }).id;

  const result = await query("SELECT * FROM listings WHERE id = $1", [params.id]);
  const listing = result.rows[0];
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await query<{ is_admin: boolean }>("SELECT is_admin FROM users WHERE id = $1", [userId]);
  if (listing.user_id !== userId && admin.rows[0]?.is_admin !== true) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const photos = await query("SELECT * FROM listing_photos WHERE listing_id = $1 ORDER BY sort_order, created_at, id", [params.id]);
  return NextResponse.json({ ...listing, photos: photos.rows });
}
