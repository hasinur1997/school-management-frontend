/**
 * Exam read + write hooks (task 4.1). Reads back the paginated list; writes
 * create/update and invalidate the `["exams"]` cache key.
 */

export { useExams, EXAMS_PER_PAGE } from "./use-exams"
export {
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useBulkDeleteExam,
} from "./use-exam-mutations"
