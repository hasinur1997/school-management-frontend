/**
 * Draft persistence for the public admission wizard. The whole application — the
 * current step, the furthest step reached, every field, the photo, and any
 * documents — is mirrored to `localStorage` so a page refresh (or an accidental
 * navigation) never loses the visitor's progress.
 *
 * Files can't be JSON-serialized, so the photo/documents are stored as data URLs
 * and reconstructed into `File`s on load. `localStorage` has a small quota, so
 * `saveAdmissionDraft` degrades gracefully: if the full payload won't fit it
 * retries without documents, then without the photo, so the text fields are
 * always kept even when the binaries are too large. The draft is cleared on a
 * successful submit (and when returning from the payment gateway).
 */

import { defaultValues, STEPS, type AdmissionFormValues } from "./schema"
import { fileToDataUrl } from "./application-document"

const STORAGE_KEY = "admission-draft-v1"

interface SerializedFile {
  name: string
  type: string
  dataUrl: string
}

interface StoredDraft {
  step: number
  furthest: number
  /** Text/number/boolean fields only — files are stored separately below. */
  values: Partial<Omit<AdmissionFormValues, "photo" | "documents">>
  photo: SerializedFile | null
  documents: SerializedFile[]
}

export interface RestoredDraft {
  step: number
  furthest: number
  values: AdmissionFormValues
}

/** Re-serializing the same `File` on every keystroke is wasteful; cache by identity. */
const fileCache = new WeakMap<File, SerializedFile>()

function clampStep(value: unknown): number {
  const n = typeof value === "number" ? value : 0
  return Math.min(Math.max(0, Math.trunc(n)), STEPS.length - 1)
}

async function serializeFile(file: File): Promise<SerializedFile> {
  const cached = fileCache.get(file)
  if (cached) return cached
  const serialized: SerializedFile = {
    name: file.name,
    type: file.type,
    dataUrl: await fileToDataUrl(file),
  }
  fileCache.set(file, serialized)
  return serialized
}

function deserializeFile(file: SerializedFile): File | null {
  try {
    const comma = file.dataUrl.indexOf(",")
    const base64 = comma >= 0 ? file.dataUrl.slice(comma + 1) : file.dataUrl
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const restored = new File([bytes], file.name, { type: file.type })
    // Keep the cache primed so the restored file isn't re-encoded on first save.
    fileCache.set(restored, file)
    return restored
  } catch {
    return null
  }
}

/** Read and rehydrate the saved draft, or `null` when there's nothing to restore. */
export function loadAdmissionDraft(): RestoredDraft | null {
  if (typeof window === "undefined") return null
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const draft = JSON.parse(raw) as StoredDraft
    const photo = draft.photo ? deserializeFile(draft.photo) : null
    const documents = (draft.documents ?? [])
      .map(deserializeFile)
      .filter((f): f is File => f !== null)
    return {
      step: clampStep(draft.step),
      furthest: clampStep(draft.furthest),
      values: { ...defaultValues, ...draft.values, photo, documents },
    }
  } catch {
    return null
  }
}

/**
 * Persist the wizard state. Files are encoded to data URLs; if the payload
 * exceeds the storage quota it is retried with progressively less binary data so
 * the text fields are never dropped.
 */
export async function saveAdmissionDraft(
  values: AdmissionFormValues,
  step: number,
  furthest: number
): Promise<void> {
  if (typeof window === "undefined") return

  const { photo, documents, ...rest } = values
  const photoSerialized = photo ? await serializeFile(photo) : null
  const documentsSerialized = await Promise.all(documents.map(serializeFile))

  const base = { step, furthest, values: rest }
  const attempts: StoredDraft[] = [
    { ...base, photo: photoSerialized, documents: documentsSerialized },
    { ...base, photo: photoSerialized, documents: [] },
    { ...base, photo: null, documents: [] },
  ]

  for (const attempt of attempts) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt))
      return
    } catch {
      // Quota exceeded — fall through to a smaller payload.
    }
  }
}

/** Remove the saved draft (after a successful submit, or on gateway return). */
export function clearAdmissionDraft(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore — nothing more we can do.
  }
}
