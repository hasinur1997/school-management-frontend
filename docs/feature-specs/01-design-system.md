# 01 — Design System & UI Primitives

Set up the visual foundation before any feature work. Implement the tokens, theme, and shadcn primitives described in `ui-context.md`.

## Scope

Foundation only. No feature screens.

## Implementation

- Initialize Tailwind v4 (`@import "tailwindcss"` + `@tailwindcss/postcss`). No `tailwind.config.js`.
- Define all color, typography, and radius tokens from `ui-context.md` as CSS custom properties in `globals.css`, mapped to Tailwind tokens via `@theme inline`. Light (neutral) values in `:root`, dark overrides under `.dark`.
- **Multi-theme support — two independent axes** per `ui-context.md`:
  - **Color mode** (`light` / `dark` / `system`): drive the `.dark` class with `next-themes` (`attribute="class"`, `enableSystem`, `disableTransitionOnChange`). Wrap the app in `ThemeProvider`.
  - **Accent theme** (`blue` default, `purple`, `emerald`, `rose`, `amber`, `cyan`): re-point **only** `--accent-primary` and `--accent-primary-dim` via `[data-accent="…"]` and `.dark[data-accent="…"]` blocks in `globals.css`, using the accent table values. Persist the chosen accent (localStorage) and apply it as the `data-accent` attribute on `<html>`. State tokens are never overridden by an accent.
  - Add a **theme switcher** component (used by the topbar in feature 04): a `DropdownMenu` to pick color mode and accent. Avoid hydration mismatch (mount guard / suppress).
- Load the sans and mono fonts via `next/font`; expose as `--font-sans` / `--font-mono`. Tables and currency use tabular figures.
- Initialize shadcn/ui (canary for Tailwind v4) and install the core primitives: Button, Input, Select, Dialog, Table, Badge, Card, Tabs, DropdownMenu, Form, Sonner (toast), Skeleton, Pagination, Calendar/DatePicker, Avatar, Command (for the global topbar search). Install `next-themes`.
- Add `lib/utils.ts` with `cn()`. Install `lucide-react`.
- Add a `Badge` status helper that maps domain statuses to the state tokens per the `ui-context.md` status table.
- Add shared **state primitives** used by every screen (per `ui-context.md` Feedback, Loading & Resilience):
  - A root `ErrorBoundary` and a reusable error-state panel (icon + message + retry) for `error.tsx` segments.
  - Loading helpers: skeleton blocks for table/card/detail layouts and a reusable `loading.tsx` pattern; a `<Button loading>` state (disabled + spinner + label).
  - A reusable `EmptyState` (icon + copy + action) and a thin top route-progress indicator.
  - Toast helpers (Sonner) for standardized success/error messages, preferring the API `message` with a fallback.

## Rules

- No hardcoded hex or raw Tailwind color classes (`zinc-*`); only token utilities.
- **Mobile-first & responsive everywhere**: build for small viewports first, then enhance up via Tailwind breakpoints per the `ui-context.md` Responsive & Mobile section. No fixed pixel widths that overflow; touch targets ≥ 44px; no horizontal page overflow.
- Do not modify generated `components/ui/*` beyond what the shadcn CLI produces.
- Components reference accent via the `--accent-primary` token only — never a per-theme class. Adding a new accent is one `[data-accent]` / `.dark[data-accent]` pair in `globals.css`, with no component changes.
- State tokens (success/warning/error/info) stay constant across all accents.

## Check When Done

- Tokens defined in `globals.css`; light + dark both resolve.
- Color mode (light/dark/system) switches via `next-themes`; choice persists across reloads.
- All accents (blue/purple/emerald/rose/amber/cyan) apply via `data-accent` and re-point only the accent tokens, in both light and dark; choice persists.
- Theme switcher component renders and changes mode + accent without hydration mismatch.
- Tokens, fonts, and primitives render correctly at 360px, 768px, and ≥ 1280px with no horizontal overflow.
- All listed shadcn primitives (incl. Avatar and Command) installed and render with project tokens.
- Status badge helper covers success/warning/error/info mappings.
- Shared state primitives exist and render: ErrorBoundary/error panel, skeletons, `<Button loading>`, EmptyState, and success/error toast helpers.
- `npm run build` passes.
