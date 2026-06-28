"use client"

/**
 * `useMarkSheet({ exam_id, subject_id, section_id })` — reads
 * `GET /exams/{id}/marks/sheet?subject_id=&section_id=`, the roster entry source
 * for one subject+section of an exam (task 4.2). The query stays disabled until
 * all three are set, so the screen can render a purposeful setup state.
 *
 * `subject_id`/`section_id` are sent as opaque `public_id` hashes; the backend's
 * public-id middleware resolves them before validation.
 */

import { useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { MarkSheet, MarkSheetParams } from "@/types/mark"

export function useMarkSheet(params: MarkSheetParams) {
  const { branchParam } = useBranch()
  const examId = params.exam_id
  const enabled =
    examId != null &&
    examId !== "" &&
    params.subject_id != null &&
    params.section_id != null

  const query = {
    subject_id: params.subject_id,
    section_id: params.section_id,
  }

  return useQuery({
    queryKey: queryKey("marks", "sheet", {
      exam_id: examId ?? null,
      subject_id: params.subject_id ?? null,
      section_id: params.section_id ?? null,
      branch: branchParam,
    }),
    queryFn: () =>
      api.get<MarkSheet>(`/exams/${examId}/marks/sheet`, { params: query }),
    enabled,
    staleTime: STALE_TIME.SHORT,
  })
}
