/**
 * Client-side application document (task 2.5). The server-generated PDF route is
 * not available yet, so the confirmation screen produces a downloadable PDF from
 * the data the visitor just submitted. The layout (`buildApplicationHtml`) mirrors
 * the on-screen Preview design. The styled markup is rendered offscreen, rasterized with
 * html2canvas (so it preserves the design *and* Bangla text, which jsPDF's
 * built-in fonts can't draw), then embedded into a multi-page jsPDF and saved
 * directly — no print dialog, no new tab.
 *
 * Replace this with a direct link to the server PDF once the contract lands.
 */

import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

import type { AdmissionFormValues } from "./schema"
import { DOC_WIDTH, buildApplicationHtml } from "./application-template"

export interface ApplicationSnapshot {
  applicationNo: string
  schoolName: string
  branchName: string
  className: string
  session: string
  values: AdmissionFormValues
  /** Photo embedded as a data URL so it renders in the offscreen document. */
  photoDataUrl: string | null
  documentNames: string[]
}

/** Read a File into a data URL (so the photo embeds in the document). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Generate the application PDF and download it directly (no print dialog). The
 * markup is rendered offscreen, captured to a canvas, then scaled to fit a
 * single A4 page — the document is a one-page form, so fitting it whole avoids
 * slicing through a row at a page boundary (which left a black seam and a
 * duplicated/half row). Returns false if generation failed so the caller can
 * surface an error.
 */
export async function downloadApplicationPdf(
  snapshot: ApplicationSnapshot
): Promise<boolean> {
  const host = document.createElement("div")
  host.style.position = "fixed"
  host.style.left = "-10000px"
  host.style.top = "0"
  host.style.width = `${DOC_WIDTH}px`
  host.style.background = "#ffffff"
  host.innerHTML = buildApplicationHtml({
    applicationNo: snapshot.applicationNo,
    schoolName: snapshot.schoolName,
    branchName: snapshot.branchName,
    className: snapshot.className,
    session: snapshot.session,
    values: snapshot.values,
    photoUrl: snapshot.photoDataUrl,
  })
  document.body.appendChild(host)

  try {
    const target = host.querySelector<HTMLElement>(".appdoc") ?? host
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    })

    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL("image/jpeg", 0.95)

    // Fit the whole document onto one page: take full page width, then shrink to
    // fit the page height if it would overflow. Centered, top-aligned.
    const ratio = canvas.width / canvas.height
    let imgW = pageW
    let imgH = imgW / ratio
    if (imgH > pageH) {
      imgH = pageH
      imgW = imgH * ratio
    }
    const x = (pageW - imgW) / 2

    doc.addImage(imgData, "JPEG", x, 0, imgW, imgH)
    doc.save(`admission-application-${snapshot.applicationNo}.pdf`)
    return true
  } catch {
    return false
  } finally {
    document.body.removeChild(host)
  }
}
