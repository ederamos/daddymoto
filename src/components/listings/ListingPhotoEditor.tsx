"use client";

import { useRef, useState } from "react";
import type { ListingPhoto } from "@/types";
import { PHOTO_ACCEPT, uploadListingPhoto } from "@/lib/upload-listing-photo";

interface Props {
  listingId: string;
  initialPhotos: ListingPhoto[];
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}

export default function ListingPhotoEditor({ listingId, initialPhotos, disabled, onBusyChange }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const working = useRef(false);

  function start() {
    working.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setMessage("");
  }
  function finish() {
    working.current = false;
    setBusy(false);
    onBusyChange(false);
  }

  async function addPhotos(files: File[]) {
    if (!files.length || working.current || disabled) return;
    if (photos.length + files.length > 10) {
      setError(`You can add ${10 - photos.length} more photo(s). Maximum 10 per listing.`);
      return;
    }
    start();
    let added = 0;
    try {
      for (const file of files) {
        setMessage(`Uploading ${added + 1} of ${files.length}…`);
        const photo = await uploadListingPhoto(listingId, file);
        setPhotos((current) => [...current, photo]);
        added++;
      }
      setMessage(`${added} photo(s) added.`);
    } catch (err) {
      setMessage(added ? `${added} photo(s) added.` : "");
      setError(err instanceof Error ? err.message : "Could not add photos. Please try again.");
    } finally {
      finish();
    }
  }

  async function removePhoto(photo: ListingPhoto) {
    if (working.current || disabled) return;
    if (!window.confirm("Remove this photo permanently?")) return;
    start();
    try {
      const res = await fetch("/api/photos", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, photoId: photo.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove photo. Please try again.");
      setPhotos((current) => current.filter((p) => p.id !== photo.id).map((p, index) => ({ ...p, sort_order: index })));
      setMessage("Photo removed.");
      // Return keyboard focus to a stable control after the removed button disappears.
      requestAnimationFrame(() => input.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo. Please try again.");
    } finally {
      finish();
    }
  }

  return (
    <section className="card p-6 space-y-4" aria-labelledby="photos-heading" aria-busy={busy}>
      <h2 id="photos-heading" className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Photos ({photos.length}/10)</h2>
      <p id="photos-help" className="text-sm text-zinc-400">
        The first photo is the cover. New photos go at the end. Removing the cover makes the next photo the cover. Photo changes save immediately.
      </p>
      {photos.length === 0 && <p className="text-sm text-zinc-400">No photos yet.</p>}
      <ol className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <li key={photo.id} className="space-y-2">
            {/* R2 public URLs are configured by the server. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={`Listing photo ${index + 1}${index === 0 ? ", cover photo" : ""}`} className="w-full aspect-square rounded-lg object-cover" />
            <p className="text-xs text-zinc-400">{index === 0 ? "Cover photo" : `Photo ${index + 1}`}</p>
            <button type="button" disabled={busy || disabled} onClick={() => removePhoto(photo)}
              aria-label={`Remove photo ${index + 1}${index === 0 ? " (cover photo)" : ""}`}
              className="btn-outline text-sm w-full disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white">
              Remove
            </button>
          </li>
        ))}
      </ol>
      <label htmlFor="add-listing-photos" className="label">Add photos</label>
      <input ref={input} id="add-listing-photos" type="file" accept={PHOTO_ACCEPT} multiple
        aria-describedby="photos-help photos-feedback" disabled={busy || disabled || photos.length >= 10}
        className="block w-full text-sm text-zinc-300 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = "";
          void addPhotos(files);
        }} />
      {photos.length >= 10 && <p className="text-sm text-zinc-400">Remove a photo to add another.</p>}
      <div id="photos-feedback">
        <p role="status" aria-live="polite" className="text-sm text-zinc-300">{message}</p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
