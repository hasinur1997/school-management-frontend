/**
 * Invoice read hooks (task F-5.2). The staff list (`GET /invoices`), one
 * invoice with its payments (`GET /invoices/{id}`), and the student/parent
 * self-service read (`GET /me/invoices`).
 */

export { useInvoices, INVOICES_PER_PAGE } from "./use-invoices"
export { useInvoice } from "./use-invoice"
export { useMyInvoices, MY_INVOICES_PER_PAGE } from "./use-my-invoices"
export {
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from "./use-invoice-mutations"
