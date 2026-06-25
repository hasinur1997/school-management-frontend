"use client"

/**
 * Forgot-password form (RHF + Zod). Posts an email/phone to `forgotPasswordAction`,
 * which asks the API to issue a one-time reset code (delivered by email + SMS).
 *
 * The API replies generically whether or not the account exists, so on success
 * we route to the reset step carrying the identifier so the next form can
 * prefill it — without ever confirming the account exists.
 *
 * Error handling per `ui-context.md` (Forms): `422` field errors map back onto
 * the matching input; other non-field messages show in a form-level banner.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { forgotPasswordAction } from "@/lib/auth/actions"

/** A bare email shape, or a phone (digits with optional +, spaces, dashes). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[\d\s()-]{6,}$/

const schema = z.object({
  identifier: z
    .string()
    .min(1, "Email or phone is required")
    .refine((v) => EMAIL_PATTERN.test(v) || PHONE_PATTERN.test(v), {
      message: "Enter a valid email or phone number",
    }),
})

type ForgotPasswordValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const router = useRouter()
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await forgotPasswordAction(values)

    if (result.ok) {
      // Carry the identifier to the reset step so its form prefills. We never
      // reveal whether the account exists — the next page is shown either way.
      router.push(
        `/reset-password?login=${encodeURIComponent(values.identifier)}`
      )
      return
    }

    const message = result.errors?.identifier?.[0]
    if (message) {
      form.setError("identifier", { message }, { shouldFocus: true })
      return
    }
    setFormError(result.message)
  })

  const submitting = form.formState.isSubmitting

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
          >
            {formError}
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email or phone</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="you@school.edu or 01712345678"
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          {submitting ? "Sending code…" : "Send reset code"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
