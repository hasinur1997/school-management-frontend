"use client"

/**
 * Profile route for the signed-in user. No permission gate — every
 * authenticated user can view and manage their own profile. The user is read
 * from the resolved auth context, so the screen needs no fetch of its own.
 */

import { ProfileView } from "@/components/profile"

export default function ProfilePage() {
  return <ProfileView />
}
