"use client"

/**
 * Payment flow (task 2.5, step 9). Drives the admission payment after submit and
 * on return from SSLCommerz. The authoritative source is always the status
 * endpoint — the redirect query params are never trusted. Phases:
 *
 *   - pending  → "Proceed to payment" (initiate → redirect to gateway)
 *   - failed   → "Retry Payment" against the same invoice, capped at the
 *                settings retry limit; once exhausted, a terminal failure
 *   - settled  → the success Confirmation screen
 *
 * Attempts are read from the status payload when present, with a sessionStorage
 * fallback so the cap survives the gateway round-trip even if the API omits it.
 */

import * as React from "react"
import { CreditCard, Loader2 } from "lucide-react"

import { ErrorPanel } from "@/components/error-state"
import { Button } from "@/components/button"
import { toastError } from "@/lib/toast"
import {
  useAdmissionStatus,
  useInitiatePayment,
} from "@/hooks/admissions"
import {
  paymentPhaseOf,
  paymentRedirectUrl,
  type AdmissionStatus,
} from "@/types/admission"
import { ConfirmationScreen } from "./confirmation-screen"
import type { ApplicationSnapshot } from "./application-document"

export interface PaymentFlowProps {
  applicationNo: string
  /** Known from the submit response; on resume it's read from the status. */
  invoiceId?: number | string | null
  retryLimit: number
  /** True when the visitor just returned from the gateway (URL carried the no.). */
  resume?: boolean
  /** Submitted snapshot for the client-side download; absent when resuming. */
  snapshot?: ApplicationSnapshot | null
}

/** sessionStorage key for the local attempt counter (fallback for the cap). */
function attemptsKey(applicationNo: string) {
  return `admission_pay_attempts:${applicationNo}`
}

function readLocalAttempts(applicationNo: string): number {
  if (typeof window === "undefined") return 0
  const raw = window.sessionStorage.getItem(attemptsKey(applicationNo))
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

function bumpLocalAttempts(applicationNo: string): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(
    attemptsKey(applicationNo),
    String(readLocalAttempts(applicationNo) + 1)
  )
}

function attemptsOf(applicationNo: string, status: AdmissionStatus | undefined): number {
  const fromApi = status?.payment_attempts
  if (typeof fromApi === "number" && Number.isFinite(fromApi)) return fromApi
  return readLocalAttempts(applicationNo)
}

export function PaymentFlow({
  applicationNo,
  invoiceId,
  retryLimit,
  resume = false,
  snapshot,
}: PaymentFlowProps) {
  const statusQuery = useAdmissionStatus(applicationNo)
  const initiate = useInitiatePayment()

  const status = statusQuery.data
  const effectiveInvoiceId = invoiceId ?? status?.invoice_id ?? null

  async function startPayment() {
    if (effectiveInvoiceId == null) {
      toastError(null, "No invoice is associated with this application.", {
        id: "admission-pay",
      })
      return
    }
    try {
      const returnUrl = `${window.location.origin}/admissions/application?application_no=${encodeURIComponent(
        applicationNo
      )}`
      const res = await initiate.mutateAsync({ invoiceId: effectiveInvoiceId, returnUrl })
      const url = paymentRedirectUrl(res)
      if (!url) {
        toastError(null, "Couldn't start the payment. Please try again.", {
          id: "admission-pay",
        })
        return
      }
      bumpLocalAttempts(applicationNo)
      window.location.assign(url)
    } catch (error) {
      toastError(error, "Couldn't start the payment. Please try again.", {
        id: "admission-pay",
      })
    }
  }

  // Initial / resume fetch — show a "confirming" state rather than a blank panel.
  if (statusQuery.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-7 animate-spin text-brand" aria-hidden />
        <p className="text-sm text-copy-secondary">
          {resume ? "Confirming payment…" : "Preparing payment…"}
        </p>
      </div>
    )
  }

  if (statusQuery.isError || !status) {
    return (
      <ErrorPanel
        title="Couldn't load payment status"
        description="We couldn't confirm your application status. Please try again."
        onRetry={() => statusQuery.refetch()}
      />
    )
  }

  const phase = paymentPhaseOf(status)
  const attempts = attemptsOf(applicationNo, status)
  const submitting = initiate.isPending

  if (phase === "settled") {
    return (
      <ConfirmationScreen
        applicationNo={applicationNo}
        status={status}
        showStatus
        snapshot={snapshot}
      />
    )
  }

  if (phase === "failed") {
    // Cap reached → terminal failure; the school office follows up.
    if (attempts >= retryLimit) {
      return (
        <ConfirmationScreen
          applicationNo={applicationNo}
          status={status}
          failed
          snapshot={snapshot}
        />
      )
    }
    const remaining = retryLimit - attempts
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-error/10 text-error">
          <CreditCard className="size-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-copy-primary">Payment not completed</h2>
          <p className="max-w-md text-sm text-copy-muted">
            Your previous payment didn&apos;t go through. You can try again — {remaining}{" "}
            {remaining === 1 ? "attempt" : "attempts"} remaining.
          </p>
        </div>
        <p className="font-mono text-sm tabular-nums text-copy-secondary">
          Application {applicationNo}
        </p>
        <Button onClick={startPayment} loading={submitting}>
          {submitting ? "Starting…" : "Retry payment"}
        </Button>
      </div>
    )
  }

  // pending — needs the first payment.
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
        <CreditCard className="size-7" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-copy-primary">Complete your admission payment</h2>
        <p className="max-w-md text-sm text-copy-muted">
          Your application <span className="font-mono tabular-nums">{applicationNo}</span> has been
          created. Pay the admission fee to finish.
        </p>
      </div>
      <Button onClick={startPayment} loading={submitting}>
        {submitting ? "Starting…" : "Proceed to payment"}
      </Button>
    </div>
  )
}
