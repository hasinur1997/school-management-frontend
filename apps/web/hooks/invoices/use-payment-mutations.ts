"use client"

/**
 * Payment write actions for one invoice (task F-5.3, backend 10.x):
 *   - `POST /invoices/{id}/payments/online` — starts an SSLCommerz hosted
 *     checkout; resolves to the gateway URL the caller redirects the browser to.
 *   - `POST /invoices/{id}/payments/local`  — records a counter (cash) payment
 *     (`fee.collect`); invalidates `["invoices"]` so the detail/list refetch.
 *
 * The client never validates a payment or marks an invoice paid — SSLCommerz's
 * server-only IPN (`POST /payments/sslcommerz/ipn`, never called here) is the
 * source of truth, and both the online return and the local write reconcile by
 * refetching the invoice (`architecture-context.md`, Payment Model).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { LocalPaymentInput, Payment } from "@/types/invoice"
import type { PaymentInitiateResponse } from "@/types/admission"

export interface StartOnlinePaymentArgs {
  invoiceId: string
  /** Where SSLCommerz returns the browser (the invoice detail, marked `?paid=1`). */
  returnUrl: string
}

/**
 * Starts an SSLCommerz session for an invoice. Reuses the shared gateway
 * response shape (`PaymentInitiateResponse`) — the caller pulls the redirect URL
 * out with `paymentRedirectUrl` and assigns `window.location`.
 */
export function useStartOnlinePayment() {
  return useMutation({
    mutationFn: ({ invoiceId, returnUrl }: StartOnlinePaymentArgs) =>
      api.post<PaymentInitiateResponse>(
        `/invoices/${encodeURIComponent(invoiceId)}/payments/online`,
        { return_url: returnUrl }
      ),
  })
}

export interface RecordLocalPaymentArgs extends LocalPaymentInput {
  invoiceId: string
}

/**
 * Records a counter payment against an invoice and invalidates the invoices
 * cache so the detail (and any list/panel) reflects the API-derived
 * `paid_amount`/`status` on refetch.
 */
export function useRecordLocalPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, ...body }: RecordLocalPaymentArgs) =>
      api.post<Payment>(
        `/invoices/${encodeURIComponent(invoiceId)}/payments/local`,
        body
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}
