"use client"

/**
 * `useMyInvoices(params)` — reads the caller's own invoices (student) or a
 * linked child's invoices (parent, via `student_id`) for a year
 * (`GET /me/invoices`, task F-5.2), paginated. Students always get their own —
 * any `student_id` is ignored; a parent must pass a linked child's `student_id`
 * (an unlinked/missing one → `404`, surfaced as an access state).
 *
 * The optional `student_id` and page fold into the query key so a parent's
 * per-child views cache separately.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type { Invoice, MyInvoiceParams } from "@/types/invoice"

export const MY_INVOICES_PER_PAGE = 15

/** Drop empty filters so the request only carries active ones. */
function toParams(params: MyInvoiceParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? MY_INVOICES_PER_PAGE,
  }
  if (params.student_id) query.student_id = params.student_id
  if (params.year) query.year = params.year
  return query
}

export function useMyInvoices(params: MyInvoiceParams = {}, enabled = true) {
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("invoices", "me", query),
    queryFn: () => requestPaginated<Invoice>("/me/invoices", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
