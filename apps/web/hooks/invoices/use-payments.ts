"use client"

/**
 * `usePayments(params)` — reads the paginated staff payments list
 * (`GET /payments?status=&method=&from=&to=&search=&page=&per_page=`, backend
 * 10.6), returning both the rows and the pagination `meta`. Staff-only
 * (`invoice.view`, the same gate as the invoice list); the API's `403` stays the
 * real boundary. Each row carries its settled invoice (number, period, student).
 *
 * Filters and the page fold into the query key (alongside the super-admin
 * `branch`) so each combination caches separately; only set filters are sent
 * (`all`/empty are dropped). `keepPreviousData` keeps the current page visible
 * while the next loads.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Payment, PaymentListParams } from "@/types/invoice"

export const PAYMENTS_PER_PAGE = 15

/** Drop empty/`all` filters so the request only carries active ones. */
function toParams(params: PaymentListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? PAYMENTS_PER_PAGE,
  }
  if (params.status && params.status !== "all") query.status = params.status
  if (params.method && params.method !== "all") query.method = params.method
  if (params.from) query.from = params.from
  if (params.to) query.to = params.to
  const search = params.search?.trim()
  if (search) query.search = search
  return query
}

export function usePayments(params: PaymentListParams, enabled = true) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("payments", "list", {
      ...query,
      branch: params.branch_id ?? branchParam,
    }),
    queryFn: () => requestPaginated<Payment>("/payments", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
