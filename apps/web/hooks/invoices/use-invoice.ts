"use client"

/**
 * `useInvoice(id)` — reads one invoice with its payment history
 * (`GET /invoices/{id}`, task F-5.2). The route carries no permission
 * middleware; the API authorizes via `StudentPolicy::viewInvoices` (staff, the
 * student itself, or a linked parent) and hides a denial as `404`. So the
 * detail is safe to open from a student/parent session — an out-of-branch,
 * missing, or unauthorized id surfaces as not-found, never `403`.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { Invoice } from "@/types/invoice"

export function useInvoice(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKey("invoices", "detail", { id: id ?? "" }),
    queryFn: () => api.get<Invoice>(`/invoices/${id}`),
    enabled: enabled && !!id,
    staleTime: STALE_TIME.STANDARD,
  })
}
