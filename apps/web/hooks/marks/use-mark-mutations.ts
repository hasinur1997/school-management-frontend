"use client"

/**
 * Marks write mutations (task 4.2):
 *   - `POST /exams/{id}/marks`            — bulk upsert of one subject's marks.
 *   - `POST /exams/{id}/marks/publish`    — lock the exam (freeze marks).
 *   - `POST /exams/{id}/marks/unpublish`  — reopen a published exam for edits.
 *
 * The API stays authoritative: it owns the published-freeze (`409`), the
 * subject/enrollment/range checks (`422`, keyed per row at
 * `marks.{i}.obtained_marks`), the teacher-assignment rule (`403`), and the
 * grade snapshot. A successful write invalidates `["marks"]` (and `["exams"]`
 * for publish, since the exam status changes) so the grid reloads the server's
 * current state. Grade + GPA are server-owned and never computed here.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { SaveMarksInput, SaveMarksResult } from "@/types/mark"

export function useSaveMarks(examId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveMarksInput) =>
      api.post<SaveMarksResult>(`/exams/${examId}/marks`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marks"] })
    },
  })
}

/** Result of the publish/unpublish lock toggle — the exam's new status. */
interface MarksLockResult {
  status: string
}

export function usePublishMarks(examId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<MarksLockResult>(`/exams/${examId}/marks/publish`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marks"] })
      void queryClient.invalidateQueries({ queryKey: ["exams"] })
    },
  })
}

export function useUnpublishMarks(examId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<MarksLockResult>(`/exams/${examId}/marks/unpublish`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marks"] })
      void queryClient.invalidateQueries({ queryKey: ["exams"] })
    },
  })
}
