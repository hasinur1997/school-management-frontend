"use client"

import * as React from "react"

import { ErrorPanel } from "@/components/error-state"

/**
 * Root per-route `error.tsx` segment (`ui-context.md`, Resilience). Catches
 * render/runtime errors in the route subtree and shows a recoverable panel with
 * a retry, so the app never white-screens. Copy this pattern into nested route
 * segments that need their own recovery boundary.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Surface the error for logging; replace with real telemetry later.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <ErrorPanel description={error.message || undefined} onRetry={reset} />
    </div>
  )
}
