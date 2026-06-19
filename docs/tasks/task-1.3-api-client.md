# Task F-1.3 — API Client & Server State

| Field | Value |
|---|---|
| Phase | 1 — Foundation |
| Status | `todo` |
| Depends on | 1.1 |
| Blocks | every data-fetching screen |
| Feature spec | `feature-specs/02-api-client.md` |
| Contract | `docs/api-spec.md` |

## Objective
The single data layer every feature uses to talk to the Laravel API at `/api/v1` — envelope unwrapping, error normalization, and TanStack Query setup.

## What To Build
- Shared Axios instance in `lib/api`:
  - base URL from env (`/api/v1`), `Accept: application/json`.
  - request interceptor attaches `Authorization: Bearer {token}` from the session.
  - response interceptor unwraps `{ success, message, data, meta? }` and normalizes errors.
- Error normalization:
  - `401` → clear session + redirect to login.
  - `422` → typed validation error exposing `field → messages[]`.
  - `403` / `404` → typed access / not-found errors for screens to render.
  - network / `5xx` → retryable error type.
- TanStack Query: `QueryClientProvider` at the app root; sensible defaults (no refetch-on-focus for heavy lists, per-module stale times).
- Query-key convention `[module, action, params]`, where `params` includes branch for super admin.
- `types/api.ts` for the envelope and pagination `meta` shapes.

## Rules
- No feature code calls `fetch`/Axios directly — everything goes through `lib/api`.
- The client transports and shapes errors only; never holds business logic.

## Check When Done
- [ ] A demo query returns unwrapped `data` and reads `meta`.
- [ ] `401 / 422 / 403 / 404` each produce the correct typed outcome.
- [ ] Query provider mounted at root; query-key convention documented in code.
- [ ] `npm run build` passes.
