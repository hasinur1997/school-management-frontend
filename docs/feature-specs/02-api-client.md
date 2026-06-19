# 02 — API Client & Server State

Build the single data layer every feature uses to talk to the Laravel API. See `docs/api-spec.md` for the envelope and conventions.

## Scope

Infrastructure only — no feature screens.

## Implementation

- Create a shared Axios instance in `lib/api`:
  - base URL from env (`/api/v1`), `Accept: application/json`.
  - request interceptor attaches `Authorization: Bearer {token}` from the session.
  - response interceptor unwraps the `{ success, message, data, meta? }` envelope and normalizes errors.
- Error normalization:
  - `401` → clear session and redirect to login.
  - `422` → throw a typed validation error exposing field → messages.
  - `403` / `404` → typed access/not-found errors for screens to render.
- Add TanStack Query: a `QueryClientProvider` at the app root with sensible defaults (no refetch on window focus for heavy lists, stale times per module).
- Define a query-key convention: `[module, action, params]`, where `params` includes branch for super admin.
- Add `types/api.ts` for the envelope and pagination `meta` shapes.

## Rules

- No feature code calls `fetch`/Axios directly — everything goes through `lib/api`.
- The client never holds business logic; it only transports and shapes errors.

## Check When Done

- A demo query through the client returns unwrapped `data` and reads `meta`.
- `401`, `422`, `403`, `404` each produce the correct typed outcome.
- Query provider is mounted at the root.
- `npm run build` passes.
