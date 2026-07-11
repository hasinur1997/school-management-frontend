/**
 * Client-side money-receipt PDF (task F-5.3). Renders the on-screen
 * `ReceiptPaper` into a single content-fit page via the shared `paper-pdf`
 * renderer, so the downloaded/printed receipt matches the design exactly. This
 * replaces the deprecated backend `GET /payments/{id}/receipt` stream.
 */

import * as React from "react"

import type { Invoice, Payment } from "@/types/invoice"
import { downloadPaperPdf, printPaperPdf } from "./paper-pdf"
import { ReceiptPaper, RECEIPT_PAPER_WIDTH } from "./receipt-paper"

export interface ReceiptDocData {
  invoice: Invoice
  payment: Payment
  methodLabel?: string
  /** Downloaded file name (without extension). */
  fileName: string
}

function element(data: ReceiptDocData): React.ReactElement {
  return React.createElement(ReceiptPaper, {
    invoice: data.invoice,
    payment: data.payment,
    methodLabel: data.methodLabel,
  })
}

/** Generate the receipt PDF and download it directly. */
export function downloadReceiptPdf(data: ReceiptDocData): Promise<boolean> {
  return downloadPaperPdf(element(data), RECEIPT_PAPER_WIDTH, data.fileName)
}

/** Generate the receipt PDF and open the browser print dialog. */
export function printReceiptPdf(data: ReceiptDocData): Promise<boolean> {
  return printPaperPdf(element(data), RECEIPT_PAPER_WIDTH, data.fileName)
}
