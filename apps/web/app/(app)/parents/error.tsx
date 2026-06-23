"use client"

import * as React from "react"

import { ErrorPanel } from "@/components/error-state"

export default function ParentsError({
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
