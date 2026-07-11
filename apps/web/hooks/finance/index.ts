/**
 * Finance read + write hooks (tasks F-5.4 / F-5.6). Reads the shared category
 * list plus the paginated income/expense ledgers; writes create/update/delete
 * and invalidate the matching cache key.
 */

export { useCategories, CATEGORIES_PER_PAGE } from "./use-categories"
export {
  useCategoriesList,
  CATEGORIES_LIST_PER_PAGE,
} from "./use-categories-list"
export { useIncomes, INCOMES_PER_PAGE } from "./use-incomes"
export { useExpenses, EXPENSES_PER_PAGE } from "./use-expenses"
export {
  useCreateIncome,
  useUpdateIncome,
  useDeleteIncome,
} from "./use-income-mutations"
export {
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "./use-expense-mutations"
export {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "./use-category-mutations"
