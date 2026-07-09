"use client"

/**
 * Fee-structure write mutations (task F-5.1, backend 10.1):
 *   - `POST   /fee-structures`      — create (branch stamped server-side)
 *   - `PUT    /fee-structures/{id}` — update name/description/fee_type/amount
 *   - `DELETE /fee-structures/{id}` — delete (blocked when referenced by invoices)
 *
 * Each invalidates the `["fee-structures"]` key so the list refetches after a
 * write. The API stays authoritative on validation (`422` → field errors), the
 * `(session, class, name)` uniqueness, and the delete guard (`422` when the fee
 * has been used in invoices, via the FK RESTRICT). Amount edits affect only
 * future invoice generation — existing invoices keep their copied amount.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  FeeStructure,
  FeeStructureInput,
  FeeStructureUpdateInput,
} from "@/types/fee"

function useInvalidateFeeStructures() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["fee-structures"] })
  }
}

export function useCreateFeeStructure() {
  const invalidate = useInvalidateFeeStructures()
  return useMutation({
    mutationFn: (input: FeeStructureInput) =>
      api.post<FeeStructure>("/fee-structures", input),
    onSuccess: invalidate,
  })
}

export function useUpdateFeeStructure() {
  const invalidate = useInvalidateFeeStructures()
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: FeeStructureUpdateInput & { id: string }) =>
      api.put<FeeStructure>(`/fee-structures/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteFeeStructure() {
  const invalidate = useInvalidateFeeStructures()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/fee-structures/${id}`),
    onSuccess: invalidate,
  })
}
