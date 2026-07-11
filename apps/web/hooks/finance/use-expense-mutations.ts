"use client"

/**
 * Expense write mutations (task F-5.4, backend 11.3):
 *   - `POST   /expenses`      — create a manual expense (branch stamped server-side)
 *   - `PUT    /expenses/{id}` — update a manual expense
 *   - `DELETE /expenses/{id}` — delete a manual expense
 *
 * Each invalidates the `["expenses"]` key so the list refetches after a write.
 * The API stays authoritative on validation (`422` → field errors, including the
 * expense-type category rule). Unlike incomes, expenses carry no system rows.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Expense, ExpenseInput } from "@/types/finance"

function useInvalidateExpenses() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses"] })
  }
}

export function useCreateExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: (input: ExpenseInput) => api.post<Expense>("/expenses", input),
    onSuccess: invalidate,
  })
}

export function useUpdateExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: ({ id, ...input }: ExpenseInput & { id: string }) =>
      api.put<Expense>(`/expenses/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/expenses/${id}`),
    onSuccess: invalidate,
  })
}
