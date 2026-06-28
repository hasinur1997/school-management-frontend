/**
 * Permissions that gate the marks module (task 4.2).
 *
 * The slugs match the live backend routes (`routes/api/v1/marks.php`): the entry
 * sheet + bulk save need `marks.entry`, the browse listing needs `marks.view`.
 * The API's `403` stays the real boundary — gating only hides what the user
 * can't do.
 */
export const MARKS_ENTRY = "marks.entry"
export const MARKS_VIEW = "marks.view"
