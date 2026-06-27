/**
 * Permissions that gate the exams module (task 4.1).
 *
 * The slugs match the live backend routes (`routes/api/v1/exams.php`): reads
 * need `exam.view`, writes (create/edit) need `exam.manage`. The API's `403`
 * stays the real boundary — gating only hides what the user can't do.
 */
export const EXAM_VIEW = "exam.view"
export const EXAM_MANAGE = "exam.manage"
