/**
 * Client-side PDF renderer for the invoice papers (task F-5.3). The invoice and
 * money-receipt PDFs are generated in the browser from the same fixed-width
 * `InvoicePaper` / `ReceiptPaper` React components shown on screen, so the file
 * matches the design pixel-for-pixel. This mirrors the results transcript
 * exporter (`components/results/result-mark-sheet-document.ts`).
 *
 * The paper is rendered into an offscreen host, rasterized with `html-to-image`
 * (which serializes the DOM into an SVG `<foreignObject>` and lets the browser
 * paint it — reproducing borders and rounded cards exactly), and embedded into a
 * single jsPDF page sized to the content aspect so there's no trailing white
 * space. `downloadPaperPdf` saves it; `printPaperPdf` opens the browser print
 * dialog (falling back to a download if the popup is blocked).
 */

import * as React from "react"
import { toCanvas } from "html-to-image"
import { jsPDF } from "jspdf"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"

/**
 * Page width in points. Set to 80% of A4 portrait width (595.28pt) so the
 * generated paper is 20% narrower — the full-A4 render read wider than the
 * on-screen paper. The page height tracks the content aspect from this width.
 */
const PAGE_WIDTH_PT = 595.28 * 0.8
/**
 * Slim white margin around the paper, in points (~0.17"). Just enough breathing
 * room at the page edge without framing the document.
 */
const PAGE_MARGIN_PT = 12
/**
 * Oversampling factor for the embedded raster. At the 794px paper width this
 * yields a ~3176px-wide capture embedded into a 595pt A4 page — roughly 384 DPI,
 * comfortably above the 300 DPI print standard, so text stays crisp on zoom and
 * on paper rather than reading as a soft screenshot.
 */
const EXPORT_PIXEL_RATIO = 4

/** Wait for the next paint so freshly-rendered fonts/borders are on screen. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
}

async function waitForFonts(): Promise<void> {
  const fonts = document.fonts
  if (!fonts) return
  try {
    // Force every declared face (Geist, Geist Mono, Noto Sans Bengali, …) to
    // load before we rasterize. `fonts.ready` alone only settles faces already
    // in flight, which can race the offscreen render and let a glyph fall back
    // to a system font that the raster then bakes in — the exact drift we're
    // fixing. Explicitly loading each face closes that gap.
    await Promise.all(Array.from(fonts).map((face) => face.load()))
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

/** Render a paper element offscreen and embed it into a content-fit page. */
async function renderPaperPdf(
  element: React.ReactElement,
  width: number
): Promise<jsPDF> {
  const host = document.createElement("div")
  host.style.position = "fixed"
  host.style.left = "-10000px"
  host.style.top = "0"
  host.style.width = `${width}px`
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
            "data-paper-root": true,
            style: { width, boxSizing: "border-box" },
          },
          element
        )
      )
    })

    await waitForFonts()
    await waitForImages(host)
    // Let the browser paint the fully-fonted, image-loaded tree once before we
    // snapshot it, so nothing is captured mid-layout.
    await nextFrame()

    const target = host.querySelector<HTMLElement>("[data-paper-root]") ?? host

    // Flatten the paper for the PDF: drop the on-screen card's border, rounded
    // corners and drop shadow so the rendered document reads flat and full,
    // exactly like the app's print stylesheet does for `.invoice-paper-root`.
    // The on-screen card is untouched — this only affects the offscreen clone.
    const paper = host.querySelector<HTMLElement>(".invoice-paper-root")
    if (paper) {
      paper.style.border = "none"
      paper.style.borderRadius = "0"
      paper.style.boxShadow = "none"
    }

    // Render at a high pixel ratio so the embedded raster stays crisp
    // regardless of the device's own DPI. Two passes: the first warms
    // html-to-image's font/CSS embedding cache (a known first-run miss), the
    // second produces the canvas we keep — this reliably captures the web fonts.
    await toCanvas(target, {
      pixelRatio: EXPORT_PIXEL_RATIO,
      backgroundColor: "#ffffff",
      cacheBust: true,
    })
    const canvas = await toCanvas(target, {
      pixelRatio: EXPORT_PIXEL_RATIO,
      backgroundColor: "#ffffff",
      cacheBust: true,
    })

    // The paper is inset by a uniform margin (matching the web's centered card),
    // so it fills the page width minus both margins; the page height tracks that
    // insetted width by the content aspect plus the top/bottom margins — no
    // trailing white space.
    const contentW = PAGE_WIDTH_PT - PAGE_MARGIN_PT * 2
    const contentH = (contentW * canvas.height) / canvas.width
    // Derive the page orientation from the actual content aspect. A tall paper
    // (receipts, mark sheets) stays portrait; a wide paper (the side-by-side ID
    // card) is landscape. Hardcoding "portrait" made jsPDF swap a wide page's
    // dimensions to enforce portrait, shrinking the page narrower than the
    // embedded image and clipping its right edge.
    const pageH = contentH + PAGE_MARGIN_PT * 2
    const doc = new jsPDF({
      unit: "pt",
      format: [PAGE_WIDTH_PT, pageH],
      orientation: PAGE_WIDTH_PT >= pageH ? "landscape" : "portrait",
    })
    // Paint the page white so the margin band matches the paper's background
    // instead of showing the viewer's default gray.
    doc.setFillColor(255, 255, 255)
    doc.rect(
      0,
      0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      "F"
    )
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      PAGE_MARGIN_PT,
      PAGE_MARGIN_PT,
      contentW,
      contentH
    )
    return doc
  } finally {
    root.unmount()
    document.body.removeChild(host)
  }
}

/** Generate the paper PDF and download it directly (no print dialog). */
export async function downloadPaperPdf(
  element: React.ReactElement,
  width: number,
  fileName: string
): Promise<boolean> {
  try {
    const doc = await renderPaperPdf(element, width)
    doc.save(`${fileName}.pdf`)
    return true
  } catch {
    return false
  }
}

/** Generate the paper PDF and open it with the browser print dialog. */
export async function printPaperPdf(
  element: React.ReactElement,
  width: number,
  fileName: string
): Promise<boolean> {
  try {
    const doc = await renderPaperPdf(element, width)
    doc.autoPrint()
    const opened = window.open(String(doc.output("bloburl")), "_blank")
    if (!opened) {
      // Popup blocked — fall back to a direct download so the action isn't lost.
      doc.save(`${fileName}.pdf`)
    }
    return true
  } catch {
    return false
  }
}
