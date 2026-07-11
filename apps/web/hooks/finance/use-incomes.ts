"use client"

/**
 * `useIncomes(params)` — reads the paginated income ledger
 * (`GET /incomes?category_id=&from=&to=&search=&page=&per_page=`, backend 11.2),
 * returning both the rows and the pagination `meta`.
 *
 * Filters and the page fold into the query key (alongside the super-admin
 * `branch`) so each combination caches separately; only set filters are sent
 * (empty ones are dropped). `keepPreviousData` keeps the current page visible
 * while the next loads. Writes invalidate `["incomes"]`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Income, IncomeListParams } from "@/types/finance"

export const INCOMES_PER_PAGE = 15

/** Drop empty filters so the request only carries active ones. */
function toParams(params: IncomeListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? INCOMES_PER_PAGE,
  }
  if (params.category_id) query.category_id = params.category_id
  if (params.from) query.from = params.from
  if (params.to) query.to = params.to
  if (params.search) query.search = params.search
  return query
}

export function useIncomes(params: IncomeListParams, enabled = true) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("incomes", "list", { ...query, branch: branchParam }),
    queryFn: () => requestPaginated<Income>("/incomes", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
