"use client"

/**
 * `useTrashedStudents(params)` — reads the soft-deleted student list
 * (`GET /students/trash`) with the same filters as the live student list.
 * Mutations for delete / restore / force-delete invalidate the `students` key,
 * so this trash view refetches alongside live lists and detail queries.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { StudentListItem, StudentListParams } from "@/types/student"

import { toStudentQuery } from "./use-students"

export function useTrashedStudents(params: StudentListParams) {
  const { branchParam } = useBranch()
  const query = toStudentQuery(params)

  return useQuery({
    queryKey: queryKey("students", "trash", { ...query, branch: branchParam }),
    queryFn: () =>
      requestPaginated<StudentListItem>("/students/trash", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.SHORT,
  })
}
