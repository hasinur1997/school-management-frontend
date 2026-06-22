# Task F-2.6 — Admissions Review (Queue, Detail, Approve/Reject)

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 1.5, 2.1 |
| Blocks | 2.7 (creates students) |
| Feature spec | `feature-specs/08-admissions.md` |
| Contract | `docs/api/admissions.md` |
| Endpoints | `GET /admissions`, `GET /admissions/{id}`, `POST /admissions/{id}/approve`, `POST /admissions/{id}/reject` |

## Objective
The authenticated, permission-gated admin surface to review applications and approve (creates student + sends credentials) or reject (with reason).

## Screens / Components
- **Queue list**: paginated, with status/class/search filters (per contract) and status badges. Mobile → card list.
- **Detail view**: all submitted info, photo, and documents.
- **Approve** action: confirmation, then `POST .../approve`; show the credential-dispatch result; the row leaves the pending queue.
- **Reject** action: dialog requiring a reason → `POST .../reject`.

## Behavior
- Approve/reject invalidate the admissions + students caches.
- `422`/conflict messages surfaced clearly (e.g. already-processed application).

## Rules
- Gated by the documented admission permission; super admin sees all branches.
- The UI only triggers and reflects server-side approval/rejection.

## Check When Done
- [x] Admin can list, filter, view detail, approve (with credential dispatch) and reject (with reason).
- [x] Approved/rejected applications leave the pending queue.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
