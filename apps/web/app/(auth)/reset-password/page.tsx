/**
 * Reset-password page (public). Already-authenticated users are bounced to the
 * dashboard; everyone else gets the form, which asks for the reset code first
 * and then opens the new-password fields. The identifier is carried from the
 * `?login=` param and kept hidden in the form.
 */

import type { Metadata } from "next"
import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { isAuthenticated } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Reset password",
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>
}) {
  if (await isAuthenticated()) {
    redirect("/")
  }

  const { login } = await searchParams

  if (!login) {
    redirect("/forgot-password")
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the code we sent you. After it is verified, choose a new
          password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm defaultIdentifier={login} />
      </CardContent>
    </Card>
  )
}
