# Task F-1.1 — Design System: Tokens, Themes & Fonts

| Field | Value |
|---|---|
| Phase | 1 — Foundation |
| Status | `done` |
| Depends on | — |
| Blocks | 1.2 and every screen |
| Feature spec | `feature-specs/01-design-system.md` |
| Context | `ui-context.md` |

## Objective
Stand up the visual foundation: Tailwind v4, all design tokens, the two-axis theme system, fonts, and a theme switcher — before any feature screen.

## What To Build
- Tailwind v4 via `@import "tailwindcss"` + `@tailwindcss/postcss`. No `tailwind.config.js`.
- All color/typography/radius tokens from `ui-context.md` as CSS custom properties in `globals.css`, mapped to Tailwind via `@theme inline`. Neutral light values in `:root`, dark overrides under `.dark`.
- **Two independent theme axes** (both persisted to localStorage, applied to `<html>`):
  - Color mode `light|dark|system` via `next-themes` (`attribute="class"`, `enableSystem`, `disableTransitionOnChange`), wrapped in `ThemeProvider`.
  - Accent `blue(default)|purple|emerald|rose|amber|cyan` via `data-accent` attribute; re-point **only** `--accent-primary` and `--accent-primary-dim` in `[data-accent]` / `.dark[data-accent]` blocks.
- Fonts via `next/font` → `--font-sans` / `--font-mono` (tabular figures for numerics).
- `lib/utils.ts` with `cn()`; install `lucide-react`.
- A **theme switcher** `DropdownMenu` component (consumed by the topbar in 1.5): picks color mode + accent, mount-guarded against hydration mismatch.

## Rules
- No hardcoded hex or raw Tailwind color classes (`zinc-*`) — only token utilities.
- State tokens (success/warning/error/info) never change across accents.
- Mobile-first; touch targets ≥ 44px; no horizontal overflow.

## Check When Done
- [x] Tokens defined; light + dark both resolve.
- [x] Color mode switches and persists; all six accents apply via `data-accent` in both modes and persist.
- [x] Theme switcher renders and changes mode + accent without hydration mismatch.
- [x] Renders cleanly at 360 / 768 / ≥1280px, no overflow.
- [x] `npm run build` passes.
