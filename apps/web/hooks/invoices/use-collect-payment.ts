"use client"

/**
 * Records a counter payment across several of a student's invoices in one go
 * (task F-5.3 follow-up). Since the API settles **one invoice per request**
 * (`POST /invoices/{id}/payments/local`), this posts the pre-computed
 * allocations sequentially, stopping at the first failure and reporting how much
 * was applied — money is never silently half-collected without a report.
 *
 * The client never marks an invoice paid; each request is settled server-side
 * and the whole `["invoices"]` cache is invalidated afterwards so the panel and
 * details refetch the API-derived statuses.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { sumMoney } from "@/lib/format"
import type { InvoiceAllocation } from "@/lib/payment/allocate"
import type { Invoice, Payment } from "@/types/invoice"

export interface CollectPaymentResult {
  /** Payments settled before the loop stopped (in order). */
  recorded: Payment[]
  /** Sum of the recorded amounts, a 2dp decimal string. */
  appliedAmount: string
  /** Present when a request failed — the invoice it failed on and the error. */
  failedAt?: { invoice: Invoice; error: unknown }
}

export function useCollectStudentPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      allocations,
    }: {
      allocations: InvoiceAllocation[]
    }): Promise<CollectPaymentResult> => {
      const recorded: Payment[] = []
      for (const { invoice, amount } of allocations) {
        try {
          const payment = await api.post<Payment>(
            `/invoices/${encodeURIComponent(invoice.id)}/payments/local`,
            { amount, method: "cash" }
          )
          recorded.push(payment)
        } catch (error) {
          return {
            recorded,
            appliedAmount: sumMoney(recorded.map((p) => p.amount)),
            failedAt: { invoice, error },
          }
        }
      }
      return {
        recorded,
        appliedAmount: sumMoney(recorded.map((p) => p.amount)),
      }
    },
    // Always reconcile: even a partial collection changed some invoices.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}
