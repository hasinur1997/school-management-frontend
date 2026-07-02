"use client"

/**
 * `useMarkMatrix({ exam_id, class_id, section_id? })` — reads
 * `GET /exams/{id}/marks/matrix?class_id=&section_id=`, the multi-subject entry
 * grid for a class of an exam: every subject column of the class plus the active
 * roster, each student carrying one mark cell per subject. Section is an
 * optional filter — omit it to load the whole class (all sections).
 *
 * Disabled until exam + class are set, so the screen can render a setup state.
 * `class_id`/`section_id` are sent as opaque `public_id` hashes; the backend's
 * public-id middleware resolves them before validation.
 */

import { useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { MarkMatrix, MarkMatrixParams } from "@/types/mark"

export function useMarkMatrix(params: MarkMatrixParams) {
  const { branchParam } = useBranch()
  const examId = params.exam_id
  const classId = params.class_id
  const sectionId = params.section_id || null
  const branchId = params.branch_id || null
  const enabled =
    examId != null && examId !== "" && classId != null && classId !== ""

  return useQuery({
    queryKey: queryKey("marks", "matrix", {
      exam_id: examId ?? null,
      class_id: classId ?? null,
      section_id: sectionId,
      branch: branchId ?? branchParam,
    }),
    queryFn: () =>
      api.get<MarkMatrix>(`/exams/${examId}/marks/matrix`, {
        params: {
          class_id: classId,
          ...(sectionId ? { section_id: sectionId } : {}),
          // Screen-local branch filter; wins over the active branch in the
          // request interceptor.
          ...(branchId ? { branch_id: branchId } : {}),
        },
      }),
    enabled,
    staleTime: STALE_TIME.SHORT,
  })
}
