"use client"

import { AdmissionThemeSurface } from "@/components/admissions/public/admission-public-shell"
import { ErrorPanel } from "@/components/error-state"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <AdmissionThemeSurface className="flex items-center justify-center bg-base px-4 py-8">
      <ErrorPanel
        title="Couldn't load result lookup"
        description={error.message || "Please try again."}
        onRetry={reset}
      />
    </AdmissionThemeSurface>
  )
}
