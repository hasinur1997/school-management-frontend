"use client"

/**
 * Income write mutations (task F-5.4, backend 11.2):
 *   - `POST   /incomes`      — create a manual income (branch stamped server-side)
 *   - `PUT    /incomes/{id}` — update a manual income
 *   - `DELETE /incomes/{id}` — delete a manual income
 *
 * Each invalidates the `["incomes"]` key so the list refetches after a write.
 * The API stays authoritative on validation (`422` → field errors, including the
 * income-type category rule) and on the **system-row guard**: editing or
 * deleting a fee-payment income (`is_system`) is rejected with `403` — the UI
 * hides those actions, but the API is the real boundary.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Income, IncomeInput } from "@/types/finance"

function useInvalidateIncomes() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["incomes"] })
  }
}

export function useCreateIncome() {
  const invalidate = useInvalidateIncomes()
  return useMutation({
    mutationFn: (input: IncomeInput) => api.post<Income>("/incomes", input),
    onSuccess: invalidate,
  })
}

export function useUpdateIncome() {
  const invalidate = useInvalidateIncomes()
  return useMutation({
    mutationFn: ({ id, ...input }: IncomeInput & { id: string }) =>
      api.put<Income>(`/incomes/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteIncome() {
  const invalidate = useInvalidateIncomes()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/incomes/${id}`),
    onSuccess: invalidate,
  })
}
