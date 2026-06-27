"use client"

/**
 * Admission review write mutations (task 2.6):
 *   - `POST   /admissions/{id}/approve` — create the student + dispatch credentials
 *   - `POST   /admissions/{id}/reject`  — reject with a required reason
 *
 * Trash lifecycle (soft delete):
 *   - `DELETE /admissions/{id}`              — soft delete (move to trash)
 *   - `POST   /admissions/bulk-delete`       — soft delete many
 *   - `POST   /admissions/{id}/restore`      — restore from trash
 *   - `POST   /admissions/bulk-restore`      — restore many
 *   - `DELETE /admissions/{id}/force`        — permanently delete from trash
 *   - `POST   /admissions/bulk-force-delete` — permanently delete many
 *
 * Every mutation invalidates `["admissions"]` (the live queue, the detail, and
 * the trash listing all share that key root, so each refetches). Approval also
 * invalidates `["students"]` since it creates a student. The API stays
 * authoritative: it generates/dispatches credentials, enforces the state machine
 * (`422`/conflict on an already-processed application), owns the soft-delete /
 * restore / force-delete transitions, and scopes by branch. The UI only triggers
 * and reflects the server-side decision.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  Admission,
  AdmissionApproveInput,
  AdmissionApproveResponse,
} from "@/types/admission"

function useInvalidateAdmissions(alsoStudents = false) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admissions"] })
    if (alsoStudents) {
      void queryClient.invalidateQueries({ queryKey: ["students"] })
    }
  }
}

export function useApproveAdmission() {
  const invalidate = useInvalidateAdmissions(true)
  return useMutation({
    mutationFn: ({ id, ...body }: AdmissionApproveInput & { id: number }) =>
      api.post<AdmissionApproveResponse>(`/admissions/${id}/approve`, body),
    onSuccess: invalidate,
  })
}

export function useRejectAdmission() {
  const invalidate = useInvalidateAdmissions()
  return useMutation({
    mutationFn: ({ id, rejection_reason }: { id: number; rejection_reason: string }) =>
      api.post<Admission>(`/admissions/${id}/reject`, { rejection_reason }),
    onSuccess: invalidate,
  })
}

/** Soft delete a single application — moves it to the trash. */
export function useDeleteAdmission() {
  const invalidate = useInvalidateAdmissions()
  return useMutation({
    mutationFn: (id: number) => api.delete<null>(`/admissions/${id}`),
    onSuccess: invalidate,
  })
}

/** Soft delete many applications in one call. */
export function useBulkDeleteAdmission() {
  const invalidate = useInvalidateAdmissions()
  return useMutation({
    mutationFn: (ids: number[]) =>
      api.post<{ deleted: number }>("/admissions/bulk-delete", { ids }),
    onSuccess: invalidate,
  })
}

/** Restore a single soft-deleted application out of the trash. */
export function useRestoreAdmission() {
  const invalidate = useInvalidateAdmissions()
  return useMutation({
    mutationFn: (id: number) => api.post<Admission>(`/admissions/${id}/restore`),
    onSuccess: invalidate,
  })
}

/** Restore many soft-deleted applications in one call. */
export function useBulkRestoreAdmission() {
  const invalidate = useInvalidateAdmissions()
  return useMutation({
    mutationFn: (ids: number[]) =>
      api.post<{ restored: number }>("/admissions/bulk-restore", { ids }),
    onSuccess: invalidate,
  })
}

/** Permanently delete a single application from the trash. Irreversible. */
export function useForceDeleteAdmission() {
  const invalidate = useInvalidateAdmissions()
  return useMutation({
    mutationFn: (id: number) => api.delete<null>(`/admissions/${id}/force`),
    onSuccess: invalidate,
  })
}

/** Permanently delete many applications from the trash. Irreversible. */
export function useBulkForceDeleteAdmission() {
  const invalidate = useInvalidateAdmissions()
  return useMutation({
    mutationFn: (ids: number[]) =>
      api.post<{ deleted: number }>("/admissions/bulk-force-delete", { ids }),
    onSuccess: invalidate,
  })
}
