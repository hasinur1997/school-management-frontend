# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes. Progress state must reflect the actual implementation, not the intended state.

This frontend consumes the Laravel REST API documented in `docs/api/*.md` and `docs/api-spec.md`. Each feature below has a spec in `feature-specs/`.

## Current Phase

- Phase 1: Foundation (in progress)

## Current Goal

- Task 2.1 (`tasks/task-2.1-academic-selectors.md`): Academic shared selectors + read hooks.

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
- [x] [1.4](tasks/task-1.4-auth.md) — Auth: login, session cookie, permissions context, route guard, change-password
- [x] [1.5](tasks/task-1.5-app-shell.md) — App shell: sidebar + topbar + nav + user menu + branch switcher
- [x] [1.6](tasks/task-1.6-global-search.md) — Topbar global command search
- [x] [1.7](tasks/task-1.7-dashboard.md) — Dashboard

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

- [1.7] Dashboard: the placeholder `app/(app)/dashboard/page.tsx` is replaced by the real landing screen. The page (thin client component) renders a welcome header + `components/dashboard/dashboard-summary.tsx`, which fetches `GET /dashboard` via `hooks/dashboard/use-dashboard.ts` and renders one `SummaryCard` per figure the API returned — **rendering only present scalar figures and computing nothing client-side** (ticket Rules). `components/dashboard/figures.ts` (`toDashboardCards`) walks the response object, skips null/non-scalar/non-numeric entries, and maps each key through a `CATALOG` (label + Lucide icon + count/currency kind, with aliases covering the ticket's example figures: students/teachers counts, today's attendance, pending admissions, fee collection, profit/loss, income, expenses, assets, outstanding); unknown keys fall back to a humanised label and an inferred kind (money-word regex on the key, else a decimal-string value ⇒ currency). Money uses the new `lib/format` formatters: `formatMoney` groups the API decimal string with **pure string manipulation** (no float math, `৳` prefix, `code-standards.md` money rule) and `formatCount` groups integers via `Intl.NumberFormat`; values render in the mono/tabular font so the grid aligns. States: 8-card skeleton (`SummaryCardSkeleton`, mirrors the final card) on load, `EmptyState` when no figures, `ErrorPanel` (retry) on failure, and a distinct "No dashboard access" `EmptyState` on `403`. Super-admin branch/consolidated switches re-fetch because `useDashboard` folds `branchParam` into its query key (and the interceptor attaches `branch_id`); SHORT stale window since today's figures move during the day. `npm run build` + TypeScript pass; `lint` clean (only the pre-existing theme-switcher warnings). **Assumptions** (documented contract `docs/api/settings.md` absent from the repo): `GET /dashboard` returns the standard envelope with `data` as a flat object of scalar figures — counts as integers, money as `decimal(12,2)` strings. When the real contract lands, adjust the `CATALOG` keys/labels in `figures.ts`; the renderer, hook, and formatters need no changes.
- [1.6] Topbar global command search: the 1.5 `SearchPlaceholder` is replaced by `components/app-shell/global-search.tsx`, a `Command`-palette opened by `Cmd/Ctrl+K` (global keydown toggle), an `≥ md` input-style trigger, and a `< md` search-icon trigger — both open the same `CommandDialog`. Results split into **Modules** (the sidebar `NAV_GROUPS` flattened, permission-filtered via `useAuth().hasPermission` and substring-matched on label — shown in full when the query is empty so the palette doubles as quick-nav) and **records** from `hooks/search/use-global-search.ts`, which fans the debounced query (`hooks/use-debounced-value.ts`, 250 ms) across the permitted sources in `hooks/search/search-sources.ts` via TanStack `useQueries`. Record sources: Students (`GET /students?search=&per_page=5`, `students.view`), Teachers (`GET /teachers?…`, `teachers.view`), Classes (`GET /classes`, filtered client-side, `academic.view`). Built-in `Command` filtering is disabled (`shouldFilter={false}`); modules are matched in-component and records are server-filtered. Permission-filtering happens before any source is queried; a source error contributes no rows (retry off) rather than breaking the panel, and the API stays authoritative on select (`router.push(href)`). Loading ("Searching…" spinner) and empty ("No results for …" / "Type to search…") states live inside the panel; query keys fold in the super-admin `branch` param and `branch_id` is auto-forwarded by the API interceptor. Min query length 2 before records query. `npm run build` + `tsc` pass; `lint` clean (only the pre-existing theme-switcher warnings). **Assumptions** (backend `docs/api/*.md` absent — see auth note): record endpoints follow the standard Laravel list contract (`?search=`, `per_page`, envelope `data` array) and the field names read in `search-sources.ts` (`full_name`/`name`, `roll_number`/`student_id`, `designation`/`employee_id`, class/section names); record detail routes (`/students/{id}`, `/teachers/{id}`, `/academic?class=`) are owned by Phase-2 tasks. Adjust the source mappers/endpoints when the real contract lands.
- [1.5] App shell: authenticated route group now wraps pages in `AuthProvider` → `BranchProvider` → `AppShell`. `AppShell` owns a fixed topbar, fixed/collapsible desktop sidebar, `<lg` Sheet drawer, persisted sidebar collapse state, and a scrollable content area offset by topbar/sidebar dimensions. Sidebar navigation is grouped for Dashboard, Admissions, Students, Teachers, Academic, Attendance, Exams, Results, Promotion, Fees, Finance, Documents, Reports, and Settings; every item is permission-filtered via `useAuth().hasPermission` and active-route highlighted. Topbar includes the brand, 1.6 search placeholder, theme switcher, super-admin branch switcher, notifications placeholder, and user menu. Branch context lives in `components/branch/branch-provider.tsx` + `lib/api/branch.ts`; only super-admin sessions set `branch_id`, non-super-admin users only see a static branch label, and branch changes invalidate non-auth queries. `GET /branches` is implemented in `hooks/branches/use-branches.ts`. User menu reuses `ChangePasswordDialog` and `LogoutButton`, and routes Profile/Settings links. Verified with mocked auth/branches at 360px, 768px, and 1280px screenshots; `npm run build` passes (network access required for Next font fetch), `typecheck` passes, and `lint` passes with the existing theme/accent warnings only.
- [1.1] Design system: Tailwind v4 tokens in `globals.css` (`@theme inline`, light `:root` + `.dark`), two-axis theming (color mode via `next-themes`, accent via `data-accent` on `<html>` with pre-paint script + `AccentProvider`), Geist sans/mono fonts with tabular figures, `cn()` util, and a mount-guarded `ThemeSwitcher` dropdown. `npm run build` passes.
- [1.2] shadcn primitives + shared state/feedback components: shadcn primitives in `packages/ui/src/components/*` (Button, Input, Select, Dialog, Sheet, Table, Badge, Card, Tabs, DropdownMenu, Form/Field/Label, Sonner, Skeleton, Pagination, Calendar, Popover, Avatar, Command, Separator, Textarea, InputGroup) — CLI output, never hand-edited. App-level state/feedback in `apps/web/components/*`: `StatusBadge` (domain→state-token tones), `Button loading` wrapper, `ErrorBoundary` + `ErrorPanel`, `EmptyState`, `RouteProgress`, and `Table/Card/CardGrid/Detail` skeletons. Toast helpers in `lib/toast.ts` (`toastSuccess`/`toastError`/`getErrorMessage`, prefer API `message` + fallback, stable `id` to avoid stacking). Reusable `app/loading.tsx` + `app/error.tsx` + `app/global-error.tsx`. Layout wires `RouteProgress`, `ErrorBoundary`, and Sonner `Toaster`. `npm run build` + `lint` pass.
- [1.4] Auth: end-to-end Sanctum token auth. Route groups split `app/(auth)` (standalone login layout) from `app/(app)` (server guard in `(app)/layout.tsx` reads the httpOnly cookie via `lib/auth/session.ts` and `redirect("/login")` when absent). `lib/auth/session.ts` owns the `session_token` httpOnly cookie (set/get/clear via Next 16 async `cookies()`); `lib/auth/server-api.ts` is a tiny `fetch` envelope wrapper used only by server actions; `lib/auth/actions.ts` (`loginAction`/`logoutAction`/`clearSessionAction`) are the only writers of the cookie. `components/auth/auth-provider.tsx` pushes the token into the `lib/api` session bridge, registers the `401` handler (clear cookie + `/login`), fetches `GET /auth/me` once (TanStack Query, REFERENCE stale), and provides `useAuth()` (user + flat permission list + `hasPermission`); it gates the subtree behind loading/error so no authed UI renders early. `hooks/auth/use-permission.ts` (`usePermission`) and `components/auth/can.tsx` (`<Can permission>`) gate on permissions only. Login = RHF+Zod (`components/auth/login-form.tsx`) → `loginAction` → cookie set → `router.replace("/dashboard")` + `refresh()`; `422`→field errors, invalid creds→banner. Change-password = `hooks/auth/use-change-password.ts` + controlled `components/auth/change-password-dialog.tsx` (RHF+Zod, match rule, `422`→fields, success toast) for the 1.5 user menu. `components/auth/logout-button.tsx` calls `logoutAction` (revoke + clear + redirect). Placeholder `app/(app)/dashboard/page.tsx` proves the round-trip (greeting, permission list, `<Can>`, change-password, logout) until 1.5/1.7. Added `react-hook-form`/`zod`/`@hookform/resolvers` to `apps/web`; `globalEnv: ["NODE_ENV"]` in `turbo.json`. `npm run build` + `lint` (0 errors) + `typecheck` clean.
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
- **Auth contract (1.4):** the ticket references `docs/api/auth.md`, which is absent from the repo. Implemented against the standard envelope + Sanctum shape documented across the context files. Assumptions to confirm against the real backend: `POST /auth/login` accepts `{ email, password }` and returns `{ token, user }` (also tolerates `access_token`); `GET /auth/me` returns the user with flat `roles: string[]` + `permissions: string[]`; `POST /auth/change-password` takes `{ current_password, password, password_confirmation }`; `POST /auth/logout` revokes the current token. If the backend uses ID/username login instead of email, adjust `login-form.tsx`’s field + `loginAction` body and the `422` field mapping. `<Can>` demo on the placeholder dashboard gates on `dashboard.view`.
