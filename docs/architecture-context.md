# Architecture Context

## Stack

| Layer            | Technology               | Role                                                                  |
| ---------------- | ------------------------ | --------------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript  | App Router frontend with server/client boundaries                     |
| UI               | Tailwind v4 + shadcn/ui  | Component composition and styling (dark-only theme)                   |
| Backend API      | Laravel REST `/api/v1`   | All data and business logic; JSON only, consumed over HTTP            |
| Auth             | Laravel Sanctum (tokens) | Token-based identity; bearer token attached to every API request      |
| Authorization    | Permission-based         | UI gated by the permissions the API returns for the signed-in user    |
| Server state     | TanStack Query + Axios   | API caching, invalidation, and an Axios client with auth interceptors |
| Forms            | React Hook Form + Zod    | Client-side validation mirroring the API's Form Request rules         |
| PDFs             | Server-generated         | Result sheets, ID cards, receipts, TC, and reports streamed by the API |
| Payments         | SSLCommerz redirect      | Hosted checkout opened from the client; callbacks handled by the API   |

## System Boundaries

- `app` — App Router routes: server components for initial data, client components for interactivity. Route groups separate public (admission, login) from authenticated dashboard surfaces.
- `lib` — Shared infrastructure: the Axios API client, auth/token helpers, permission helpers, and utilities.
- `components` — UI composition: dashboard shells, tables, forms, dialogs, and feature widgets.
- `components/ui` — Generated shadcn/ui primitives. Reusable foundation; not modified by feature work.
- `hooks` — TanStack Query hooks and client-side state for each module.
- `types` — TypeScript contracts mirroring the API's resource and envelope shapes.

The frontend owns **no** database, ORM, or background workers. All persistence, business rules, and long-running work live in the Laravel API. The client is a presentation and orchestration layer over that API.

## Storage Model

- **Source of truth**: the Laravel API. The frontend holds no relational data of its own.
- **Server state**: cached in TanStack Query, keyed per module and per branch; mutations invalidate the affected query keys.
- **Session/auth state**: the Sanctum token is stored in an httpOnly cookie (set via a server action / route handler), never in `localStorage`.
- **Generated artifacts** (result sheets, ID cards, money receipts, TC, report exports) are PDFs streamed by the API on demand. The client triggers a download; it never builds or stores PDFs itself.
- **Uploaded media** (student photos, admission documents) is sent to the API as multipart form data and served back via the URLs the API returns.

## Auth and Authorization Model

- Identity is established by logging in against the API; Sanctum returns a personal access token that the client attaches as a bearer token on every request.
- Six roles exist server-side: super admin, admin, accountant, teacher, student, parent. The client never branches on role names — it reads the **permission list** the API returns for the current user and shows or hides UI from that.
- Protected routes redirect unauthenticated users to login; the dashboard layout fetches the current user once and provides permissions through context.
- Record-level access (a parent seeing only linked students, a student seeing only their own data) is enforced by the API. The UI optimistically hides what the user cannot reach but treats the API as the authority — a 403/404 from the API is the real gate.

## Branch Scoping Model

- Every user has a **home branch** (`users.branch_id`) and may be granted **additional branches** via the `branch_user` pivot; `User::accessibleBranches()` returns the set a user may operate in (super admin → every active branch). `/auth/me` returns this set as `user.branches`, which drives the **global branch switcher** (sidebar) and the **post-login branch picker**.
- The request's active branch is resolved by `App\Support\BranchContext` (reset per request by `ResolveBranchContext` middleware): super admin → the requested `branch_id` (or null = consolidated); everyone else → the requested branch **if they may access it**, otherwise their home branch. A single-branch user therefore always resolves to their own branch. `BranchScope` and the `BelongsToBranch` create-stamp both read `BranchContext::current()`.
- The client forwards the selected branch as the `branch_id` query param on every request (for **all** users, not only super admin); the API honors it only for branches the user may access and silently falls back to home otherwise — so a stale/forbidden selection can never leak another branch's data.
- Allowed branches are assigned to a user via `PUT /users/{user}/branches` (super-admin only).
- Out-of-branch records surface as 404 from the API; the UI renders a not-found state, not a permission error.

## Module Surfaces

The frontend mirrors the API's modules, each as a route + query-hook + components triad:

- **Admission** — public, unauthenticated form (personal/guardian info, photo, documents) and an admin review queue for approve/reject.
- **People** — students, teachers, and parents: lists, profiles, and admin create/edit forms.
- **Academic** — sessions, classes, sections, and subjects with teacher assignments.
- **Attendance** — daily student attendance entry and monthly sheets; teacher check-in/out views.
- **Exams & Results** — subject-wise mark entry per exam and weighted annual result views; result-sheet PDF download.
- **Promotion** — bulk and individual promotion controls per class.
- **Finance** — fee invoices, SSLCommerz/local payment flows, receipts, plus income, expense, and asset management.
- **Documents** — ID card and transfer-certificate generation (PDF).
- **Reports** — filterable (weekly/monthly/yearly/custom, per branch or consolidated) finance, student, teacher, and asset reports with PDF export.
- **Settings** — global and per-branch configuration surfaced only to permitted users.

## Payment Model

- The client requests a payment session for an unpaid invoice from the API and redirects the browser to the SSLCommerz hosted checkout URL the API returns.
- The client never validates payments or marks invoices paid. SSLCommerz calls the API's callback/IPN; the API validates and posts the payment.
- On return, the client polls or refetches invoice state from the API to reflect the result and offers the money-receipt PDF download.

## Invariants

1. The frontend never holds business logic that belongs to the API — no result computation, fee calculation, promotion rules, or branch scoping is reimplemented client-side.
2. The API is the single source of truth; the client caches but never becomes authoritative. Every mutation reconciles against the API response.
3. Authorization in the UI is permission-based, never role-name-based, and is treated as a hint — the API's 401/403/404 is the real boundary.
4. Money is displayed exactly as the API returns it (decimal strings); the client never does float arithmetic on monetary values.
5. PDFs and media are streamed/served by the API; the client only triggers and presents them.
6. `"use client"` is added only where browser interactivity, hooks, or token-bound requests require it; data-fetch-only surfaces stay server components.
7. `components/ui/*` shadcn primitives and third-party internals remain unmodified; feature styling and logic live in app-level components.
