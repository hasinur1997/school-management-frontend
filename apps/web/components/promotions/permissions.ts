/**
 * Permissions that gate the promotion module (task 4.5).
 *
 * The slugs match the live backend routes (`routes/api/v1/promotions.php`):
 * preview + bulk + individual sit behind `promotion.execute`; the history log
 * behind `promotion.view`; promoting a student who did not pass additionally
 * needs `promotion.override` (checked in the service). The API's `403` stays the
 * real boundary — gating only hides what the user can't do.
 */
export const PROMOTION_EXECUTE = "promotion.execute"
export const PROMOTION_VIEW = "promotion.view"
export const PROMOTION_OVERRIDE = "promotion.override"
