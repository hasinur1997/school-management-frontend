"use client"

import * as React from "react"

import "@workspace/ui/globals.css"
import { ErrorPanel } from "@/components/error-state"

/**
 * Root error boundary for failures in the root layout itself
 * (`ui-context.md`, Resilience). Replaces the whole document, so it ships its
 * own `<html>`/`<body>` and re-imports global styles.
 */
export default function GlobalError({
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
    <html lang="en">
      <body className="antialiased font-sans">
        <div className="flex min-h-svh items-center justify-center bg-base p-4 text-copy-primary">
          <ErrorPanel description={error.message || undefined} onRetry={reset} />
        </div>
      </body>
    </html>
  )
}
