import { Suspense } from "react"
import type { Metadata } from "next"

import { AdmissionThemeSurface } from "@/components/admissions/public/admission-public-shell"
import { PublicResultLookup } from "@/components/results/public-result-lookup"

export const metadata: Metadata = {
  title: "Public Result Lookup",
  description: "Search published student results by roll, class, year, and semester.",
}

export default function PublicResultsPage() {
  return (
    <AdmissionThemeSurface className="bg-base px-4 py-8 sm:py-12">
      <Suspense fallback={null}>
        <PublicResultLookup />
      </Suspense>
    </AdmissionThemeSurface>
  )
}
