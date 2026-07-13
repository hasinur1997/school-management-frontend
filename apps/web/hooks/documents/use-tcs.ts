"use client"

/**
 * Transfer certificate hooks (task 6.2). Issuing a TC retires a student and
 * stores the one legal PDF (`POST /students/{id}/tc`, `tc.issue`); the list /
 * detail reads (`GET /tcs`, `GET /tcs/{tc}`, `tc.view`) surface the issued
 * certificates and their stored PDF thereafter.
 *
 *  - `useTcs` — the paginated, filterable branch list.
 *  - `useTc` — one certificate.
 *  - `useIssueTc` — issues a TC, then invalidates the student (its status flips
 *    to tc) and TC caches so the profile + lists reflect the change.
 *  - `useDownloadTc` — streams the stored PDF straight to a browser download.
 *
 * The blob endpoint uses the raw `http` client (not the envelope `api`) so the
 * streamed body is read as a `Blob`; the PDF is triggered + saved only, never
 * rendered client-side (`code-standards.md`). It is fetched by tc id
 * (`/tcs/{id}/pdf`) through the shared client base rather than the resource's
 * `pdf_url` (which already carries the `/api/v1` prefix the base supplies).
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api, http, queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { filenameFromContentDisposition, saveBlob } from "@/lib/download"
import { useBranch } from "@/components/branch/branch-provider"
import type {
  IssueTcInput,
  TcListParams,
  TransferCertificate,
} from "@/types/document"

export const TCS_PER_PAGE = 15

/** Drop empty filters so the request only carries active ones. */
function toParams(params: TcListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? TCS_PER_PAGE,
  }
  if (params.from) query.from = params.from
  if (params.to) query.to = params.to
  const search = params.search?.trim()
  if (search) query.search = search
  return query
}

/** Stream a TC PDF as a blob and save it under the API's (or fallback) name. */
async function downloadTcPdf(id: string, fallbackName: string): Promise<void> {
  const response = await http.get<Blob>(`/tcs/${id}/pdf`, {
    responseType: "blob",
  })
  const filename = filenameFromContentDisposition(
    response.headers["content-disposition"] as string | undefined,
    fallbackName
  )
  saveBlob(response.data, filename)
}

/** The paginated TC list for the caller's branch. */
export function useTcs(params: TcListParams, enabled = true) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("tcs", "list", {
      ...query,
      branch: params.branch_id ?? branchParam,
    }),
    queryFn: () =>
      requestPaginated<TransferCertificate>("/tcs", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}

/** One transfer certificate by id. Disabled until an id is present. */
export function useTc(id: string | null) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("tcs", "detail", { id: id ?? "", branch: branchParam }),
    queryFn: () => api.get<TransferCertificate>(`/tcs/${id}`),
    enabled: id != null,
    staleTime: STALE_TIME.STANDARD,
  })
}

/**
 * Issue a transfer certificate for a student. On success the student's status
 * flips to tc server-side, so the student and TC caches are invalidated to
 * reflect it (profile badge, lists). Returns the created TC (with its `tc_no`)
 * so the caller can download the streamed PDF.
 */
export function useIssueTc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      studentId,
      input,
    }: {
      studentId: string
      input: IssueTcInput
    }) => api.post<TransferCertificate>(`/students/${studentId}/tc`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] })
      void queryClient.invalidateQueries({ queryKey: ["tcs"] })
    },
  })
}

/** Stream and save a TC's stored PDF. */
export function useDownloadTc() {
  return useMutation({
    mutationFn: (tc: Pick<TransferCertificate, "id" | "tc_no">) =>
      downloadTcPdf(tc.id, `tc-${tc.tc_no}.pdf`),
  })
}
