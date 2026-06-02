import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

// Fetch full listing for owner editing (no view increment)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string; isAdmin?: boolean }).id;
  const isAdmin = (session.user as { id: string; isAdmin?: boolean }).isAdmin;

  const result = await query("SELECT * FROM listings WHERE id = $1", [params.id]);
  const listing = result.rows[0];
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.user_id !== userId && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(listing);
}
