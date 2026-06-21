import type { CSSProperties } from "react"
import type { Metadata } from "next"
import { Libre_Franklin } from "next/font/google"
import { GraduationCap } from "lucide-react"

import { AdmissionWizard } from "@/components/admissions/public/admission-wizard"

/**
 * Public admission application route (task 2.5). Standalone and unauthenticated:
 * it lives outside the `(app)` group, so the server auth guard never runs and no
 * app shell wraps it — just a centered, branded multi-step form (`ui-context.md`,
 * Public admission). On return from the payment gateway the `application_no`
 * query param resumes the flow into the authoritative status/payment screen.
 *
 * This page carries the dedicated "Admission form" look (Claude Design handoff):
 * a fixed light, navy-on-white institutional palette in Libre Franklin. Rather
 * than hardcode hex in components, it re-points the design-system token CSS vars
 * on the page wrapper (`admissionTheme`) — exactly how the app's accent themes
 * work — so every shadcn primitive and `bg-*`/`text-*` utility inside inherits
 * the palette. Scoped to this route only; the rest of the app is untouched. The
 * inline vars also pin the page to this light palette regardless of dark mode.
 */

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

/** Design-system tokens re-pointed to the Admission form palette (light only). */
const admissionTheme = {
  "--bg-base": "#eef1f6",
  "--bg-surface": "#ffffff",
  "--bg-elevated": "#ffffff",
  "--bg-subtle": "#e9edf4",
  "--border-default": "#e6ebf2",
  "--border-subtle": "#eef2f7",
  "--text-primary": "#13294b",
  "--text-secondary": "#33415c",
  "--text-muted": "#6b7891",
  "--accent-primary": "#2f6fed",
  "--accent-primary-dim": "rgba(47, 111, 237, 0.16)",
  "--state-success": "#16a34a",
  "--state-error": "#e5484d",
} as CSSProperties

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
    <main
      className={`${libreFranklin.className} min-h-svh bg-base px-4 py-8 sm:py-12`}
      style={admissionTheme}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold text-copy-primary sm:text-2xl">
            Admission Application
          </h1>
          <p className="max-w-md text-sm text-copy-muted">
            Complete each step to submit your application. Your progress is kept as you go.
          </p>
        </header>

        <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm sm:p-6 lg:p-8">
          <AdmissionWizard resumeApplicationNo={application_no ?? null} />
        </div>

        <p className="text-center text-xs text-copy-muted">
          Need help? Contact the school office.
        </p>
      </div>
    </main>
  )
}
