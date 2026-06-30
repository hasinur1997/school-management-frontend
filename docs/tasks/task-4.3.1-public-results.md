# Task F-4.3.1 — Public Result Lookup

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `done` |
| Depends on | 1.1, 1.3, 4.2 |
| Blocks | — |
| Feature spec | `feature-specs/13-results.md` |
| Contract | Backend-provided public results contract |
| Route | `/results/public` |
| Endpoint | `GET {base_url}/api/v1/public/results?roll_no={roll_no}&class_id={class_public_id}&year={year}&semester={semester}` |

## Objective
Standalone, unauthenticated public result lookup page. A visitor enters roll number, class, year, and semester, then the frontend displays the API-returned student information and subject-wise marks/grades. No app shell, no token, and no result computation on the client.

## API Contract

### `GET /api/v1/public/results?roll_no=12&class_id={class_public_id}&year=2026&semester=final` — `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "student_information": {
      "roll_no": 12,
      "student_name": "Rahima Khatun",
      "father_name": "Abdul Karim",
      "mother_name": "Amena Begum",
      "class": "Class 7",
      "section": "A",
      "session": "2026",
      "semester": "final",
      "date_of_birth": "2014-03-09",
      "result": "5.00"
    },
    "subjects": [
      {
        "subject_code": "MATH7",
        "subject_name": "Mathematics",
        "marks": "90.00",
        "grade": "A+"
      }
    ]
  }
}
```

## Inputs

| Field | Required | Notes |
|---|---|---|
| `roll_no` | yes | Numeric input, digits only, sent as `roll_no`. |
| `class_id` | yes | Public class id, sent as `class_id`. The UI may show the class name but must submit the class public id. |
| `year` | yes | Four-digit academic year, sent as `year`. Default can be current year if that matches existing selector conventions. |
| `semester` | yes | Sent as `semester`; include `final` and any other values documented by the backend. |

## Screens

1. **Lookup form** — public form with roll number, class, year, semester, and a "Search result" submit button.
2. **Result — found** — student information summary plus subject-wise marks table.
3. **Result — not found** — generic empty state with a retry action.
4. **Error state** — retryable panel for network/5xx errors, separate from not-found.

## Result — Found

### Student Information

Display all fields returned under `student_information`:

| API field | Display |
|---|---|
| `roll_no` | Roll No |
| `student_name` | Student Name |
| `father_name` | Father Name |
| `mother_name` | Mother Name |
| `class` | Class |
| `section` | Section |
| `session` | Session |
| `semester` | Semester |
| `date_of_birth` | Date of Birth, formatted with the app date formatter |
| `result` | Result / GPA, shown as returned by the API, e.g. `5.00` |

### Subject Wise Grade/Marks

Render a responsive table/card list for every item in `subjects`:

| API field | Display |
|---|---|
| `subject_code` | Subject Code |
| `subject_name` | Subject Name |
| `marks` | Marks |
| `grade` | Grade |

## Behavior

- The GET request runs only on submit, not on every input change.
- The submitted state should be URL-driven so refresh/back navigation preserves the lookup (`?roll_no=&class_id=&year=&semester=`).
- No auth token is required; this route must live outside the authenticated app shell.
- Client validation blocks missing fields before calling the API.
- `422` validation errors map back to their matching fields.
- `404` or an empty successful response renders a generic not-found state: "No result was found for those details. Please check the roll number, class, year, and semester, then try again."
- Network/5xx errors render a retryable error panel and must not be treated as not-found.
- Display `result`, `marks`, and `grade` exactly as returned. The frontend must not calculate GPA, marks, grades, pass/fail, or ranking.
- If the class selector uses `GET /public/settings`, reuse the public admission settings data shape and submit the selected class public id. If the backend provides a dedicated public class list later, switch the hook to that contract.

## Design

- Standalone public layout, visually consistent with the existing public admission/status pages, not the dashboard shell.
- Use shadcn/ui and app tokens; no hardcoded palette in feature components.
- Result area should be printable-friendly, but PDF/download is out of scope for this ticket.
- Responsive at 360 / 768 / >=1280px with no horizontal overflow.

## Files / Implementation Notes

- Add result contract types in `apps/web/types/result.ts` or a focused public-result type file.
- Add a TanStack Query hook under `apps/web/hooks/results/` for the public lookup.
- Add a standalone route under `apps/web/app/results/public/` with `page.tsx`, `loading.tsx`, and `error.tsx` as needed.
- Keep reusable result display components under `apps/web/components/results/`.

## Check When Done

- [x] Public visitor can submit roll number, class, year, and semester without signing in.
- [x] Successful lookup renders every student information field from the contract.
- [x] Successful lookup renders subject code, subject name, marks, and grade for every subject.
- [x] The class field submits the class public id as `class_id`.
- [x] Missing fields and `422` errors show inline field messages.
- [x] Not-found and network/5xx errors are distinct states.
- [x] URL query params preserve the latest submitted lookup.
- [x] No client-side GPA, marks, grade, or pass/fail computation is introduced.
- [x] Responsive at 360/768/>=1280px.
- [x] `npm run build` passes.
