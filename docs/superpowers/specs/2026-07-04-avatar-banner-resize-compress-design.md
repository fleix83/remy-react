# Avatar/Banner Client-Side Resize & Compress — Design

**Date:** 2026-07-04
**Goal:** Stop storing full-resolution profile images. Resize and compress avatar/banner uploads client-side before they reach Supabase Storage, cutting storage usage per image from multi-MB to tens/hundreds of KB.

## Context

- Uploads flow through `processImageForUpload()` in `src/utils/image-processing.ts` (HEIC→JPEG conversion, magic-byte type detection, validation, 5MB cap) but are never resized or compressed — a 12-megapixel photo is stored at full resolution.
- A `resizeImageIfNeeded()` helper exists in that file but is dead code (never called). It will be replaced.
- Display sizes: avatar max 8rem (128px CSS → 256px on retina); banner is a full-width `cover` image on the profile header.
- Both `AvatarService.uploadAvatar()` and `AvatarService.uploadBackground()` (in `src/services/avatar.service.ts`) call `processImageForUpload()` — hooking in there covers both surfaces.

## Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Target dimensions/quality | Avatar max 512×512, banner max 1920×1920, quality ~0.82 |
| Output format | WebP; automatic JPEG fallback where the browser can't encode WebP |
| Animated GIFs | Flattened to static (re-encoded like any other image) |
| Input size cap | Raised from 5MB to 20MB (client-side check only) |
| Approach | Extend existing canvas pipeline; no new dependency |

## Rejected alternatives

- **`browser-image-compression` library:** duplicates existing canvas utilities, ~50KB dependency; its EXIF-orientation advantage is moot since modern browsers apply EXIF orientation during decode.
- **Server-side (Supabase image transforms / edge function):** built-in transforms are Pro-plan and transform on *delivery* — the full-size original still occupies storage, so the goal isn't met.

## Design

### `src/utils/image-processing.ts`

- New exported types/functions:
  - `interface ResizeOptions { maxWidth: number; maxHeight: number; quality: number }`
  - `fitWithin(width, height, maxWidth, maxHeight): { width, height }` — pure dimension math, preserves aspect ratio, never upscales. Unit-testable.
  - `resizeAndCompressImage(file: File, opts: ResizeOptions): Promise<File>`:
    1. Decode via `Image` + object URL (existing pattern, including the 10s load timeout and object-URL revocation).
    2. Compute target dimensions with `fitWithin()`.
    3. Draw to canvas at target size; encode with `canvas.toBlob('image/webp', quality)`.
    4. **Safari fallback:** if the returned `blob.type` is not `image/webp` (Safari silently returns PNG when it can't encode WebP), re-encode the same canvas as `image/jpeg` at the same quality.
    5. Rename output to match encoding (`<base>.webp` / `<base>.jpg`).
- **No-regression guard:** if the re-encoded blob is *larger* than the input file and the input is already a standard web format within the target dimensions, return the original file unchanged.
- `processImageForUpload(file, maxSizeMB, resizeOptions?)` gains an optional third parameter. When provided, `resizeAndCompressImage()` runs after HEIC conversion / format validation / MIME correction. When omitted, behavior is unchanged (other callers unaffected).
- GIFs get no special-casing: they flow through the canvas and come out as static WebP/JPEG (confirmed decision).
- Delete the dead `resizeImageIfNeeded()` (replaced by `resizeAndCompressImage`).

### `src/services/avatar.service.ts`

- `MAX_FILE_SIZE`: 5MB → 20MB. This is the *input* validation only; compressed output stays far below the existing 5MB storage-bucket limit, so no bucket change is needed and no large file ever hits storage.
- Presets passed to `processImageForUpload()`:
  - `uploadAvatar`: `{ maxWidth: 512, maxHeight: 512, quality: 0.82 }`
  - `uploadBackground`: `{ maxWidth: 1920, maxHeight: 1920, quality: 0.82 }`
- The `avatars` bucket already allows `image/webp` — no storage config change.

### Error handling

If `resizeAndCompressImage()` throws (canvas failure, decode timeout):

- Input is a standard web format **and** ≤ 5MB (the storage bucket limit): upload the processed-but-uncompressed file — graceful degradation, mirrors the existing fallback style in `processImageForUpload()`.
- Otherwise: reject with the existing user-facing error pattern ("Could not process this image…").

### Testing

- Vitest unit tests for `fitWithin()` (landscape/portrait/square, no-upscale, exact-fit cases).
- Canvas encoding is unreliable in jsdom, so the full pipeline is verified manually in the browser: upload a large JPEG/PNG/HEIC as avatar and banner, confirm stored object is WebP (or JPEG on Safari), dimensions ≤ targets, size in expected range (~30–60KB avatar, ~150–300KB banner), and profile updates render correctly.

## Out of scope

- Post/comment inline images (separate upload path, if any).
- Cropping UI or aspect-ratio enforcement.
- Cleanup of previously uploaded full-size images already in storage.
