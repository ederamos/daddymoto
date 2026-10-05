import type { ListingPhoto } from "@/types";

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Photo upload failed. Please try again.");
  return data;
}

export async function uploadListingPhoto(listingId: string, file: File): Promise<ListingPhoto> {
  const signed = await responseJson(await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, contentType: file.type }),
  }));
  const uploaded = await fetch(signed.uploadUrl, {
    method: "PUT", body: file, headers: { "Content-Type": file.type },
  });
  if (!uploaded.ok) throw new Error(`Could not upload ${file.name}. Please try again.`);
  const added = await responseJson(await fetch("/api/photos", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, key: signed.key }),
  }));
  return added.photo;
}
