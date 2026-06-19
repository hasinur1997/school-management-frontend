"use client"

/**
 * Login form (RHF + Zod). Posts credentials to the `loginAction` server action,
 * which sets the httpOnly session cookie; on success we navigate to the
 * dashboard and `refresh()` so the server guard re-reads the new cookie.
 *
 * Error handling per `ui-context.md` (Forms): `422` field errors map back onto
 * the matching inputs (first invalid field focused); invalid-credentials and
 * other non-field messages show in a form-level banner. Values are kept on
 * failure and the submit button can't double-fire.
 */

import * as React from "react"
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
import { loginAction } from "@/lib/auth/actions"

const schema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof schema>

/** Form fields a `422` can map back onto; everything else goes to the banner. */
const FIELD_NAMES: ReadonlySet<string> = new Set(["email", "password"])

export function LoginForm() {
  const router = useRouter()
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await loginAction(values)

    if (result.ok) {
      router.replace("/dashboard")
      router.refresh()
      return
    }

    // Map 422 field errors onto inputs; collect the rest for the banner.
    const fieldErrors = result.errors ?? {}
    let mappedAny = false
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0]
      if (!message) continue
      if (FIELD_NAMES.has(field)) {
        form.setError(field as keyof LoginValues, { message }, {
          shouldFocus: !mappedAny,
        })
        mappedAny = true
      }
    }

    // Invalid credentials / non-field errors → banner.
    if (!mappedAny) {
      setFormError(result.message)
    }
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@school.edu"
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  )
}
