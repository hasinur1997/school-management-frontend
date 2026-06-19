# 11 — Teacher Attendance

Teacher self check-in/check-out and admin correction views. Contract: `docs/api/teacher-attendance.md`.

## Endpoints consumed

- `POST /teacher-attendance/check-in` (and the corresponding check-out endpoint). The API validates the request IP against the branch check-in IP whitelist.
- Admin list/correction endpoints per the contract.

## Implementation

- **Teacher view**: a check-in / check-out widget showing today's status and times. On an IP-whitelist rejection, render the API's error clearly (e.g. "check-in not allowed from this network") rather than masking it.
- **Admin view**: paginated teacher-attendance table with date filters and the ability to view/correct records per the contract.

## Rules

- IP validation is entirely server-side; the UI only triggers check-in and surfaces the result.
- Permission-gated; super admin sees all branches.

## Check When Done

- A teacher can check in/out and sees today's status.
- An IP-rejected check-in shows the API's reason.
- Admin can list and correct teacher attendance.
- Loading/empty/error states present.
- `npm run build` passes.
