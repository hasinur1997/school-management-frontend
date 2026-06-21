import type { CSSProperties } from "react"
import type { Metadata } from "next"
import { Libre_Franklin } from "next/font/google"

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

/**
 * Field styling for the Admission form, scoped to `.admission-fields`. The app's
 * shared shadcn inputs are compact (32px); the design handoff calls for large,
 * prominent fields (46px, 15px text, 10px radius, 1.5px border with a soft accent
 * focus ring) and 13.5px/600 labels. Scoping by wrapper class keeps the rest of
 * the app's inputs untouched while overriding only on this route.
 */
const admissionFieldCss = `
.admission-fields label[data-slot="form-label"] {
  font-size: 13.5px;
  font-weight: 600;
  color: #1f2d44;
  margin-bottom: 7px;
}
.admission-fields [data-slot="input"],
.admission-fields [data-slot="select-trigger"] {
  height: auto;
  min-height: 46px;
  border-radius: 10px;
  border-width: 1.5px;
  border-color: #d8dfe9;
  background: #fff;
  padding: 12px 14px;
  font-size: 15px;
  color: #16213b;
}
.admission-fields [data-slot="select-trigger"] {
  width: 100%;
}
.admission-fields [data-slot="input"]:focus-visible,
.admission-fields [data-slot="select-trigger"]:focus-visible {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-dim);
}
.admission-fields [data-slot="input"]::placeholder { color: #a7b1c2; }
`

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
      <style>{admissionFieldCss}</style>
      <div className="mx-auto flex w-full max-w-215 flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[30px] font-extrabold tracking-tight text-copy-primary">
            Admission Application
          </h1>
          <p className="max-w-md text-[15px] text-copy-muted">
            Complete each step to submit your application. Your progress is kept as you go.
          </p>
        </header>

        <div className="admission-fields rounded-[20px] border border-surface-border bg-surface p-5 shadow-[0_10px_40px_rgba(19,41,75,0.07)] sm:p-7 lg:px-10 lg:py-8">
          <AdmissionWizard resumeApplicationNo={application_no ?? null} />
        </div>

        <p className="text-center text-xs text-copy-muted">
          Need help? Contact the school office.
        </p>
      </div>
    </main>
  )
}
