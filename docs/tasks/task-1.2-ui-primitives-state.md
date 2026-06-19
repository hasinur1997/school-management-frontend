# Task F-1.2 — shadcn Primitives & Shared State Components

| Field | Value |
|---|---|
| Phase | 1 — Foundation |
| Status | `todo` |
| Depends on | 1.1 |
| Blocks | every screen |
| Feature spec | `feature-specs/01-design-system.md` |
| Context | `ui-context.md` (Feedback, Loading & Resilience) |

## Objective
Install the shadcn primitive set and the reusable feedback/resilience components every screen reuses, so no screen ever ships a blank, white-screen, or unstyled state.

## What To Build
- Initialize shadcn/ui (canary for Tailwind v4) and install: Button, Input, Select, Dialog, Sheet, Table, Badge, Card, Tabs, DropdownMenu, Form, Sonner (toast), Skeleton, Pagination, Calendar/DatePicker, Avatar, Command. Install `next-themes`.
- A **status `Badge` helper** mapping domain statuses → state tokens per the `ui-context.md` table (Present/Paid/Active/Approved/Passed → success; Late/Pending/Partial → warning; Absent/Unpaid/Inactive/Rejected/Failed → error; Leave/TC/Info → info).
- Shared state primitives:
  - Root `ErrorBoundary` + a reusable error panel (icon + message + retry) for `error.tsx` segments.
  - Skeleton blocks for table / card / detail layouts; a reusable `loading.tsx` pattern; a `<Button loading>` state (disabled + spinner + label).
  - A reusable `EmptyState` (icon + copy + action) and a thin top route-progress indicator.
  - Toast helpers (Sonner) for standardized success/error, preferring the API `message` with a fallback; use a stable toast `id` per action to avoid stacking.

## Rules
- Do not modify generated `components/ui/*` beyond the CLI output.
- Project styling/layout/logic lives in app-level components, never in `components/ui/*`.

## Check When Done
- [ ] All listed primitives installed and render with project tokens.
- [ ] Status badge helper covers all four state mappings.
- [ ] ErrorBoundary/error panel, skeletons, `<Button loading>`, EmptyState, route-progress, and success/error toast helpers exist and render.
- [ ] `npm run build` passes.
