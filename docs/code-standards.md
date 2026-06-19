# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or hook.
- Respect the system boundaries defined in `architecture-context.md`.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any`; use explicit interfaces or narrowly scoped types.
- Model the API's response shapes in `types/` and validate external input at boundaries before trusting it.
- Use `interface` for object contracts.

## Next.js

- Default to React Server Components for data-display surfaces.
- Add `"use client"` only when the component needs browser interactivity, hooks, forms, or token-bound requests.
- Keep route handlers / server actions thin — they exist to proxy auth-bound calls or set the session cookie, not to hold business logic.
- The frontend never reimplements backend rules (results, fees, promotion, branch scoping).

## API Access

- All calls go through the shared Axios client in `lib/api`. It attaches the Sanctum bearer token, sets `Accept: application/json`, and centralizes base URL and error handling.
- Server state is owned by TanStack Query. Use query keys that include the module and relevant filters (including branch for super admin) so cache invalidation is precise.
- Mutations invalidate the affected query keys; do not hand-patch unrelated caches.
- Read the response envelope consistently: `{ success, message, data }`, and `meta` for paginated lists. Never assume a model shape the API did not return.
- Surface API errors to the user: map `422` to field errors, show `401` as a redirect to login, and render `403`/`404` as access/not-found states.

## Authorization

- Gate UI on the permission list the API returns for the current user — never on role names.
- Treat client-side gating as a hint; the API's `401`/`403`/`404` is the real boundary. Always handle those responses even on screens the user "shouldn't" reach.
- Do not send `branch_id` for non-super-admin users; the API scopes automatically.

## Styling

- Use CSS custom property tokens defined in `globals.css` — no raw Tailwind color classes like `zinc-*` or hardcoded hex values.
- Reference tokens through their Tailwind utility names: `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`, etc.
- Maintain the border radius scale: `rounded-md` for controls, `rounded-xl` for cards/tables, `rounded-2xl` for modals.
- Use the status-token mapping in `ui-context.md` for all domain status badges.
- **Mobile-first & responsive by default**: write base styles for small screens and layer `sm:`/`md:`/`lg:`/`xl:` overrides — never desktop-only. Follow the Responsive & Mobile rules in `ui-context.md` (drawer nav < lg, card-list tables on mobile, sheet dialogs < sm, ≥ 44px touch targets, no horizontal page overflow). Reference theme color only through `--accent-primary`; never hardcode a per-accent class.

## Data and Storage

- The Laravel API is the single source of truth. The frontend owns no database, ORM, or persisted artifacts.
- The Sanctum token lives in an httpOnly cookie set server-side, never in `localStorage`.
- Money is handled as the decimal strings the API returns — never parsed into floats for arithmetic.
- PDFs and media are streamed/served by the API; the client only triggers downloads and renders returned URLs.

## Forms

- Use React Hook Form + Zod via shadcn `Form`. Every form has a Zod schema and every input goes through `FormField` so it can render its own `FormMessage`.
- Per-field validation messages are mandatory: required, format, length, range, and match rules show inline below each field with the error token and `aria-invalid`. Map the API's `422` field errors back onto the matching inputs; show non-field messages in a form-level banner and focus the first invalid field.
- Disable submit while a mutation is in flight and show the button's loading state; never allow double submit. Show success via toast and reflect new state by invalidating queries. On failure, keep entered values and surface the error.

## States, Feedback & Resilience

- Every screen implements four states: **loading**, **empty**, **error**, and **success/loaded** — none may be skipped.
- Loading: use `Skeleton` placeholders for initial data fetches and a `loading.tsx` for every async route segment; show a button/inline spinner ("Saving…") for mutations. No blank screens during navigation or fetch.
- Success: every successful mutation shows a concise success toast (Sonner) — including small inline actions (toggles, inline edits, status/single-row actions), not only forms; destructive actions confirm first via Dialog. Use a stable toast `id` per action so rapid repeats replace rather than stack.
- Errors: every failed request surfaces a clear human message — inline for field errors, toast or error panel otherwise; prefer the API `message` with a fallback. Never show raw errors, stack traces, or `[object Object]`, and never silently swallow.
- Resilience: add a root error boundary and per-route `error.tsx`; the app must never white-screen. Handle query/mutation `isError`, guard against undefined/partial API data, and render retryable states for network/`5xx` errors.

## Authentication on every screen

- The authenticated route group is protected server-side; unauthenticated users redirect to login. A `401` clears the session and redirects. Only the public group (login, public admission, payment callbacks) is exempt.
- No authenticated screen renders its content before auth and the permission context are resolved.

## File Organization

- `lib/` — shared infrastructure: Axios client, auth/token helpers, permission helpers, formatters, utilities.
- `hooks/` — TanStack Query hooks and client state, grouped by module.
- `components/` — UI composition only; no business logic.
- `components/ui/` — generated shadcn primitives; reusable, not feature-specific.
- `app/` — App Router routes (public group + authenticated dashboard group).
- `types/` — API contract types and shared domain types.
- Name files after the responsibility they contain, not the technology.
