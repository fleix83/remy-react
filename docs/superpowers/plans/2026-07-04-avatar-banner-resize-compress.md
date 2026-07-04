# Avatar/Banner Client-Side Resize & Compress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resize and compress avatar/banner uploads client-side before they reach Supabase Storage, so profile images cost tens/hundreds of KB instead of multiple MB.

**Architecture:** Extend the existing canvas pipeline in `src/utils/image-processing.ts` with a `resizeAndCompressImage()` step (WebP output, JPEG fallback for Safari), exposed through an optional `resizeOptions` parameter on `processImageForUpload()`. `AvatarService` passes per-surface presets (avatar 512×512, banner 1920×1920, quality 0.82) and raises the client-side input cap to 20MB.

**Tech Stack:** React 19 + TypeScript, Vite 7, Vitest, browser Canvas API (no new dependencies), Supabase Storage.

**Spec:** `docs/superpowers/specs/2026-07-04-avatar-banner-resize-compress-design.md`

## Global Constraints

- No new npm dependencies.
- Presets (exact values from spec): avatar `{ maxWidth: 512, maxHeight: 512, quality: 0.82 }`; banner `{ maxWidth: 1920, maxHeight: 1920, quality: 0.82 }`.
- Client-side input cap: 20MB. Storage bucket limit stays 5MB (bucket is NOT reconfigured; compressed output stays far below it).
- Never upscale images.
- GIFs get no special-casing (animation is intentionally flattened).
- `processImageForUpload()` without the new parameter must behave exactly as before.
- Existing code style: no semicolons where the file omits them, `console.log` progress logging is the established pattern in these files — keep it.
- Commit messages follow repo convention: `feat(...)`, `refactor(...)`, `test(...)` etc., ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `fitWithin()` dimension helper (TDD)

**Files:**
- Test (create): `src/utils/image-processing.test.ts`
- Modify: `src/utils/image-processing.ts` (add export near the top, after the `FILE_INPUT_ACCEPT` constant around line 30)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number }` — used by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/image-processing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fitWithin } from './image-processing'

describe('fitWithin', () => {
  it('downscales a landscape image to fit maxWidth', () => {
    expect(fitWithin(4000, 3000, 1920, 1920)).toEqual({ width: 1920, height: 1440 })
  })

  it('downscales a portrait image to fit maxHeight', () => {
    expect(fitWithin(3000, 4000, 1920, 1920)).toEqual({ width: 1440, height: 1920 })
  })

  it('downscales a square image', () => {
    expect(fitWithin(2048, 2048, 512, 512)).toEqual({ width: 512, height: 512 })
  })

  it('never upscales an image that already fits', () => {
    expect(fitWithin(400, 300, 512, 512)).toEqual({ width: 400, height: 300 })
  })

  it('returns exact dimensions when the image exactly fits', () => {
    expect(fitWithin(512, 512, 512, 512)).toEqual({ width: 512, height: 512 })
  })

  it('respects both bounds when they differ', () => {
    // 4000x1000 into 1920x512: width is the binding constraint (scale 0.48)
    expect(fitWithin(4000, 1000, 1920, 512)).toEqual({ width: 1920, height: 480 })
  })

  it('never returns dimensions below 1px for extreme aspect ratios', () => {
    expect(fitWithin(10000, 10, 512, 512)).toEqual({ width: 512, height: 1 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/image-processing.test.ts`
Expected: FAIL — `fitWithin` is not exported (`SyntaxError` / `TypeError: fitWithin is not a function`).

- [ ] **Step 3: Implement `fitWithin`**

In `src/utils/image-processing.ts`, directly below the `FILE_INPUT_ACCEPT` constant (line 30), add:

```ts
export interface ResizeOptions {
  maxWidth: number
  maxHeight: number
  quality: number
}

/**
 * Scale dimensions to fit within a bounding box, preserving aspect ratio.
 * Never upscales; never returns less than 1px per side.
 */
export function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/image-processing.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/image-processing.test.ts src/utils/image-processing.ts
git commit -m "feat(images): add fitWithin dimension helper with unit tests

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `resizeAndCompressImage()` — WebP encode with JPEG fallback

**Files:**
- Modify: `src/utils/image-processing.ts` (replace `resizeImageIfNeeded`, lines 355–440, and the default export at lines 442–450)

**Interfaces:**
- Consumes: `fitWithin()` and `ResizeOptions` from Task 1.
- Produces: `export async function resizeAndCompressImage(file: File, options: ResizeOptions): Promise<File>` — used by Task 3. Resolves with the ORIGINAL `file` object (same reference) when re-encoding wouldn't help (no-regression guard).

- [ ] **Step 1: Replace `resizeImageIfNeeded` with `resizeAndCompressImage`**

Delete the entire `resizeImageIfNeeded` function (the block from the `/** Resize image if it exceeds maximum dimensions ... */` comment at line 355 through its closing `}` at line 440) and put this in its place:

```ts
/**
 * Resize an image to fit within max dimensions and re-encode it compressed.
 * Encodes to WebP; falls back to JPEG on browsers that can't encode WebP
 * (Safari's canvas.toBlob silently returns PNG for unsupported types).
 * Returns the original file unchanged if re-encoding wouldn't shrink it.
 */
export async function resizeAndCompressImage(
  file: File,
  options: ResizeOptions
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    // Set a timeout for image loading (iOS sometimes hangs)
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image loading timed out'))
    }, 10000)

    img.onload = () => {
      clearTimeout(timeout)
      try {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Image loaded with zero dimensions'))
          return
        }

        const { width, height } = fitWithin(
          img.naturalWidth,
          img.naturalHeight,
          options.maxWidth,
          options.maxHeight
        )

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Could not get canvas context'))
          return
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const alreadyFits =
          img.naturalWidth <= options.maxWidth &&
          img.naturalHeight <= options.maxHeight
        // GIF is deliberately excluded: re-encoding flattens animation, which we
        // want regardless of size
        const isWebSafeStill = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)

        const finish = (blob: Blob, extension: string, mimeType: string) => {
          URL.revokeObjectURL(objectUrl)

          // No-regression guard: keep the original if re-encoding didn't shrink it
          if (blob.size >= file.size && alreadyFits && isWebSafeStill) {
            console.log('Compression would not shrink file, keeping original')
            resolve(file)
            return
          }

          console.log('Image compressed:', {
            from: `${img.naturalWidth}x${img.naturalHeight} ${file.size}B ${file.type}`,
            to: `${width}x${height} ${blob.size}B ${mimeType}`
          })

          resolve(new File([blob], `${baseName}.${extension}`, {
            type: mimeType,
            lastModified: Date.now()
          }))
        }

        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob && webpBlob.type === 'image/webp') {
              finish(webpBlob, 'webp', 'image/webp')
              return
            }

            // Browser can't encode WebP — re-encode as JPEG instead
            canvas.toBlob(
              (jpegBlob) => {
                if (!jpegBlob) {
                  URL.revokeObjectURL(objectUrl)
                  reject(new Error('Could not compress image'))
                  return
                }
                finish(jpegBlob, 'jpg', 'image/jpeg')
              },
              'image/jpeg',
              options.quality
            )
          },
          'image/webp',
          options.quality
        )
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        reject(error)
      }
    }

    img.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = objectUrl
  })
}
```

- [ ] **Step 2: Update the default export**

Replace the default export at the bottom of the file:

```ts
export default {
  processImageForUpload,
  convertToJpeg,
  convertHeicToJpeg,
  resizeAndCompressImage,
  fitWithin,
  needsConversion,
  FILE_INPUT_ACCEPT,
  ACCEPTED_IMAGE_TYPES
}
```

- [ ] **Step 3: Verify typecheck and existing tests**

Run: `npx tsc -b && npx vitest run src/utils/image-processing.test.ts`
Expected: typecheck clean, 7 tests pass. (`resizeImageIfNeeded` had no consumers outside this file, so deleting it breaks nothing.)

- [ ] **Step 4: Commit**

```bash
git add src/utils/image-processing.ts
git commit -m "feat(images): resizeAndCompressImage with WebP encode + JPEG fallback

Replaces the unused resizeImageIfNeeded helper.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Wire compression into `processImageForUpload()`

**Files:**
- Modify: `src/utils/image-processing.ts` (the `processImageForUpload` function, lines 234–353)

**Interfaces:**
- Consumes: `resizeAndCompressImage()` and `ResizeOptions` from Task 2.
- Produces: `export async function processImageForUpload(file: File, maxSizeMB?: number, resizeOptions?: ResizeOptions): Promise<ProcessedImage>` — used by Task 4. Signature is backward-compatible; omitting `resizeOptions` preserves current behavior exactly.

- [ ] **Step 1: Rename the existing function and add the wrapper**

Rename the current `processImageForUpload` to `normalizeImageFormat` (NOT exported — it becomes an internal step) and change its doc comment. Then add a new exported `processImageForUpload` below it. Concretely:

1. Change line 241 from
   `export async function processImageForUpload(` to
   `async function normalizeImageFormat(`
   and update its doc comment (lines 234–240) to:

```ts
/**
 * Normalize an image file's format for the web
 * - Validates the file type
 * - Converts iOS HEIC/HEIF to JPEG using heic2any
 * - Falls back to canvas conversion for other formats
 * - Corrects wrong MIME types reported by iOS
 */
```

2. Immediately after `normalizeImageFormat`'s closing brace, add:

```ts
// Storage bucket cap (see AvatarService) — the fallback must never exceed it
const STORAGE_SAFE_MAX_BYTES = 5 * 1024 * 1024

/**
 * Process an image file for upload
 * - Normalizes format (HEIC conversion, validation, MIME correction)
 * - Optionally resizes and compresses (WebP/JPEG) when resizeOptions is given
 * - Falls back to the uncompressed file if compression fails and the file is
 *   small enough for storage
 */
export async function processImageForUpload(
  file: File,
  maxSizeMB: number = 5,
  resizeOptions?: ResizeOptions
): Promise<ProcessedImage> {
  const processed = await normalizeImageFormat(file, maxSizeMB)

  if (!resizeOptions) {
    return processed
  }

  try {
    const compressed = await resizeAndCompressImage(processed.file, resizeOptions)
    return {
      file: compressed,
      originalType: processed.originalType,
      wasConverted: processed.wasConverted || compressed !== processed.file
    }
  } catch (error) {
    console.error('Resize/compress failed:', error)

    // Graceful degradation: upload uncompressed if it fits in storage
    if (processed.file.size <= STORAGE_SAFE_MAX_BYTES) {
      console.log('Falling back to uncompressed upload')
      return processed
    }

    throw new Error('Could not process this image. Please try a different image or format.')
  }
}
```

- [ ] **Step 2: Verify typecheck and tests**

Run: `npx tsc -b && npx vitest run src/utils/image-processing.test.ts`
Expected: clean, 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils/image-processing.ts
git commit -m "feat(images): optional resize/compress step in processImageForUpload

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: AvatarService presets + 20MB input cap

**Files:**
- Modify: `src/services/avatar.service.ts` (constants at lines 5–6, `uploadAvatar` lines 20–24, `uploadBackground` lines 133–138, `createAvatarBucket` lines 261–272)

**Interfaces:**
- Consumes: `processImageForUpload(file, maxSizeMB, resizeOptions)` from Task 3; `ResizeOptions` type from Task 1.
- Produces: no interface changes — `uploadAvatar(userId, file)` / `uploadBackground(userId, file)` signatures are unchanged; callers (`UserAvatar.tsx`, `UserProfile.tsx`) need no edits.

- [ ] **Step 1: Split the size constants and add presets**

In `src/services/avatar.service.ts`, update the import (line 2) to include the type:

```ts
import { processImageForUpload, FILE_INPUT_ACCEPT, ACCEPTED_IMAGE_TYPES, type ResizeOptions } from '../utils/image-processing'
```

Replace line 6 (`private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB`) with:

```ts
  // Client-side input cap — large originals are fine, they're compressed before upload
  private static readonly MAX_INPUT_FILE_SIZE = 20 * 1024 * 1024 // 20MB
  // Storage bucket limit — unchanged; compressed output stays far below this
  private static readonly BUCKET_FILE_SIZE_LIMIT = 5 * 1024 * 1024 // 5MB

  private static readonly AVATAR_RESIZE: ResizeOptions = { maxWidth: 512, maxHeight: 512, quality: 0.82 }
  private static readonly BANNER_RESIZE: ResizeOptions = { maxWidth: 1920, maxHeight: 1920, quality: 0.82 }
```

- [ ] **Step 2: Pass presets in both upload methods**

In `uploadAvatar`, replace the `processImageForUpload` call (lines 21–24):

```ts
      const { file: processedFile, wasConverted } = await processImageForUpload(
        file,
        this.MAX_INPUT_FILE_SIZE / (1024 * 1024), // Convert to MB
        this.AVATAR_RESIZE
      )
```

In `uploadBackground`, replace the identical call (lines 135–138):

```ts
      const { file: processedFile, wasConverted } = await processImageForUpload(
        file,
        this.MAX_INPUT_FILE_SIZE / (1024 * 1024), // Convert to MB
        this.BANNER_RESIZE
      )
```

- [ ] **Step 3: Keep the bucket limit at 5MB**

In `createAvatarBucket`, change `fileSizeLimit: this.MAX_FILE_SIZE` to `fileSizeLimit: this.BUCKET_FILE_SIZE_LIMIT` (the value stays 5MB — the live bucket is not touched; this only keeps the setup helper honest).

- [ ] **Step 4: Verify typecheck, tests, lint**

Run: `npx tsc -b && npm test && npm run lint`
Expected: typecheck clean, all existing tests pass (including the 7 from Task 1), lint clean. There must be no remaining references to `MAX_FILE_SIZE`: `grep -n "MAX_FILE_SIZE" src/services/avatar.service.ts` returns only `MAX_INPUT_FILE_SIZE` / `BUCKET_FILE_SIZE_LIMIT` lines.

- [ ] **Step 5: Commit**

```bash
git add src/services/avatar.service.ts
git commit -m "feat(profile): compress avatar/banner uploads, raise input cap to 20MB

Avatars max 512px WebP/JPEG q0.82, banners max 1920px. Storage bucket
limit unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Manual browser verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: the complete feature from Tasks 1–4.
- Produces: verified feature; evidence for the completion claim.

**Constraint (from project memory):** the app is fully login-gated with no test credentials, and no accounts may be created on the shared Supabase. Verification must use the user's already-logged-in browser session (via claude-in-chrome against the dev server, usually already running at `http://localhost:5173`) — or, if no logged-in session is available, hand the checklist below to the user.

- [ ] **Step 1: Ensure the dev server is running**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`
Expected: `200`. If not, start it in the background: `npm run dev`.

- [ ] **Step 2: Exercise the avatar upload**

In the logged-in session, open the own-profile page, upload a large photo (>2MB JPEG or PNG; if available also an iPhone HEIC) as the avatar. Verify via the Network tab / `read_network_requests`:
- The storage upload request body is roughly 30–60KB, not megabytes.
- The uploaded object's filename ends in `.webp` (Chrome) — content-type `image/webp`.
- The new avatar renders correctly (header + profile) and is sharp.

- [ ] **Step 3: Exercise the banner upload**

Same page, upload a large landscape photo as the profile background. Verify:
- Upload payload roughly 150–300KB.
- Stored as `.webp`, banner renders sharp at full width.

- [ ] **Step 4: Edge cases**

- Upload an image between 5MB and 20MB → accepted (previously rejected).
- Upload a >20MB file → rejected with the size error message.
- Upload a small already-optimized image (e.g. a 20KB 200×200 JPEG) → succeeds; stored file is not meaningfully larger than the original (no-regression guard).

- [ ] **Step 5: Report results**

Report each check with its observed payload size/format. If any check fails, stop and debug before claiming completion (superpowers:verification-before-completion).

---

## Self-Review Notes

- **Spec coverage:** `fitWithin` (Task 1), `resizeAndCompressImage` + Safari fallback + no-regression guard + `resizeImageIfNeeded` deletion (Task 2), `processImageForUpload` param + error-handling fallback (Task 3), presets + 20MB cap + bucket untouched (Task 4), unit + manual testing (Tasks 1, 5). GIF flattening needs no code (GIFs flow through the canvas path). Out-of-scope items from the spec have no tasks, as intended.
- **Type consistency:** `ResizeOptions` defined once in Task 1, imported by name in Task 4; `resizeAndCompressImage(file, options)` signature identical in Tasks 2 and 3; `normalizeImageFormat` referenced only within Task 3.
- **Known simplification:** the spec's error-handling fallback condition ("standard web format and ≤5MB") is implemented as size-only (`≤ STORAGE_SAFE_MAX_BYTES`) because by that point `normalizeImageFormat` has already guaranteed a standard web format — non-standard formats were converted or rejected earlier.
