import { Geist, Geist_Mono } from "next/font/google"

import { Toaster } from "@workspace/ui/components/sonner"
import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"
import { AccentProvider } from "@/components/accent-provider"
import { ErrorBoundary } from "@/components/error-state"
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

// Applies the persisted accent to <html> before paint to avoid a flash,
// mirroring how next-themes restores the color mode. Kept inline and tiny.
const accentScript = `(function(){try{var a=localStorage.getItem("accent");if(a&&a!=="blue"){document.documentElement.setAttribute("data-accent",a);}}catch(e){}})();`

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
        fontMono.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AccentProvider>
            <RouteProgress />
            <ErrorBoundary>{children}</ErrorBoundary>
            <Toaster />
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
