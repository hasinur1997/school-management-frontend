# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes. Progress state must reflect the actual implementation, not the intended state.

This frontend consumes the Laravel REST API documented in `docs/api/*.md` and `docs/api-spec.md`. Each feature below has a spec in `feature-specs/`.

## Current Phase

- Phase 1: Foundation (in progress)

## Current Goal

- Task 1.4 (`tasks/task-1.4-auth.md`): Auth — login, httpOnly-cookie session, permissions context, route guard, change-password.

## How To Work (per session)

1. Open this tracker, find the first unchecked task.
2. Read that task's ticket in `tasks/` — tickets are self-contained (objective, endpoints consumed, screens/components, behavior, gating, states, check-when-done).
3. Consult the named `feature-specs/*.md`, `docs/api/*.md`, `ui-context.md` only when the ticket references them.
4. Implement → states (loading/empty/error/success) present → `npm run build` green → tick the box and set the ticket Status `done`.

Each feature-spec (`feature-specs/NN-*.md`) is the module overview; the `tasks/*.md` tickets below are the per-screen units of work derived from it and the backend API. Every endpoint in `docs/api/*.md` is mapped to a task. Never start a task before the ones above it in the same phase are done; never start a phase before the previous one is done.

## Roadmap (35 tasks)

### Phase 1 — Foundation — `feature-specs/01..05`
- [x] [1.1](tasks/task-1.1-design-system.md) — Design system: tokens, two-axis themes, fonts, switcher
- [x] [1.2](tasks/task-1.2-ui-primitives-state.md) — shadcn primitives + shared state/feedback components
- [x] [1.3](tasks/task-1.3-api-client.md) — API client (Axios + envelope + errors) + TanStack Query + types
- [ ] [1.4](tasks/task-1.4-auth.md) — Auth: login, session cookie, permissions context, route guard, change-password
- [ ] [1.5](tasks/task-1.5-app-shell.md) — App shell: sidebar + topbar + nav + user menu + branch switcher
- [ ] [1.6](tasks/task-1.6-global-search.md) — Topbar global command search
- [ ] [1.7](tasks/task-1.7-dashboard.md) — Dashboard

### Phase 2 — Academic & People — `feature-specs/06..09`
- [ ] [2.1](tasks/task-2.1-academic-selectors.md) — Academic shared selectors + read hooks
- [ ] [2.2](tasks/task-2.2-academic-management.md) — Sessions / classes / sections / subjects management
- [ ] [2.3](tasks/task-2.3-assignments-branches.md) — Teacher assignments + branches management
- [ ] [2.4](tasks/task-2.4-teachers.md) — Teachers: list, detail, create/edit, status, photo, resend
- [ ] [2.5](tasks/task-2.5-public-admission.md) — Public admission form + status check (standalone)
- [ ] [2.6](tasks/task-2.6-admissions-review.md) — Admissions review: queue, detail, approve/reject
- [ ] [2.7](tasks/task-2.7-students.md) — Students: list, detail, edit, photo, status, enrollments
- [ ] [2.8](tasks/task-2.8-parents.md) — Parents: list, create, link/unlink, my-students

### Phase 3 — Attendance — `feature-specs/10..11`
- [ ] [3.1](tasks/task-3.1-student-attendance-entry.md) — Student attendance entry (roster grid)
- [ ] [3.2](tasks/task-3.2-student-attendance-sheets.md) — Attendance sheets (class + per-student/self/children)
- [ ] [3.3](tasks/task-3.3-teacher-attendance.md) — Teacher attendance: check-in/out + admin correction

### Phase 4 — Exams, Results, Promotion — `feature-specs/12..14`
- [ ] [4.1](tasks/task-4.1-exams.md) — Exams: list, create/edit
- [ ] [4.2](tasks/task-4.2-mark-entry.md) — Mark entry grid (grades read-only from API)
- [ ] [4.3](tasks/task-4.3-results.md) — Results: search, view, self, generate/publish
- [ ] [4.4](tasks/task-4.4-result-pdfs.md) — Result-sheet PDF download ⚠️ blocked on backend 8.4
- [ ] [4.5](tasks/task-4.5-promotions.md) — Promotion: preview, bulk, individual

### Phase 5 — Finance — `feature-specs/15..16`
- [ ] [5.1](tasks/task-5.1-fee-structures.md) — Fee structures + invoice generation
- [ ] [5.2](tasks/task-5.2-invoices.md) — Invoices: list, detail, my-invoices
- [ ] [5.3](tasks/task-5.3-payments.md) — Payments: online (SSLCommerz), local, receipt
- [ ] [5.4](tasks/task-5.4-finance-income-expenses.md) — Finance: income + expenses
- [ ] [5.5](tasks/task-5.5-finance-assets.md) — Finance: assets + summary
- [ ] [5.6](tasks/task-5.6-categories.md) — Finance categories management

### Phase 6 — Documents, Reports, Settings — `feature-specs/17..19`
- [ ] [6.1](tasks/task-6.1-id-cards.md) — ID cards: single + batch (poll/download)
- [ ] [6.2](tasks/task-6.2-transfer-certificates.md) — Transfer certificates: issue, list, PDF
- [ ] [6.3](tasks/task-6.3-reports.md) — Reports: filters, all report types, PDF export
- [ ] [6.4](tasks/task-6.4-settings-global.md) — Settings: global (identity, session, credentials, grading scale, toggles)
- [ ] [6.5](tasks/task-6.5-settings-branch.md) — Settings: per-branch (info, IP whitelist, class fees)
- [ ] [6.6](tasks/task-6.6-access-control.md) — Access control: assign roles to users + permissions to roles ⚠️ blocked on backend 15.1

## Completed

- [1.1] Design system: Tailwind v4 tokens in `globals.css` (`@theme inline`, light `:root` + `.dark`), two-axis theming (color mode via `next-themes`, accent via `data-accent` on `<html>` with pre-paint script + `AccentProvider`), Geist sans/mono fonts with tabular figures, `cn()` util, and a mount-guarded `ThemeSwitcher` dropdown. `npm run build` passes.
- [1.2] shadcn primitives + shared state/feedback components: shadcn primitives in `packages/ui/src/components/*` (Button, Input, Select, Dialog, Sheet, Table, Badge, Card, Tabs, DropdownMenu, Form/Field/Label, Sonner, Skeleton, Pagination, Calendar, Popover, Avatar, Command, Separator, Textarea, InputGroup) — CLI output, never hand-edited. App-level state/feedback in `apps/web/components/*`: `StatusBadge` (domain→state-token tones), `Button loading` wrapper, `ErrorBoundary` + `ErrorPanel`, `EmptyState`, `RouteProgress`, and `Table/Card/CardGrid/Detail` skeletons. Toast helpers in `lib/toast.ts` (`toastSuccess`/`toastError`/`getErrorMessage`, prefer API `message` + fallback, stable `id` to avoid stacking). Reusable `app/loading.tsx` + `app/error.tsx` + `app/global-error.tsx`. Layout wires `RouteProgress`, `ErrorBoundary`, and Sonner `Toaster`. `npm run build` + `lint` pass.
- [1.3] API client + server state: shared Axios instance in `lib/api/client.ts` (base URL from `NEXT_PUBLIC_API_BASE_URL`, `Accept: application/json`, request interceptor attaches `Authorization: Bearer {token}`, response interceptor unwraps the `{ success, message, data, meta? }` envelope and normalizes errors). Typed errors in `lib/api/errors.ts` (`ApiError`/`ApiValidationError` field→messages/`ApiForbiddenError`/`ApiNotFoundError`/`ApiNetworkError` retryable, + `is*` guards). `lib/api/session.ts` is the in-memory token bridge for auth 1.4 (`setApiToken`/`getApiToken`/`clearApiToken`/`setUnauthorizedHandler`); `401` calls `handleUnauthorized` → clears token + redirects to `/login` (default until auth overrides). `lib/api/query-keys.ts` documents+builds the `[module, action, params]` convention (`params` includes `branch` for super admin). `lib/api/query-client.ts` factory with defaults (no refetch-on-focus, retry only network/5xx once, `STALE_TIME` REFERENCE/STANDARD/SHORT). `components/query-provider.tsx` mounts `QueryClientProvider` (one client per session) wired into root layout. Envelope/`meta` types in `types/api.ts`. Reference hook `hooks/example-query.ts` proves the unwrap+meta round-trip. Axios + @tanstack/react-query added to `apps/web`. `npm run build` + `tsc` + `eslint` clean.

## In Progress

- None.

## Open Questions

- **Result-sheet PDFs (task 4.4):** backend ticket 8.4 (Marksheet PDFs via dompdf) is unfinished — no per-exam/annual result PDF route exists yet. Task 4.4 is blocked until the backend exposes the documented streamed endpoint; keep the download action gated/hidden until then.
- **Access control (task 6.6):** role→user and permission→role assignment was deferred by backend task 1.2 (managed via seeders). New backend ticket 15.1 now specifies the API (`docs/api/access-control.md`); task 6.6 is blocked until 15.1 ships — keep the screen hidden behind `role.manage` until then.
- Add unresolved product or implementation questions here.

## Architecture Decisions

- Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui. CSS variables in `globals.css` via `@theme inline`; light + dark via `.dark` selector. No `tailwind.config.js`.
- Sanctum bearer-token auth; token stored in an httpOnly cookie set server-side.
- TanStack Query for server state; shared Axios client in `lib/api` for all calls.
- Permission-based UI gating (never role-name checks). API `401/403/404` is the authoritative access boundary.
- `components/ui/*` are generated by the shadcn CLI — do not modify them manually.

## Session Notes

- Backend API contracts are fixed in `docs/api/*.md`; implement against them, do not invent endpoints.
