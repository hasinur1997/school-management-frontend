"use client"

/**
 * `useInitiatePayment()` — starts an SSLCommerz session for an admission
 * invoice via `POST /invoices/{invoice_id}/payments/online` (public, no auth —
 * task 2.5). Resolves to the gateway URL the caller redirects the browser to.
 *
 * The client never validates payments or marks the invoice paid; SSLCommerz
 * calls the API's callback and the status endpoint is the source of truth on
 * return (`architecture-context.md`, Payment Model).
 */

import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { PaymentInitiateResponse } from "@/types/admission"

export interface InitiatePaymentArgs {
  invoiceId: number | string
  /** Where SSLCommerz should return the visitor; carries the application_no. */
  returnUrl: string
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: ({ invoiceId, returnUrl }: InitiatePaymentArgs) =>
      api.post<PaymentInitiateResponse>(
        `/invoices/${encodeURIComponent(String(invoiceId))}/payments/online`,
        { return_url: returnUrl }
      ),
  })
}
