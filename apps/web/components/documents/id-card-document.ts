/**
 * Client-side student ID card PDF (task 6.1). Renders the on-screen
 * `IdCardPaper` into a single content-fit page via the shared `paper-pdf`
 * renderer, so the downloaded/printed card matches the design — and the live
 * preview — exactly. The cards keep their rounded corners and shadow (the
 * renderer only flattens `.invoice-paper-root`, which this paper doesn't use).
 */

import * as React from "react"

import { downloadPaperPdf, printPaperPdf } from "@/components/invoices/paper-pdf"
import { IdCardPaper, ID_CARD_WIDTH, type IdCardData } from "./id-card-paper"

function element(data: IdCardData): React.ReactElement {
  return React.createElement(IdCardPaper, { data })
}

/** Generate the ID card PDF and download it directly. */
export function downloadIdCardPdf(
  data: IdCardData,
  fileName: string
): Promise<boolean> {
  return downloadPaperPdf(element(data), ID_CARD_WIDTH, fileName)
}

/** Generate the ID card PDF and open the browser print dialog. */
export function printIdCardPdf(
  data: IdCardData,
  fileName: string
): Promise<boolean> {
  return printPaperPdf(element(data), ID_CARD_WIDTH, fileName)
}
