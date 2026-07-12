"use client"

/**
 * ID card generation hooks (task 6.1). PDFs are streamed by the API and only
 * triggered + saved client-side (`code-standards.md`, never rendered here):
 *
 *  - `useDownloadIdCard` streams one student's card (`GET /students/{id}/id-card`)
 *    straight to a browser download.
 *  - `useCreateIdCardBatch` queues a whole-class batch (`POST /id-cards/batch`,
 *    202); `useIdCardBatchStatus` polls it to `done`/`failed` with backoff; and
 *    `useDownloadIdCardBatch` saves the finished merged PDF.
 *
 * The raw `http` client (not the envelope `api`) is used for the blob endpoints
 * so the streamed body is read as a `Blob`; a normalized `ApiError` still
 * surfaces on failure via the shared response interceptor.
 */

import { useMutation, useQuery, type QueryFunctionContext } from "@tanstack/react-query"

import { api, http, queryKey, STALE_TIME } from "@/lib/api"
import { filenameFromContentDisposition, saveBlob } from "@/lib/download"
import type {
  IdCardBatchCreated,
  IdCardBatchInput,
  IdCardBatchState,
} from "@/types/document"
import { isTerminalBatchStatus } from "@/types/document"

/** Poll cadence: first ping soon, then back off toward a steady ceiling. */
const POLL_BASE_MS = 1500
const POLL_MAX_MS = 6000

/** Fetch a streamed PDF as a blob and save it under the API's (or fallback) name. */
async function downloadPdf(url: string, fallbackName: string): Promise<void> {
  const response = await http.get<Blob>(url, { responseType: "blob" })
  const filename = filenameFromContentDisposition(
    response.headers["content-disposition"] as string | undefined,
    fallbackName
  )
  saveBlob(response.data, filename)
}

/**
 * Fetch an image (the student photo) and resolve it to a `data:` URL. The single
 * card is rendered on the client — both the on-screen preview and the exported
 * PDF read from this same resolved source, so they stay pixel-identical and the
 * PDF rasterizer never trips over a cross-origin image tainting the canvas. A
 * fetch that fails (CORS/network/missing) resolves to `null` so the card falls
 * back to the initials avatar consistently in both surfaces.
 */
export function usePhotoDataUrl(url: string | null | undefined) {
  return useQuery({
    queryKey: queryKey("id-cards", "photo", { url: url ?? "" }),
    enabled: Boolean(url),
    staleTime: STALE_TIME.REFERENCE,
    retry: false,
    queryFn: async (): Promise<string | null> => {
      try {
        const response = await fetch(url as string, { mode: "cors" })
        if (!response.ok) return null
        const blob = await response.blob()
        return await new Promise<string | null>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(blob)
        })
      } catch {
        return null
      }
    },
  })
}

/** Queue a class (optionally single-section) ID card batch build. */
export function useCreateIdCardBatch() {
  return useMutation({
    mutationFn: (input: IdCardBatchInput) =>
      api.post<IdCardBatchCreated>("/id-cards/batch", {
        class_id: input.class_id,
        ...(input.session_id ? { session_id: input.session_id } : {}),
        ...(input.section_id ? { section_id: input.section_id } : {}),
      }),
  })
}

/**
 * Poll a queued batch's status. Enabled only once a `batchId` exists; stops
 * refetching once the status is terminal (`done`/`failed`). The interval grows
 * with each attempt so a long-running build isn't hammered.
 */
export function useIdCardBatchStatus(batchId: string | null) {
  return useQuery({
    queryKey: queryKey("id-cards", "batch", { batch: batchId ?? "" }),
    enabled: batchId !== null,
    queryFn: ({ signal }: QueryFunctionContext) =>
      api.get<IdCardBatchState>(`/id-cards/batch/${batchId}`, { signal }),
    // Never serve a stale terminal status from a previous batch id.
    gcTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status && isTerminalBatchStatus(status)) return false
      const attempts = query.state.dataUpdateCount
      return Math.min(POLL_BASE_MS + attempts * POLL_BASE_MS, POLL_MAX_MS)
    },
  })
}

/** Stream and save a finished batch's merged PDF. */
export function useDownloadIdCardBatch() {
  return useMutation({
    mutationFn: (batchId: string) =>
      downloadPdf(
        `/id-cards/batch/${batchId}/download`,
        `idcards-batch-${batchId}.pdf`
      ),
  })
}
