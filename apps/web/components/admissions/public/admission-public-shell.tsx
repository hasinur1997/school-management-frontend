import type { CSSProperties, ReactNode } from "react"
import { Libre_Franklin } from "next/font/google"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Shared chrome for the standalone, unauthenticated admission surfaces (tasks
 * 2.5 and 2.9): the public application form and the application status-check
 * page. Both live outside the `(app)` group, so the server auth guard never runs
 * and no app shell wraps them — just a centered, branded light card.
 *
 * It carries the dedicated "Admission form" look (Claude Design handoff): a fixed
 * light, navy-on-white institutional palette in Libre Franklin. Rather than
 * hardcode hex in components, it re-points the design-system token CSS vars on
 * the page wrapper (`admissionTheme`) — exactly how the app's accent themes
 * work — so every shadcn primitive and `bg-*`/`text-*` utility inside inherits
 * the palette, pinned light regardless of dark mode. Scoped to these routes only.
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
 * Field styling for the Admission surfaces, scoped to `.admission-fields`. The
 * app's shared shadcn inputs are compact (32px); the design handoff calls for
 * large, prominent fields (46px, 15px text, 10px radius, 1.5px border with a
 * soft accent focus ring) and 13.5px/600 labels. Scoping by wrapper class keeps
 * the rest of the app's inputs untouched while overriding only on these routes.
 */
const admissionFieldCss = `
.admission-fields label[data-slot="form-label"],
.admission-fields label[data-slot="label"] {
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

export interface AdmissionThemeSurfaceProps {
  /** Extra classes on the `<main>` — typically the background + page padding. */
  className?: string
  children: ReactNode
}

/**
 * The themed standalone surface only: Libre Franklin font, the `admissionTheme`
 * CSS-var re-point, the `.admission-fields` overrides, and a full-height `<main>`.
 * No header/card chrome — callers lay out their own content. Both the public form
 * (via `AdmissionPublicShell`) and the status-check page build on this.
 */
export function AdmissionThemeSurface({
  className,
  children,
}: AdmissionThemeSurfaceProps) {
  return (
    <main
      className={cn(`${libreFranklin.className} min-h-svh`, className)}
      style={admissionTheme}
    >
      <style>{admissionFieldCss}</style>
      {children}
    </main>
  )
}

export interface AdmissionPublicShellProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AdmissionPublicShell({
  title,
  subtitle,
  children,
}: AdmissionPublicShellProps) {
  return (
    <AdmissionThemeSurface className="bg-base px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-215 flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[30px] font-extrabold tracking-tight text-copy-primary">
            {title}
          </h1>
          <p className="max-w-md text-[15px] text-copy-muted">{subtitle}</p>
        </header>

        <div className="admission-fields rounded-[20px] border border-surface-border bg-surface p-5 shadow-[0_10px_40px_rgba(19,41,75,0.07)] sm:p-7 lg:px-10 lg:py-8">
          {children}
        </div>

        <p className="text-center text-xs text-copy-muted">
          Need help? Contact the school office.
        </p>
      </div>
    </AdmissionThemeSurface>
  )
}
