import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, query } from "@/lib/db";
import { authorizeListing, deletePhotoObject, listingIdSchema, PhotoError } from "@/lib/listing-photos";

interface Params { params: { id: string } }

// PATCH — edit listing or change status
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string; isAdmin?: boolean }).id;
  const isAdmin = (session.user as { id: string; isAdmin?: boolean }).isAdmin;

  // Verify ownership (or admin)
  const check = await query<{ user_id: string }>("SELECT user_id FROM listings WHERE id = $1", [params.id]);
  if (!check.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (check.rows[0].user_id !== userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Status-only change (mark sold, renew, remove)
  if (body.status) {
    const allowed = isAdmin
      ? ["active", "sold", "expired", "removed", "pending"]
      : ["active", "sold"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const extra = body.status === "active"
      ? ", expires_at = NOW() + INTERVAL '60 days'"
      : "";
    await query(`UPDATE listings SET status = $1${extra} WHERE id = $2`, [body.status, params.id]);
    return NextResponse.json({ success: true });
  }

  // Full edit
  const {
    category_id, title, description, price, price_obo,
    year, make, model, mileage, engine_cc, color, condition, vin,
    city, state, zip,
  } = body;

  await query(`
    UPDATE listings SET
      category_id = COALESCE($1, category_id),
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      price = $4,
      price_obo = COALESCE($5, price_obo),
      year = $6, make = $7, model = $8, mileage = $9,
      engine_cc = $10, color = $11, condition = $12, vin = $13,
      city = $14, state = $15, zip = $16
    WHERE id = $17
  `, [
    category_id || null,
    title?.trim() || null,
    description?.trim() || null,
    price != null ? Math.round(parseFloat(price) * 100) : null,
    price_obo ?? null,
    year || null, make || null, model || null, mileage || null,
    engine_cc || null, color || null, condition || null, vin || null,
    city || null, state || null, zip || null,
    params.id,
  ]);

  return NextResponse.json({ success: true });
}

// DELETE — remove listing entirely
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!listingIdSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
  }
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await authorizeListing(client, params.id, session.user as { id: string });
    const photos = await client.query<{ key: string }>("SELECT key FROM listing_photos WHERE listing_id = $1", [params.id]);
    for (const photo of photos.rows) await deletePhotoObject(photo.key);
    await client.query("DELETE FROM listings WHERE id = $1", [params.id]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof PhotoError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Listing deletion failed", err);
    return NextResponse.json({ error: "Could not delete listing. Please try again." }, { status: 503 });
  } finally {
    client.release();
  }
}
