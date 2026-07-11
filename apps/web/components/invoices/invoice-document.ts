/**
 * Client-side invoice PDF (task F-5.2/5.3). Renders the on-screen `InvoicePaper`
 * into a single content-fit page via the shared `paper-pdf` renderer, so the
 * downloaded/printed invoice matches the design exactly.
 */

import * as React from "react"

import type { Invoice } from "@/types/invoice"
import { downloadPaperPdf, printPaperPdf } from "./paper-pdf"
import { InvoicePaper, INVOICE_PAPER_WIDTH } from "./invoice-paper"

export interface InvoiceDocData {
  invoice: Invoice
  /** Downloaded file name (without extension). */
  fileName: string
}

function element(data: InvoiceDocData): React.ReactElement {
  return React.createElement(InvoicePaper, { invoice: data.invoice })
}

/** Generate the invoice PDF and download it directly. */
export function downloadInvoicePdf(data: InvoiceDocData): Promise<boolean> {
  return downloadPaperPdf(element(data), INVOICE_PAPER_WIDTH, data.fileName)
}

/** Generate the invoice PDF and open the browser print dialog. */
export function printInvoicePdf(data: InvoiceDocData): Promise<boolean> {
  return printPaperPdf(element(data), INVOICE_PAPER_WIDTH, data.fileName)
}
