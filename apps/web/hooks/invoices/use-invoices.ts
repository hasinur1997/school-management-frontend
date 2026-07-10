"use client"

/**
 * `useInvoices(params)` — reads the paginated staff invoice list
 * (`GET /invoices?student_id=&class_id=&status=&month=&year=&page=&per_page=`,
 * task F-5.2), returning both the rows and the pagination `meta`. Staff-only
 * (`invoice.view`); the API's `403` stays the real boundary.
 *
 * Filters and the page fold into the query key (alongside the super-admin
 * `branch`) so each combination caches separately; only set filters are sent
 * (`all`/empty are dropped). `keepPreviousData` keeps the current page visible
 * while the next loads.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Invoice, InvoiceListParams } from "@/types/invoice"

export const INVOICES_PER_PAGE = 15

/** Drop empty/`all` filters so the request only carries active ones. */
function toParams(params: InvoiceListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? INVOICES_PER_PAGE,
  }
  if (params.student_id) query.student_id = params.student_id
  if (params.class_id) query.class_id = params.class_id
  if (params.status && params.status !== "all") query.status = params.status
  if (params.month) query.month = params.month
  if (params.year) query.year = params.year
  const search = params.search?.trim()
  if (search) query.search = search
  return query
}

export function useInvoices(params: InvoiceListParams, enabled = true) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("invoices", "list", {
      ...query,
      branch: params.branch_id ?? branchParam,
    }),
    queryFn: () => requestPaginated<Invoice>("/invoices", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
