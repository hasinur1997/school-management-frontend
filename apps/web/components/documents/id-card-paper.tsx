/**
 * Printable student ID card (task 6.1) — a faithful, pixel-for-pixel recreation
 * of the imported "Student ID Card" Claude Design handoff, bound to real student
 * data. Two sides (front + back), each a fixed 324×512 card, laid out on the
 * design's light canvas so the on-screen preview and the client-rendered PDF
 * match the design exactly.
 *
 * Like the sibling invoice/receipt papers this is a **fixed-palette** paper: it
 * deliberately ignores the app's light/dark theme and uses inline styles with
 * literal design values so it renders identically on screen, in the exported
 * PDF, and in print. The fonts (Geist, Geist Mono, Noto Sans Bengali) are the
 * app's own `--font-*` variables — the same faces the design specifies.
 */

import * as React from "react"

/** Total canvas width: two 324px cards + 32px gap + 24px padding each side. */
export const ID_CARD_WIDTH = 728
/** Total canvas height: one 512px card + 24px padding top and bottom. */
export const ID_CARD_HEIGHT = 560

/** Fixed institution identity (mirrors `receipt-paper.tsx`). */
const SCHOOL_NAME = "Hazi Jabed Ali Memorial School"
const SCHOOL_ADDRESS_SHORT = "Luxmipur, Chatmohor, Pabna"
const SCHOOL_ADDRESS = "Lakshmipur, Dhanuyaghata, Chatmohor, Pabna"
const SCHOOL_PHONE = "+880 1911-223344"
const SCHOOL_LOGO = "/branding/hjams-school-seal.svg"
const SCHOOL_MOTTO = "পড়, তোমার প্রভুর নামে"
const ESTD = "Estd. 2017"

/** Terms copy, verbatim from the design. */
const TERMS_TEXT =
  "This card is the property of Hazi Jabed Ali Memorial School and must be " +
  "carried at all times on campus. If found, please return to the school office."

const FONT_SANS =
  "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FONT_MONO = "var(--font-mono), 'Geist Mono', monospace"
const FONT_BN =
  "var(--font-bengali), 'Noto Sans Bengali', var(--font-sans), sans-serif"

const GRADIENT = "linear-gradient(160deg,#8b5cf6,#6d28d9)"

/**
 * Deterministic pseudo-random barcode pattern — the exact seeded generator from
 * the design, so the bars render identically every time.
 */
const BARS: { w: number; h: number }[] = (() => {
  const bars: { w: number; h: number }[] = []
  let seed = 42
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 28; i++) {
    bars.push({ w: rand() > 0.6 ? 3 : 1.5, h: 60 + Math.floor(rand() * 40) })
  }
  return bars
})()

export interface IdCardData {
  studentName: string
  className: string
  roll: string
  studentId: string
  bloodGroup: string
  dob: string
  validThru: string
  /** Resolved photo (data URL preferred so preview and PDF stay identical). */
  photoUrl: string | null
  /** Avatar fallback initials when there's no photo. */
  initials: string
  guardianName: string
  guardianPhone: string
}

const CARD_STYLE: React.CSSProperties = {
  width: 324,
  height: 512,
  background: "#ffffff",
  borderRadius: 20,
  boxShadow:
    "0 1px 3px rgba(16,16,20,0.08), 0 8px 24px rgba(16,16,20,0.08)",
  overflow: "hidden",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "#9a9aa3" }}>{label}</span>
      <span
        style={{
          fontWeight: 700,
          ...(mono ? { fontFamily: FONT_MONO } : null),
        }}
      >
        {value}
      </span>
    </div>
  )
}

function CardFront({ data }: { data: IdCardData }) {
  return (
    <div data-screen-label="ID Card — Front" style={CARD_STYLE}>
      {/* Top band */}
      <div style={{ background: GRADIENT, padding: "16px 22px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SCHOOL_LOGO}
            alt="School logo"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              objectFit: "cover",
              flex: "none",
              border: "2px solid rgba(255,255,255,0.7)",
              background: "#fff",
            }}
          />
          <div style={{ minWidth: 0, paddingRight: 56 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
                width: 203,
              }}
            >
              {SCHOOL_NAME}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.75)",
                marginTop: 2,
              }}
            >
              {SCHOOL_ADDRESS_SHORT}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#f1ecfb",
          textAlign: "center",
          padding: "4px 22px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#6d28d9",
          textTransform: "uppercase",
        }}
      >
        Student ID
      </div>

      {/* Photo */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl}
            alt="Student photo"
            crossOrigin="anonymous"
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: "4px solid #ede9fe",
              boxShadow: "0 2px 8px rgba(16,16,20,0.12)",
              background: "#e7e7ea",
            }}
          />
        ) : (
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              border: "4px solid #ede9fe",
              boxShadow: "0 2px 8px rgba(16,16,20,0.12)",
              background: "#ede9fe",
              color: "#6d28d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            {data.initials}
          </div>
        )}
      </div>

      {/* Name + class/roll */}
      <div style={{ textAlign: "center", padding: "10px 20px 0" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: "#1b1b1f",
          }}
        >
          {data.studentName}
        </div>
        <div style={{ fontSize: 12.5, color: "#71717a", marginTop: 2 }}>
          Class {data.className} · Roll {data.roll}
        </div>
      </div>

      {/* Details box */}
      <div
        style={{
          margin: "12px 22px 0",
          border: "1px solid #ececef",
          borderRadius: 12,
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 7,
          background: "#fafafa",
        }}
      >
        <DetailRow label="Student ID" value={data.studentId} mono />
        <DetailRow label="Blood group" value={data.bloodGroup} />
        <DetailRow label="Date of birth" value={data.dob} />
        <DetailRow label="Valid thru" value={data.validThru} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 22px 14px",
          borderTop: "1px solid #ececef",
          marginTop: 10,
        }}
      >
        <div style={{ fontFamily: FONT_BN, fontSize: 10.5, color: "#9a9aa3" }}>
          {SCHOOL_MOTTO}
        </div>
        <div style={{ fontSize: 9.5, color: "#c4c4c9", letterSpacing: "0.04em" }}>
          {ESTD}
        </div>
      </div>
    </div>
  )
}

function CardBack({ data }: { data: IdCardData }) {
  return (
    <div data-screen-label="ID Card — Back" style={CARD_STYLE}>
      <div style={{ background: GRADIENT, padding: "16px 22px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#fff",
          }}
        >
          Terms &amp; Contact
        </div>
      </div>

      <div
        style={{
          padding: "20px 22px 0",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#9a9aa3",
            }}
          >
            Guardian
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
            {data.guardianName}
          </div>
          <div style={{ fontSize: 12.5, color: "#71717a", marginTop: 2 }}>
            {data.guardianPhone}
          </div>
        </div>

        <div style={{ height: 1, background: "#ececef" }} />

        <div style={{ fontSize: 11.5, color: "#71717a", lineHeight: 1.7 }}>
          {TERMS_TEXT}
        </div>

        <div style={{ height: 1, background: "#ececef" }} />

        <div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#9a9aa3",
            }}
          >
            School office
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "#1b1b1f",
              marginTop: 4,
              lineHeight: 1.6,
            }}
          >
            {SCHOOL_PHONE}
            <br />
            {SCHOOL_ADDRESS}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Barcode + signature */}
      <div style={{ padding: "0 22px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 38,
            marginBottom: 14,
          }}
        >
          {BARS.map((bar, index) => (
            <div
              key={index}
              style={{ width: bar.w, height: `${bar.h}%`, background: "#1b1b1f" }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9a9aa3" }}>
            {data.studentId}
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 110,
                borderTop: "1px solid #1b1b1f",
                paddingTop: 4,
                fontSize: 10,
                color: "#9a9aa3",
              }}
            >
              Authorized signature
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Both sides of the card on the design's light canvas. */
export function IdCardPaper({ data }: { data: IdCardData }) {
  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: 24,
        background: "#f7f7f8",
        display: "flex",
        gap: 32,
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: FONT_SANS,
        color: "#1b1b1f",
      }}
    >
      <CardFront data={data} />
      <CardBack data={data} />
    </div>
  )
}
