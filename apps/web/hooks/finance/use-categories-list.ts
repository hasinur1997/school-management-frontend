"use client"

/**
 * `useCategoriesList(params)` — reads the paginated category list for the
 * management screen (`GET /categories?type=&page=&per_page=`, backend 11.1),
 * returning both the rows and the pagination `meta`.
 *
 * This differs from `useCategories` (the unwrapped, cache-long select source):
 * the manager needs pagination and a smaller page, so it reads through
 * `requestPaginated` and folds the `type` filter + page (and the super-admin
 * `branch`) into the key. Category writes (task 5.6) invalidate `["categories"]`,
 * refreshing both this list and every `CategorySelect`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Category, CategoryListParams } from "@/types/finance"

export const CATEGORIES_LIST_PER_PAGE = 15

/** Drop the empty type filter so the request only carries active params. */
function toParams(params: CategoryListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? CATEGORIES_LIST_PER_PAGE,
  }
  if (params.type) query.type = params.type
  return query
}

export function useCategoriesList(params: CategoryListParams, enabled = true) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("categories", "list", { ...query, branch: branchParam }),
    queryFn: () => requestPaginated<Category>("/categories", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.REFERENCE,
  })
}
