/**
 * Client-side academic-transcript document. The server-generated result PDF
 * (task 4.4) is blocked on backend 8.4, so the mark sheet renders the same
 * shared paper component used on screen into an offscreen host, rasterizes it,
 * and embeds it into a single-page jsPDF sized exactly to the content.
 * `downloadMarkSheetPdf` saves it directly; `printMarkSheetPdf` opens it with
 * the browser print dialog.
 *
 * Rasterization goes through `html-to-image`, which serializes the DOM into an
 * SVG `<foreignObject>` and lets the browser paint it. Unlike the previous
 * html2canvas path this reproduces table borders and vertical centring exactly
 * as they appear on screen, and renders at a high pixel ratio for a crisp PDF.
 * The export still remains a temporary client-side fallback until the backend
 * streaming contract lands.
 */

import * as React from "react"
import { toCanvas } from "html-to-image"
import { jsPDF } from "jspdf"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"

import {
  MARK_SHEET_DOC_WIDTH,
  ResultMarkSheetFootnote,
  ResultMarkSheetPaper,
  type ResultMarkSheetPaperProps,
} from "./result-mark-sheet-paper"

export interface MarkSheetDocData extends ResultMarkSheetPaperProps {
  /** Downloaded file name (without extension). */
  fileName: string
}

/** A4 portrait width in points; the page height tracks the content aspect. */
const PAGE_WIDTH_PT = 595.28
/** Oversampling factor for the embedded raster — keeps the PDF sharp on zoom. */
const EXPORT_PIXEL_RATIO = 3

/** Read a remote image into a data URL so it embeds in the offscreen document. */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" })
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function waitForFonts(): Promise<void> {
  const fonts = document.fonts
  if (!fonts) return
  try {
    await fonts.ready
  } catch {
    // Best effort only — keep the export moving if the browser blocks this.
  }
}

async function waitForImages(target: HTMLElement): Promise<void> {
  const images = Array.from(target.querySelectorAll("img"))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener("load", () => resolve(), { once: true })
          img.addEventListener("error", () => resolve(), { once: true })
        })
    )
  )
}

/** Render the transcript offscreen and embed it into a single content-fit page. */
async function renderMarkSheetPdf(data: MarkSheetDocData): Promise<jsPDF> {
  const inlineLogo = data.schoolLogo ? await toDataUrl(data.schoolLogo) : null

  const host = document.createElement("div")
  host.style.position = "fixed"
  host.style.left = "-10000px"
  host.style.top = "0"
  host.style.width = `${MARK_SHEET_DOC_WIDTH}px`
  host.style.background = "#ffffff"
  host.style.pointerEvents = "none"
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    flushSync(() => {
      root.render(
        React.createElement(
          "div",
          {
            "data-mark-sheet-root": true,
            style: {
              width: MARK_SHEET_DOC_WIDTH,
              boxSizing: "border-box",
            },
          },
          React.createElement(ResultMarkSheetPaper, {
            ...data,
            schoolLogo: inlineLogo ?? data.schoolLogo,
          }),
          React.createElement(ResultMarkSheetFootnote, {
            className: "mt-2.5",
          })
        )
      )
    })

    await waitForFonts()
    await waitForImages(host)

    const target =
      host.querySelector<HTMLElement>("[data-mark-sheet-root]") ?? host

    // Render the DOM at a high pixel ratio so the embedded raster stays crisp
    // regardless of the device's own DPI. foreignObject painting keeps borders
    // and cell vertical-align identical to the on-screen view.
    const canvas = await toCanvas(target, {
      pixelRatio: EXPORT_PIXEL_RATIO,
      backgroundColor: "#ffffff",
      cacheBust: true,
    })

    const doc = new jsPDF({
      unit: "pt",
      // A4 portrait width; the height is derived from the content so the page
      // ends exactly where the transcript does — no trailing white space.
      format: [PAGE_WIDTH_PT, (PAGE_WIDTH_PT * canvas.height) / canvas.width],
      orientation: "portrait",
    })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL("image/png")

    doc.addImage(imgData, "PNG", 0, 0, pageW, pageH)
    return doc
  } finally {
    root.unmount()
    document.body.removeChild(host)
  }
}

/** Generate the transcript PDF and download it directly (no print dialog). */
export async function downloadMarkSheetPdf(
  data: MarkSheetDocData
): Promise<boolean> {
  try {
    const doc = await renderMarkSheetPdf(data)
    doc.save(`${data.fileName}.pdf`)
    return true
  } catch {
    return false
  }
}

/** Generate the transcript PDF and open it with the browser print dialog. */
export async function printMarkSheetPdf(
  data: MarkSheetDocData
): Promise<boolean> {
  try {
    const doc = await renderMarkSheetPdf(data)
    doc.autoPrint()
    const blobUrl = doc.output("bloburl")
    const opened = window.open(String(blobUrl), "_blank")
    if (!opened) {
      // Popup blocked — fall back to a direct download so the action isn't lost.
      doc.save(`${data.fileName}.pdf`)
    }
    return true
  } catch {
    return false
  }
}
