"use client"

/**
 * `useExpenses(params)` — reads the paginated expense ledger
 * (`GET /expenses?category_id=&from=&to=&search=&page=&per_page=`, backend 11.3),
 * returning both the rows and the pagination `meta`.
 *
 * Mirrors `useIncomes`: filters + page fold into the query key (alongside the
 * super-admin `branch`), only set filters are sent, `keepPreviousData` keeps the
 * page visible while the next loads. Writes invalidate `["expenses"]`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Expense, ExpenseListParams } from "@/types/finance"

export const EXPENSES_PER_PAGE = 15

/** Drop empty filters so the request only carries active ones. */
function toParams(params: ExpenseListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? EXPENSES_PER_PAGE,
  }
  if (params.category_id) query.category_id = params.category_id
  if (params.from) query.from = params.from
  if (params.to) query.to = params.to
  if (params.search) query.search = params.search
  return query
}

export function useExpenses(params: ExpenseListParams, enabled = true) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("expenses", "list", { ...query, branch: branchParam }),
    queryFn: () => requestPaginated<Expense>("/expenses", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
