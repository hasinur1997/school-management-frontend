import type { Metadata } from "next"

import { AdmissionWizard } from "@/components/admissions/public/admission-wizard"
import { AdmissionPublicShell } from "@/components/admissions/public/admission-public-shell"

/**
 * Public admission application route (task 2.5). Standalone and unauthenticated:
 * it lives outside the `(app)` group, so the server auth guard never runs and no
 * app shell wraps it — just the centered, branded `AdmissionPublicShell`
 * (`ui-context.md`, Public admission). On return from the payment gateway the
 * `application_no` query param resumes the flow into the authoritative
 * status/payment screen.
 */

export const metadata: Metadata = {
  title: "Admission Application",
  description: "Apply for admission online.",
}

export default async function AdmissionApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ application_no?: string }>
}) {
  const { application_no } = await searchParams

  return (
    <AdmissionPublicShell
      title="Admission Application"
      subtitle="Complete each step to submit your application. Your progress is kept as you go."
    >
      <AdmissionWizard resumeApplicationNo={application_no ?? null} />
    </AdmissionPublicShell>
  )
}
