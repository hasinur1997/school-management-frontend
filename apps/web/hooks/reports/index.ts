/**
 * Reports dashboard read hooks (imported "Reports" design). One reader per tab
 * over the shared analytics filter contract.
 */

export {
  useOverviewReport,
  useFeesCollectionReport,
  useAttendanceReport,
  useExamsReport,
  useAdmissionsReport,
  useExpensesReport,
  toAnalyticsParams,
} from "./use-analytics"
