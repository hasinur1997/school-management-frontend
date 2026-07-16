/**
 * Permission gating the reports module (task F-6.3). The backend guards every
 * report endpoint — reads and PDF exports — with `report.view`
 * (`routes/api/v1/reports.php`). The API's `403` stays the real boundary; gating
 * only hides what the user can't reach.
 */
export const REPORT_VIEW = "report.view"
