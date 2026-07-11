import {
  Caveat,
  EB_Garamond,
  Geist,
  Geist_Mono,
  Noto_Sans_Bengali,
  Playfair_Display,
} from "next/font/google"

import { Toaster } from "@workspace/ui/components/sonner"
import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"
import { AccentProvider } from "@/components/accent-provider"
import { ErrorBoundary } from "@/components/error-state"
import { QueryProvider } from "@/components/query-provider"
import { RouteProgress } from "@/components/route-progress"
import { ThemeProvider } from "@/components/theme-provider"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Transcript-only faces for the BTEB-style result mark sheet. They only carry
// glyph weight for the pages that actually render the sheet (font-display swap),
// so exposing them app-wide as CSS variables is cheap.
const fontSerifDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-serif-display",
})

const fontSerif = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
})

const fontScript = Caveat({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-script",
})

// Bengali face for the paper documents (invoice / money receipt), which print
// the school name and motto in Bangla. Loaded app-wide as a CSS variable so the
// on-screen paper and its rasterized PDF resolve the *same* font — previously
// the papers referenced a bare "Noto Sans Bengali" family that was never loaded,
// so the browser substituted a system fallback that didn't survive PDF export.
const fontBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bengali",
})

// Applies the persisted accent to <html> before paint to avoid a flash,
// mirroring how next-themes restores the color mode. Kept inline and tiny.
const accentScript = `(function(){try{var a=localStorage.getItem("accent");if(a&&a!=="purple"){document.documentElement.setAttribute("data-accent",a);}}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        "font-sans",
        fontSans.variable,
        fontMono.variable,
        fontSerifDisplay.variable,
        fontSerif.variable,
        fontScript.variable,
        fontBengali.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AccentProvider>
            <QueryProvider>
              <RouteProgress />
              <ErrorBoundary>{children}</ErrorBoundary>
              <Toaster />
            </QueryProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
