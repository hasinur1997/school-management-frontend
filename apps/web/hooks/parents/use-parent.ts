"use client"

/**
 * Parent detail read for `/parents/[id]`.
 *
 * The backend contract currently exposes `GET /parents` with linked students,
 * but no `GET /parents/{id}` detail route. To support a direct detail URL
 * without inventing an endpoint, this scans the paginated parent list by public
 * id. When the backend adds a detail endpoint, replace this queryFn with a
 * direct `api.get<ParentProfile>(/parents/{id})`.
 */

import { useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type { ParentProfile } from "@/types/parent"

const DETAIL_PAGE_SIZE = 100

async function findParent(id: string): Promise<ParentProfile | null> {
  let page = 1
  let lastPage = 1

  do {
    const result = await requestPaginated<ParentProfile>("/parents", {
      params: { page, per_page: DETAIL_PAGE_SIZE },
    })
    const found = result.data.find((parent) => parent.id === id)
    if (found) return found

    lastPage = result.meta?.last_page ?? page
    page += 1
  } while (page <= lastPage)

  return null
}

export function useParent(id: string | null) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("parents", "detail", { id, branch: branchParam }),
    queryFn: () => (id ? findParent(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: STALE_TIME.STANDARD,
  })
}
