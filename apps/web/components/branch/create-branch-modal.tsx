"use client"

/**
 * Create-branch modal — the imported "Branch Switcher" design's create flow.
 * Collects an English name, an optional Bengali name, and an optional logo;
 * the branch `code` the API requires (the design has no code field) is derived
 * from the English name, with a numeric suffix retried on a uniqueness clash.
 *
 * On success the new branch is selected (the user "enters" it, per the design)
 * and the switcher refreshes via the mutation's `["auth","me"]` invalidation.
 * Visual structure matches the design; colors map to theme tokens per
 * `ui-context.md`, except the data-driven avatar accent.
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ImageUp } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { branchInitials, BRANCH_PALETTE } from "@/lib/branch/visual"
import { useCreateBranch } from "@/hooks/branches/use-branch-mutations"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import type { Branch } from "@/types/branch"

const schema = z.object({
  name: z.string().trim().min(1, "Enter a branch name"),
  name_bn: z.string().trim().optional(),
})

type CreateBranchValues = z.infer<typeof schema>

/** Derive a branch code from the name: word initials, uppercased (design's `makeCode`). */
function deriveCode(name: string): string {
  const code = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 3)
  return code || "BR"
}

export function CreateBranchModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the created branch (e.g. to select it). */
  onCreated?: (branch: Branch) => void
}) {
  const createMutation = useCreateBranch()
  const [banner, setBanner] = React.useState<string | null>(null)
  const [logo, setLogo] = React.useState<File | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<CreateBranchValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", name_bn: "" },
  })

  const nameValue = form.watch("name").trim()
  const draftInitials = nameValue ? branchInitials(nameValue) : "?"

  React.useEffect(() => {
    if (!open) return
    form.reset({ name: "", name_bn: "" })
    setBanner(null)
    setLogo(null)
    setLogoPreview(null)
  }, [open, form])

  // Revoke the object URL when it changes / unmounts.
  React.useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    onOpenChange(next)
  }

  function handlePickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const name = values.name.trim()
    const name_bn = values.name_bn?.trim() || null

    // Try up to a few codes so a uniqueness clash on the derived code resolves
    // automatically rather than surfacing an error the design has no field for.
    const base = deriveCode(name)
    const candidates = [base, `${base}${randomDigits()}`, `${base}${randomDigits()}`]

    for (let attempt = 0; attempt < candidates.length; attempt++) {
      try {
        const branch = await createMutation.mutateAsync({
          name,
          name_bn,
          code: candidates[attempt],
          logo,
        })
        toastSuccess(`Branch “${name}” created — you are now in it`, {
          id: "create-branch",
        })
        onCreated?.(branch)
        onOpenChange(false)
        return
      } catch (error) {
        if (isValidationError(error)) {
          // A code clash → try the next candidate; any other field error stops.
          const codeOnly =
            Object.keys(error.errors).length === 1 && "code" in error.errors
          if (codeOnly && attempt < candidates.length - 1) continue

          const mapped = applyFieldErrors(form, error, ["name", "name_bn"])
          if (mapped) return
          setBanner(error.message)
          return
        }
        toastError(error, "Couldn't create the branch.", { id: "create-branch" })
        return
      }
    }
  })

  const submitting = form.formState.isSubmitting
  const canCreate = nameValue.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new branch</DialogTitle>
          <DialogDescription>
            The new branch gets its own students, fees and invoices.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            {/* Logo + upload */}
            <div className="flex items-center gap-3.5">
              <span
                className={cn(
                  "grid size-14 shrink-0 place-items-center overflow-hidden rounded-[28%] text-xl font-bold text-white transition-colors"
                )}
                style={{
                  background: logoPreview
                    ? undefined
                    : canCreate
                      ? BRANCH_PALETTE[0]
                      : "var(--color-copy-muted, #a1a1aa)",
                }}
                aria-hidden
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" className="size-full object-cover" />
                ) : (
                  draftInitials
                )}
              </span>
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handlePickLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start gap-1.5"
                  disabled={submitting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageUp className="size-3.5" aria-hidden />
                  Upload logo
                </Button>
                <span className="text-xs text-copy-muted">
                  PNG or JPG, square works best. Initials are used until then.
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch name (English)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Uttara Campus"
                      autoFocus
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
              name="name_bn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch name (বাংলা)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="যেমন — উত্তরা ক্যাম্পাস"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={!canCreate}>
                {submitting ? "Creating…" : "Create branch"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

/** Two random digits for a code-collision fallback suffix. */
function randomDigits(): string {
  return String(Math.floor(Math.random() * 90) + 10)
}
