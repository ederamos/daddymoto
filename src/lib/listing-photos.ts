import type { PoolClient } from "pg";
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";

export const MAX_LISTING_PHOTOS = 10;
export const listingIdSchema = z.string().uuid();
export const imageTypes = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/avif": "avif",
} as const;

export const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export class PhotoError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Every photo writer locks the parent row before checking permissions/counts.
export async function authorizeListing(client: PoolClient, listingId: string, user: { id: string }) {
  const result = await client.query<{ user_id: string }>(
    "SELECT user_id FROM listings WHERE id = $1 FOR UPDATE", [listingId]
  );
  if (!result.rows[0]) throw new PhotoError("Listing not found.", 404);
  const admin = await client.query<{ is_admin: boolean }>("SELECT is_admin FROM users WHERE id = $1", [user.id]);
  if (result.rows[0].user_id !== user.id && admin.rows[0]?.is_admin !== true) {
    throw new PhotoError("Forbidden.", 403);
  }
}

export function publicPhotoUrl(key: string) {
  return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
}

export function validatePhotoKey(listingId: string, key: string) {
  const prefix = `listings/${listingId}/`;
  if (!key.startsWith(prefix) || !/^[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$/.test(key.slice(prefix.length))) {
    throw new PhotoError("Invalid photo key.", 400);
  }
}

export async function verifyPhotoObject(key: string) {
  const object = await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
  if (!object.ContentType || !Object.prototype.hasOwnProperty.call(imageTypes, object.ContentType)) throw new PhotoError("Images only.", 400);
}

export async function deletePhotoObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
}
