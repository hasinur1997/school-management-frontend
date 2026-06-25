"use client"

/**
 * Reset-password form (RHF + Zod). The first stage asks only for the one-time
 * code; once verified, the second stage asks for the new password fields. The
 * API revokes every existing token on success, so there is no session to set —
 * we toast and route back to login.
 *
 * The identifier is carried from the forgot-password step and kept hidden here.
 * Error handling per `ui-context.md` (Forms): `422` field errors map onto
 * inputs; generic invalid/expired-code/token messages show in a banner.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
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
import {
  resetPasswordAction,
  verifyResetCodeAction,
} from "@/lib/auth/actions"
import { toastSuccess } from "@/lib/toast"

const codeSchema = z.object({
  code: z.string().min(1, "Enter the code you received"),
})

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords don't match",
  })

type CodeValues = z.infer<typeof codeSchema>
type PasswordValues = z.infer<typeof passwordSchema>

/** Form fields a `422` can map back onto; everything else goes to the banner. */
const PASSWORD_FIELD_NAMES: ReadonlySet<string> = new Set([
  "password",
  "password_confirmation",
])

const passwordInputClassName =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-transparent px-4 py-2 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

const EMPTY_PASSWORD_VALUES: PasswordValues = {
  password: "",
  password_confirmation: "",
}

export interface ResetPasswordFormProps {
  /** Identifier carried from the forgot-password step, prefilled when present. */
  defaultIdentifier?: string
}

export function ResetPasswordForm({
  defaultIdentifier = "",
}: ResetPasswordFormProps) {
  const router = useRouter()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [resetToken, setResetToken] = React.useState<string | null>(null)
  const [resetting, setResetting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    React.useState(false)
  const [passwordValues, setPasswordValues] = React.useState<PasswordValues>(
    EMPTY_PASSWORD_VALUES
  )

  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      password_confirmation: "",
    },
  })

  const onVerifyCode = codeForm.handleSubmit(async (values) => {
    setFormError(null)

    const result = await verifyResetCodeAction({
      identifier: defaultIdentifier,
      code: values.code,
    })

    if (result.ok) {
      passwordForm.reset(EMPTY_PASSWORD_VALUES)
      setPasswordValues(EMPTY_PASSWORD_VALUES)
      setResetToken(result.resetToken)
      return
    }

    const codeMessage = result.errors?.code?.[0]
    if (codeMessage) {
      codeForm.setError("code", { message: codeMessage }, { shouldFocus: true })
      return
    }

    setFormError(result.message)
  })

  const onResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (resetting) return

    setFormError(null)
    passwordForm.clearErrors()

    const parsed = passwordSchema.safeParse(passwordValues)
    if (!parsed.success) {
      let focused = false
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field !== "password" && field !== "password_confirmation") continue
        passwordForm.setError(
          field,
          { message: issue.message },
          { shouldFocus: !focused }
        )
        focused = true
      }
      return
    }

    if (!resetToken) {
      setFormError("Verify the reset code before setting a new password.")
      return
    }

    setResetting(true)
    const result = await resetPasswordAction({
      resetToken,
      password: parsed.data.password,
      password_confirmation: parsed.data.password_confirmation,
    }).finally(() => setResetting(false))

    if (result.ok) {
      toastSuccess(result.message || "Password reset. Please sign in.", {
        id: "reset-password",
      })
      router.replace("/login")
      return
    }

    // Map 422 field errors onto inputs; collect the rest for the banner.
    const fieldErrors = result.errors ?? {}
    let mappedAny = false
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0]
      if (!message) continue
      if (PASSWORD_FIELD_NAMES.has(field)) {
        passwordForm.setError(
          field as keyof PasswordValues,
          { message },
          { shouldFocus: !mappedAny }
        )
        mappedAny = true
      }
    }

    if (!mappedAny) {
      setFormError(result.message)
    }
  }

  const verifying = codeForm.formState.isSubmitting

  if (!resetToken) {
    return (
      <Form {...codeForm}>
        <form onSubmit={onVerifyCode} className="flex flex-col gap-5" noValidate>
          {formError ? (
            <div
              role="alert"
              className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
            >
              {formError}
            </div>
          ) : null}

          <FormField
            control={codeForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reset code</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="6-digit code"
                    disabled={verifying}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" loading={verifying}>
            {verifying ? "Verifying…" : "Verify code"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t get a code?{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Request a new one
            </Link>
          </p>
        </form>
      </Form>
    )
  }

  return (
    <Form {...passwordForm}>
      <form onSubmit={onResetPassword} className="flex flex-col gap-5" noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
          >
            {formError}
          </div>
        ) : null}

        <FormField
          control={passwordForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <div className="relative">
                <FormControl>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    disabled={resetting}
                    className={cn(passwordInputClassName, "pr-12")}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={passwordValues.password}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      setFormError(null)
                      passwordForm.clearErrors([
                        "password",
                        "password_confirmation",
                      ])
                      setPasswordValues((current) => ({
                        ...current,
                        password: value,
                      }))
                    }}
                  />
                </FormControl>
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={resetting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={passwordForm.control}
          name="password_confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <div className="relative">
                <FormControl>
                  <input
                    type={showPasswordConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    disabled={resetting}
                    className={cn(passwordInputClassName, "pr-12")}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={passwordValues.password_confirmation}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      setFormError(null)
                      passwordForm.clearErrors("password_confirmation")
                      setPasswordValues((current) => ({
                        ...current,
                        password_confirmation: value,
                      }))
                    }}
                  />
                </FormControl>
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  onClick={() =>
                    setShowPasswordConfirmation((visible) => !visible)
                  }
                  disabled={resetting}
                  aria-label={
                    showPasswordConfirmation
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                >
                  {showPasswordConfirmation ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" loading={resetting}>
          {resetting ? "Resetting…" : "Reset password"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get a code?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Request a new one
          </Link>
        </p>
      </form>
    </Form>
  )
}
