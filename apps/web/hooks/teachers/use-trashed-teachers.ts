"use client"

/**
 * `useTrashedTeachers(params)` — reads the soft-deleted teacher list
 * (`GET /teachers/trash`) with the same search/status/pagination shape as
 * `/teachers`. Delete / restore / force-delete mutations invalidate the shared
 * `teachers` key, so the live list and trash list stay reconciled.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type { Teacher, TeacherListParams } from "@/types/teacher"

import { toTeacherQuery } from "./use-teachers"

export function useTrashedTeachers(params: TeacherListParams) {
  const { branchParam } = useBranch()
  const query = toTeacherQuery(params)

  return useQuery({
    queryKey: queryKey("teachers", "trash", { ...query, branch: branchParam }),
    queryFn: () =>
      requestPaginated<Teacher>("/teachers/trash", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.SHORT,
  })
}
