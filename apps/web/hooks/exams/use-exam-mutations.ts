"use client"

/**
 * Exam write mutations (task 4.1):
 *   - `POST /exams`      — create (branch derived server-side from the class)
 *   - `PUT  /exams/{id}` — update name/dates/status (identity is immutable)
 *
 * Each invalidates the `["exams"]` key so the list refetches after a write. The
 * API stays authoritative on validation (`422` → field errors at the form), the
 * `(session, class, type)` uniqueness, the published-freeze (`409`), and the
 * status-regression guard. Exam type drives downstream result weighting, which
 * is computed server-side; the form only sets the type.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Exam, ExamInput, ExamUpdateInput } from "@/types/exam"

function useInvalidateExams() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["exams"] })
  }
}

export function useCreateExam() {
  const invalidate = useInvalidateExams()
  return useMutation({
    mutationFn: (input: ExamInput) => api.post<Exam>("/exams", input),
    onSuccess: invalidate,
  })
}

export function useUpdateExam() {
  const invalidate = useInvalidateExams()
  return useMutation({
    mutationFn: ({ id, ...input }: ExamUpdateInput & { id: string }) =>
      api.put<Exam>(`/exams/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteExam() {
  const invalidate = useInvalidateExams()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/exams/${id}`),
    onSuccess: invalidate,
  })
}

export function useBulkDeleteExam() {
  const invalidate = useInvalidateExams()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<{ deleted: number }>("/exams/bulk-delete", { ids }),
    onSuccess: invalidate,
  })
}
