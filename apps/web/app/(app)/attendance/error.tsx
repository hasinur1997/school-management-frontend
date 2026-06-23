"use client"

import * as React from "react"

import { ErrorPanel } from "@/components/error-state"

/**
 * Per-route error boundary for attendance screens. Query errors are rendered
 * inline by the entry component; this catches render/runtime failures.
 */
export default function AttendanceError({
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
