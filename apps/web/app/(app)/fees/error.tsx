"use client"

import * as React from "react"

import { ErrorPanel } from "@/components/error-state"

/**
 * Per-route error boundary for the fee-structures screen (`ui-context.md`,
 * Resilience) — catches render/runtime errors in the subtree and offers a retry
 * so the app never white-screens.
 */
export default function FeeStructuresError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <ErrorPanel description={error.message || undefined} onRetry={reset} />
    </div>
  )
}
