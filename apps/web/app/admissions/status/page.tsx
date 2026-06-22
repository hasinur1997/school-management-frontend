import { Suspense } from "react"
import type { Metadata } from "next"

import { AdmissionThemeSurface } from "@/components/admissions/public/admission-public-shell"
import { AdmissionStatusCheck } from "@/components/admissions/public/admission-status-check"

/**
 * Public admission status-check route (task 2.9). Standalone and unauthenticated:
 * it lives outside the `(app)` group, so the server auth guard never runs and no
 * app shell wraps it — just the themed `AdmissionThemeSurface` (the imported
 * Claude Design lays out its own banner/cards on a soft gradient background, so
 * it uses the bare surface rather than the form's single-card shell). The lookup
 * is URL-driven, so the client component is wrapped in `Suspense`
 * (`useSearchParams`).
 */

export const metadata: Metadata = {
  title: "Application Status",
  description: "Check the status of your submitted admission application.",
}

export default function AdmissionStatusPage() {
  return (
    <AdmissionThemeSurface className="bg-linear-to-b from-base to-subtle px-5 py-12">
      <Suspense fallback={null}>
        <AdmissionStatusCheck />
      </Suspense>
    </AdmissionThemeSurface>
  )
}
