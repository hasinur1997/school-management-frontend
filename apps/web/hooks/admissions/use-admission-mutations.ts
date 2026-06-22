"use client"

/**
 * Admission review write mutations (task 2.6):
 *   - `POST /admissions/{id}/approve` — create the student + dispatch credentials
 *   - `POST /admissions/{id}/reject`  — reject with a required reason
 *
 * Both invalidate `["admissions"]` (the queue + detail refetch, so a processed
 * application leaves the pending queue) and `["students"]` (approval creates a
 * student). The API stays authoritative: it generates/dispatches credentials,
 * enforces the state machine (`422`/conflict on an already-processed
 * application), and scopes by branch. The UI only triggers and reflects the
 * server-side decision — no credentials are built client-side.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  Admission,
  AdmissionApproveInput,
  AdmissionApproveResponse,
} from "@/types/admission"

function useInvalidateAdmissions() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admissions"] })
    void queryClient.invalidateQueries({ queryKey: ["students"] })
  }
}

export function useApproveAdmission() {
  const invalidate = useInvalidateAdmissions()
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
