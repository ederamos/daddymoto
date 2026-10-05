import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  authorizeListing, deletePhotoObject, listingIdSchema, MAX_LISTING_PHOTOS,
  PhotoError, publicPhotoUrl, validatePhotoKey, verifyPhotoObject,
} from "@/lib/listing-photos";
import type { ListingPhoto } from "@/types";

const addSchema = z.object({ listingId: listingIdSchema, key: z.string().min(1) });
const removeSchema = z.object({ listingId: listingIdSchema, photoId: z.string().uuid() });

async function mutate(req: NextRequest, remove: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = (remove ? removeSchema : addSchema).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid photo request." }, { status: 400 });
  const { listingId } = parsed.data;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await authorizeListing(client, listingId, session.user as { id: string });
    const result = await client.query<ListingPhoto>(
      "SELECT * FROM listing_photos WHERE listing_id = $1 ORDER BY sort_order, created_at, id", [listingId]
    );
    let photo: ListingPhoto | undefined;
    if (remove) {
      const { photoId } = removeSchema.parse(parsed.data);
      photo = result.rows.find((p) => p.id === photoId);
      if (!photo) throw new PhotoError("Photo not found.", 404);
      // Keep the database row if storage fails, so deletion can be retried.
      // R2 DELETE is idempotent, including after a database rollback.
      await deletePhotoObject(photo.key);
      await client.query("DELETE FROM listing_photos WHERE id = $1 AND listing_id = $2", [photoId, listingId]);
      const remaining = result.rows.filter((p) => p.id !== photoId);
      for (let index = 0; index < remaining.length; index++) {
        const item = remaining[index];
        await client.query("UPDATE listing_photos SET sort_order = $1 WHERE id = $2", [index, item.id]);
      }
    } else {
      const { key } = addSchema.parse(parsed.data);
      validatePhotoKey(listingId, key);
      if (result.rows.some((p) => p.key === key)) throw new PhotoError("Photo already added.", 409);
      if (result.rows.length >= MAX_LISTING_PHOTOS) throw new PhotoError("Maximum 10 photos per listing.", 409);
      await verifyPhotoObject(key);
      // Ignore client ordering/URL: append after the current cover and derive the URL from R2.
      const nextOrder = result.rows.reduce((max, p) => Math.max(max, p.sort_order ?? 0), -1) + 1;
      const inserted = await client.query<ListingPhoto>(
        "INSERT INTO listing_photos (listing_id, url, key, sort_order) VALUES ($1, $2, $3, $4) RETURNING *",
        [listingId, publicPhotoUrl(key), key, nextOrder]
      );
      photo = inserted.rows[0];
    }
    await client.query("COMMIT");
    return NextResponse.json({ success: true, ...(remove ? {} : { photo }) });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof PhotoError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Photo operation failed", err);
    return NextResponse.json({ error: "Photo operation failed. Please try again." }, { status: 503 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) { return mutate(req, false); }
export async function DELETE(req: NextRequest) { return mutate(req, true); }
