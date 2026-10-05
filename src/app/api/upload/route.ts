import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  authorizeListing, imageTypes, listingIdSchema, MAX_LISTING_PHOTOS,
  PhotoError, publicPhotoUrl, s3,
} from "@/lib/listing-photos";

const uploadSchema = z.object({ listingId: listingIdSchema, contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = uploadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid listing and supported image type are required." }, { status: 400 });
  const { contentType, listingId } = parsed.data;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await authorizeListing(client, listingId, session.user as { id: string });
    const count = await client.query<{ count: string }>("SELECT COUNT(*) FROM listing_photos WHERE listing_id = $1", [listingId]);
    if (Number(count.rows[0].count) >= MAX_LISTING_PHOTOS) throw new PhotoError("Maximum 10 photos per listing.", 409);
    const key = `listings/${listingId}/${randomUUID()}.${imageTypes[contentType]}`;
    const command = new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    await client.query("COMMIT");
    return NextResponse.json({ uploadUrl, publicUrl: publicPhotoUrl(key), key });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof PhotoError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Photo upload signing failed", err);
    return NextResponse.json({ error: "Could not prepare upload. Please try again." }, { status: 503 });
  } finally {
    client.release();
  }
}
