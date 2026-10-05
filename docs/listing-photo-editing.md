# Listing photo editing

Listing owners and current database admins can add/remove photos from the dashboard edit page. Photos load in cover order. Changes save immediately and do not require clicking Save Changes; new photos append and removing the cover promotes the next photo. The page includes labeled file/remove controls, preview descriptions, live progress/errors, and disabled controls during operations.

No schema migration or new environment variables are required. Existing R2 credentials must permit PutObject, HeadObject, and DeleteObject. The existing browser-to-R2 PUT CORS configuration still applies. JPEG, PNG, WebP, GIF, and AVIF uploads are supported; SVG is excluded.

## API behavior

- `POST /api/upload`: validates listing UUID/image MIME type, checks owner/current admin access and photo count, then issues a five-minute R2 PUT URL.
- `POST /api/photos`: accepts `listingId` and `key`; checks access, listing-specific key, object existence/type, duplicate key, and the 10-photo limit. The server derives the public URL and appends the sort order. Older callers' `url`/`sortOrder` values are ignored.
- `DELETE /api/photos`: accepts `listingId` and `photoId`; authorizes against the listing, deletes the stored R2 key, removes the database row, then compacts sort order.
- `GET /api/listings/[id]/detail`: returns the listing plus ordered `photos` for owner/admin editing.
- `DELETE /api/listings/[id]`: also deletes attached R2 objects before removing the listing.

All photo writers lock the parent listing row in a transaction. Parallel additions cannot attach more than 10 photos. Admin access is read from the database rather than trusting a possibly stale JWT admin flag.

R2 and PostgreSQL do not share a transaction. If R2 deletion fails, database records remain for retry. If deletion succeeds but a later database operation fails, retrying deletes the same R2 key idempotently and finishes removing the row. Whole-listing deletion may remove some objects before a later storage failure; retry the operation to complete it. Uploads that succeed in R2 but fail before attachment can leave unattached objects; abandoned-upload cleanup is outside this change.

## Validation

Run `npm run test:photos` for route/storage boundary tests and rendered accessibility checks. These tests mock PostgreSQL transactions and R2; they do not contact production services.

Before deployment, smoke-test with real staging PostgreSQL/R2:

1. As owner, open a listing with photos and confirm previews/cover order. Add two photos; reload and confirm they append.
2. Remove a middle photo, then the cover, then the last photo. Confirm remaining order and verify the deleted keys are absent from R2.
3. Repeat as an admin on another user's listing. As a third user, directly call upload/add/remove and confirm 403 and no R2 operations.
4. At nine photos, submit concurrent additions; confirm at most one attaches. At ten photos, confirm upload/add reject and the file control is disabled.
5. Force a storage failure; confirm the UI reports an error and the database record remains retryable.
6. Use keyboard navigation and a screen reader for Add photos, Remove photo N, progress, and error messages. Confirm failed new-listing uploads link to editing the already-created listing.
