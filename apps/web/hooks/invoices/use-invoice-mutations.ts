"use client"

/**
 * Invoice write mutations (task F-5.2, backend 10.2). Manual CRUD alongside
 * bulk generation, all guarded by `fee.manage`:
 *   - `POST   /invoices`      — create one invoice for a student's active enrollment
 *   - `PUT    /invoices/{id}` — update amount / due date / period
 *   - `DELETE /invoices/{id}` — delete (blocked with a `422` once a payment exists)
 *
 * Each invalidates the `["invoices"]` key so the list, detail, and per-student
 * panels refetch after a write. The API stays authoritative on validation
 * (`422` → field errors), the (student, month, year) uniqueness, and the delete
 * guard; `paid_amount`/`status` are payment-derived and never sent here.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  Invoice,
  InvoiceInput,
  InvoiceUpdateInput,
} from "@/types/invoice"

function useInvalidateInvoices() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["invoices"] })
  }
}

export function useCreateInvoice() {
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: (input: InvoiceInput) => api.post<Invoice>("/invoices", input),
    onSuccess: invalidate,
  })
}

export function useUpdateInvoice() {
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: ({ id, ...input }: InvoiceUpdateInput & { id: string }) =>
      api.put<Invoice>(`/invoices/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteInvoice() {
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/invoices/${id}`),
    onSuccess: invalidate,
  })
}
