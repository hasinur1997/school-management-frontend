"use client"

/**
 * `useCategories(type)` — reads the shared income/expense category list
 * (`GET /categories?type=&per_page=100`, backend 11.1). It backs the reusable
 * `CategorySelect` consumed by the income/expense (5.4) and asset (5.5) forms
 * and filters.
 *
 * Categories are reference data scoped to a branch, so this caches long and
 * folds the active branch into the key (a super admin switching branch gets a
 * separate cache entry; `branch_id` itself is attached by the API interceptor).
 * Category writes (task 5.6) invalidate the `["categories"]` key. A single page
 * of 100 covers a branch's category list.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Category, CategoryType } from "@/types/finance"

export const CATEGORIES_PER_PAGE = 100

export function useCategories(type?: CategoryType, enabled = true) {
  const { branchParam } = useBranch()

  const params: Record<string, string | number> = {
    per_page: CATEGORIES_PER_PAGE,
  }
  if (type) params.type = type

  return useQuery({
    queryKey: queryKey("categories", "list", {
      ...(type ? { type } : {}),
      branch: branchParam,
    }),
    queryFn: () => api.get<Category[]>("/categories", { params }),
    enabled,
    staleTime: STALE_TIME.REFERENCE,
  })
}
