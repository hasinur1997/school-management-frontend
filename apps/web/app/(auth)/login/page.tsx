/**
 * Login page (public). Already-authenticated users are bounced to the
 * dashboard; everyone else gets the credential form, which sets the session
 * cookie via a server action and redirects on success.
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
import { LoginForm } from "@/components/auth/login-form"
import { isAuthenticated } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/")
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue to your dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  )
}
