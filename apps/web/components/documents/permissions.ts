/**
 * Permission slugs for the Documents module (feature-spec 17). ID card
 * generation (single + batch) is gated on `idcard.generate`; the transfer
 * certificate slugs are listed for the module route's combined gate and the
 * later TC task.
 */
export const IDCARD_GENERATE = "idcard.generate"
export const TC_ISSUE = "tc.issue"
export const TC_VIEW = "tc.view"
