/**
 * Forgot-password page (public). Already-authenticated users are bounced to the
 * dashboard; everyone else gets the form, which requests a one-time reset code
 * (email + SMS) and then routes to the reset step.
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
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { isAuthenticated } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Forgot password",
}

export default async function ForgotPasswordPage() {
  if (await isAuthenticated()) {
    redirect("/")
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email or phone and we&apos;ll send you a reset code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  )
}
