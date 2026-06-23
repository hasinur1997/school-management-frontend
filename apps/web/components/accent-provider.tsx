"use client"

import * as React from "react"

export const ACCENTS = [
  { value: "indigo", label: "Indigo" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "emerald", label: "Emerald" },
  { value: "rose", label: "Rose" },
  { value: "amber", label: "Amber" },
  { value: "cyan", label: "Cyan" },
] as const

export type Accent = (typeof ACCENTS)[number]["value"]

export const ACCENT_STORAGE_KEY = "accent"
export const DEFAULT_ACCENT: Accent = "indigo"

interface AccentContextValue {
  accent: Accent
  setAccent: (accent: Accent) => void
}

const AccentContext = React.createContext<AccentContextValue | null>(null)

function isAccent(value: string | null): value is Accent {
  return value !== null && ACCENTS.some((a) => a.value === value)
}

function applyAccent(accent: Accent) {
  const root = document.documentElement
  // Blue is the baseline; it needs no attribute (matches globals.css :root).
  if (accent === DEFAULT_ACCENT) {
    root.removeAttribute("data-accent")
  } else {
    root.setAttribute("data-accent", accent)
  }
}

/**
 * Persists the accent axis (data-accent on <html>) independently from the
 * color-mode axis owned by next-themes. The pre-hydration script in the root
 * layout applies the stored value before paint to avoid a flash; this provider
 * keeps React state in sync and writes future changes.
 */
export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = React.useState<Accent>(DEFAULT_ACCENT)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY)
      if (isAccent(stored)) {
        setAccentState(stored)
        applyAccent(stored)
      }
    } catch {
      // localStorage may be unavailable (private mode); fall back to default.
    }
  }, [])

  const setAccent = React.useCallback((next: Accent) => {
    setAccentState(next)
    applyAccent(next)
    try {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, next)
    } catch {
      // ignore write failures
    }
  }, [])

  const value = React.useMemo(() => ({ accent, setAccent }), [accent, setAccent])

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
}

export function useAccent() {
  const ctx = React.useContext(AccentContext)
  if (!ctx) {
    throw new Error("useAccent must be used within an AccentProvider")
  }
  return ctx
}
