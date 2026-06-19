import { Button } from "@workspace/ui/components/button"

import { ThemeSwitcher } from "@/components/theme-switcher"

const surfaces = [
  { name: "bg-base", className: "bg-base" },
  { name: "bg-surface", className: "bg-surface" },
  { name: "bg-elevated", className: "bg-elevated" },
  { name: "bg-subtle", className: "bg-subtle" },
]

const states = [
  { name: "Success", className: "bg-success" },
  { name: "Warning", className: "bg-warning" },
  { name: "Error", className: "bg-error" },
  { name: "Info", className: "bg-info" },
]

export default function Page() {
  return (
    <div className="min-h-svh bg-base text-copy-primary">
      <header className="flex items-center justify-between border-b border-surface-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">Design System</h1>
          <p className="truncate text-sm text-copy-muted">
            Tokens, themes & fonts
          </p>
        </div>
        <ThemeSwitcher />
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-copy-secondary">Surfaces</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {surfaces.map((s) => (
              <div
                key={s.name}
                className={`rounded-xl border border-surface-border p-4 ${s.className}`}
              >
                <span className="font-mono text-xs text-copy-muted">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-copy-secondary">Accent</h2>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-border bg-surface p-4">
            <Button>Primary action</Button>
            <Button variant="outline">Outline</Button>
            <span className="rounded-md bg-accent-dim px-2.5 py-1 text-sm font-medium text-brand">
              text-brand on bg-accent-dim
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-copy-secondary">
            State tokens (constant across accents)
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {states.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <span className={`size-3 rounded-full ${s.className}`} />
                <span className="text-sm">{s.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-copy-secondary">Typography</h2>
          <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4">
            <p className="text-copy-primary">Primary text — Geist Sans</p>
            <p className="text-copy-secondary">Secondary text</p>
            <p className="text-copy-muted">Muted text</p>
            <p className="font-mono tabular-nums text-copy-primary">
              1,234,567.89 · GPA 4.00 · ID 0001
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
