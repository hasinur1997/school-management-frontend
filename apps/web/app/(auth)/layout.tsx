/**
 * Public auth layout — standalone, no app shell (`ui-context.md`). Centers a
 * single card on the page background for login and other unauthenticated auth
 * screens. The root layout still provides theme, fonts, and providers.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-base px-4 py-10">
      {children}
    </div>
  )
}
