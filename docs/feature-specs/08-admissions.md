# 08 — Admissions

Public admission form plus the admin review/approve/reject queue. Contract: `docs/api/admissions.md`.

## Endpoints consumed

- `POST /public/admissions` → submit application. **Public, unauthenticated**, multipart (photo + documents).
- Admin: list pending applications, view detail.
- `POST /admissions/{id}/approve` → creates the student account and sends credentials.
- Reject endpoint (with reason) per the contract.

## Implementation

- **Public form** (standalone layout, no app shell): multi-step — branch + class selection, personal info, guardian info, photo + document uploads. React Hook Form + Zod; multipart submit. Success screen confirms submission. No auth.
- **Admin review** (authenticated, permission-gated): paginated queue of pending applications with status badges; detail view showing all submitted info, photo, and documents; Approve action (confirmation, shows credential-dispatch result) and Reject action (reason required).
- Approving moves the row out of the pending queue and invalidates students/admissions caches.

## Rules

- The public form sends no token and no `branch_id` beyond the selected branch field the contract expects.
- Approval/rejection logic is entirely server-side; the UI only triggers and reflects it.

## Check When Done

- A visitor can submit the public form with uploads and see confirmation.
- An admin can review, approve (with credential dispatch), and reject (with reason).
- Approved applications leave the pending queue.
- Loading/empty/error and upload-validation states present.
- `npm run build` passes.
