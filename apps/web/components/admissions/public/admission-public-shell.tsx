import type { CSSProperties, ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Shared chrome for the standalone, unauthenticated admission surfaces (tasks
 * 2.5 and 2.9): the public application form and the application status-check
 * page. Both live outside the `(app)` group, so the server auth guard never runs
 * and no app shell wraps them — just a centered, branded light card.
 *
 * It carries the dedicated "Admission form" look (Claude Design handoff): a fixed
 * light, navy-on-white institutional palette. To match the login screen, it uses
 * the app's default sans font (Geist, inherited from the root layout). Rather than
 * hardcode hex in components, it re-points the design-system token CSS vars on
 * the page wrapper (`admissionTheme`) — exactly how the app's accent themes
 * work — so every shadcn primitive and `bg-*`/`text-*` utility inside inherits
 * the palette, pinned light regardless of dark mode. Scoped to these routes only.
 */

/** Design-system tokens re-pointed to the Admission form palette (light only). */
const admissionTheme = {
  "--bg-base": "#f7f7f8",
  "--bg-surface": "#ffffff",
  "--bg-elevated": "#ffffff",
  "--bg-subtle": "#e9edf4",
  "--border-default": "#e6ebf2",
  "--border-subtle": "#eef2f7",
  "--text-primary": "#13294b",
  "--text-secondary": "#33415c",
  "--text-muted": "#6b7891",
  "--accent-primary": "#7c3aed",
  "--accent-primary-dim": "#f3effe",
  "--accent-soft-border": "#e7defb",
  "--state-success": "#16a34a",
  "--state-error": "#e5484d",
} as CSSProperties

/**
 * Field styling for the Admission surfaces, scoped to `.admission-fields`. Fields
 * stay large and prominent (46px, 10px radius, 1.5px border with a soft accent
 * focus ring), but font and font sizes follow the login screen: the app's
 * default 14px (`text-sm`) input/label scale. Scoping by wrapper class keeps the
 * rest of the app's inputs untouched while overriding only on these routes.
 */
const admissionFieldCss = `
.admission-fields label[data-slot="form-label"],
.admission-fields label[data-slot="label"] {
  font-size: 14px;
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
  font-size: 14px;
  color: #16213b;
}
.admission-fields [data-slot="select-trigger"] {
  width: 100%;
}
/*
 * Native selects (AcademicSelect / LocationSelect) carry no data-slot, so give
 * them the same 46px field metrics. Right padding keeps the chevron clear;
 * color is left to the utility classes so the muted placeholder state holds.
 */
.admission-fields select {
  height: auto;
  min-height: 46px;
  border-radius: 10px;
  border-width: 1.5px;
  border-color: #d8dfe9;
  background: #fff;
  padding: 12px 32px 12px 14px;
  font-size: 14px;
}
.admission-fields select.pl-8 {
  padding-left: 32px;
}
.admission-fields [data-slot="input"]:focus-visible,
.admission-fields [data-slot="select-trigger"]:focus-visible,
.admission-fields select:focus-visible {
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
 * The themed standalone surface only: the default sans font (Geist, inherited
 * from the root layout, matching the login screen), the `admissionTheme` CSS-var
 * re-point, the `.admission-fields` overrides, and a full-height `<main>`. No
 * header/card chrome — callers lay out their own content. Both the public form
 * (via `AdmissionPublicShell`) and the status-check page build on this.
 */
export function AdmissionThemeSurface({
  className,
  children,
}: AdmissionThemeSurfaceProps) {
  return (
    <main
      className={cn("min-h-svh", className)}
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
          <p className="max-w-md text-sm text-copy-muted">{subtitle}</p>
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
