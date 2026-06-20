"use client"

/**
 * Square image cropper for avatars. Loads a picked `File`, lets the user pan
 * (drag) and zoom (slider / wheel) within a fixed square viewport, then renders
 * the visible region to a canvas and returns a new square `File` via the
 * imperative `getCroppedFile()` handle. Output keeps the source MIME type and is
 * capped to `OUT`px, so the result is well under typical upload limits. The crop
 * is purely client-side convenience — the API stays authoritative.
 */

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

const BOX = 280 // crop viewport size in px
const OUT = 512 // output square size in px
const MAX_ZOOM = 3

export interface ImageCropperHandle {
  /** Render the current crop to a square file. Rejects if the image isn't ready. */
  getCroppedFile: () => Promise<File>
}

export interface ImageCropperProps {
  file: File
  /** Show a circular mask over the viewport (avatars). Defaults to true. */
  round?: boolean
  className?: string
}

export const ImageCropper = React.forwardRef<
  ImageCropperHandle,
  ImageCropperProps
>(function ImageCropper({ file, round = true, className }, ref) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [nat, setNat] = React.useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = React.useState(1)
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })
  const drag = React.useRef<{
    px: number
    py: number
    ox: number
    oy: number
  } | null>(null)

  // Cover-fit at zoom 1, then the slider multiplies it. `scale` is display px
  // per source px; offsets are the image's top-left within the viewport.
  const coverScale = nat ? Math.max(BOX / nat.w, BOX / nat.h) : 1
  const scale = coverScale * zoom
  const dispW = nat ? nat.w * scale : 0
  const dispH = nat ? nat.h * scale : 0

  const clampOffset = React.useCallback(
    (o: { x: number; y: number }, scl: number) => {
      if (!nat) return o
      const dw = nat.w * scl
      const dh = nat.h * scl
      return {
        x: Math.min(0, Math.max(BOX - dw, o.x)),
        y: Math.min(0, Math.max(BOX - dh, o.y)),
      }
    },
    [nat]
  )

  // Own the object URL inside the effect so each mount gets a fresh one (Strict
  // Mode remounts revoke on cleanup). Read natural dimensions, then center.
  React.useEffect(() => {
    let alive = true
    const u = URL.createObjectURL(file)
    setUrl(u)
    const img = new Image()
    img.onload = () => {
      if (!alive) return
      setNat({ w: img.naturalWidth, h: img.naturalHeight })
      setZoom(1)
      const s = Math.max(BOX / img.naturalWidth, BOX / img.naturalHeight)
      setOffset({
        x: (BOX - img.naturalWidth * s) / 2,
        y: (BOX - img.naturalHeight * s) / 2,
      })
    }
    img.src = u
    return () => {
      alive = false
      URL.revokeObjectURL(u)
    }
  }, [file])

  function handleZoom(next: number) {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(1, next))
    const prevScale = scale
    const nextScale = coverScale * nextZoom
    // Keep the viewport center fixed on the same source point while zooming.
    setOffset((o) => {
      const sx = (BOX / 2 - o.x) / prevScale
      const sy = (BOX / 2 - o.y) / prevScale
      return clampOffset(
        { x: BOX / 2 - sx * nextScale, y: BOX / 2 - sy * nextScale },
        nextScale
      )
    })
    setZoom(nextZoom)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!nat) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.px
    const dy = e.clientY - drag.current.py
    setOffset(
      clampOffset(
        { x: drag.current.ox + dx, y: drag.current.oy + dy },
        scale
      )
    )
  }

  function onPointerUp() {
    drag.current = null
  }

  function onWheel(e: React.WheelEvent) {
    if (!nat) return
    handleZoom(zoom - e.deltaY * 0.0015)
  }

  React.useImperativeHandle(
    ref,
    () => ({
      getCroppedFile: () =>
        new Promise<File>((resolve, reject) => {
          if (!nat || !url) {
            reject(new Error("Image not ready"))
            return
          }
          const canvas = document.createElement("canvas")
          canvas.width = OUT
          canvas.height = OUT
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Canvas unavailable"))
            return
          }
          const srcSize = BOX / scale
          const srcX = -offset.x / scale
          const srcY = -offset.y / scale
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT)
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Could not crop the image"))
                  return
                }
                const ext = file.type === "image/png" ? "png" : "jpg"
                const base = file.name.replace(/\.[^.]+$/, "") || "photo"
                resolve(
                  new File([blob], `${base}.${ext}`, { type: file.type })
                )
              },
              file.type,
              0.92
            )
          }
          img.onerror = () => reject(new Error("Could not crop the image"))
          img.src = url
        }),
    }),
    [nat, scale, offset, url, file]
  )

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className={cn(
          "relative touch-none overflow-hidden bg-muted select-none",
          round ? "rounded-full" : "rounded-lg"
        )}
        style={{ width: BOX, height: BOX, cursor: nat ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {nat && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: offset.x,
              top: offset.y,
              width: dispW,
              height: dispH,
              maxWidth: "none",
            }}
          />
        ) : null}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10",
            round ? "rounded-full" : "rounded-lg"
          )}
        />
      </div>
      <input
        type="range"
        min={1}
        max={MAX_ZOOM}
        step={0.01}
        value={zoom}
        onChange={(e) => handleZoom(Number(e.target.value))}
        disabled={!nat}
        aria-label="Zoom"
        className="h-1.5 w-full max-w-70 cursor-pointer accent-brand"
      />
      <p className="text-xs text-copy-secondary">Drag to reposition · scroll or slide to zoom</p>
    </div>
  )
})
