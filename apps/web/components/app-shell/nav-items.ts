import {
  ArrowUpCircle,
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarOff,
  ClipboardList,
  FileText,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  Receipt,
  Settings,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

/**
 * Sidebar navigation model (task 1.5). Every module the app exposes, grouped
 * for the sidebar. Each item declares the **permission** it requires; the
 * sidebar hides items the user lacks (`ui-context.md`, Authorization) — never
 * gated on role names. `href` is the route segment owned by that module's
 * feature task; active highlighting matches the current path against it.
 */

export interface NavItem {
  label: string
  href: string
  /**
   * Optional pathname used for active-state matching when `href` carries query
   * state (for example student self-service tabs under `/profile?tab=...`).
   */
  activePath?: string
  /** Optional required search param for active-state matching. */
  activeSearch?: Record<string, string | null>
  icon: LucideIcon
  /** Permission required to see this item; hidden when absent. */
  permission: string
  /** Additional permissions that can expose the same module route. */
  permissions?: string[]
  /**
   * Self-service exception: roles that may see this item even without the
   * permission. Students and parents hold no permissions by design (their access
   * comes from policies on their own records), so a route they must reach can
   * only be surfaced by role. Used sparingly — staff gating stays permission-led.
   */
  roles?: string[]
  /** When true, only `roles` can expose the item; permission bypasses do not. */
  roleOnly?: boolean
}

export interface NavGroup {
  /** Group heading shown above its items (hidden when the sidebar collapses). */
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "Admissions",
        href: "/admissions",
        icon: UserPlus,
        permission: "admissions.view",
      },
      {
        label: "Students",
        href: "/students",
        icon: GraduationCap,
        permission: "student.view",
      },
      {
        label: "Parents",
        href: "/parents",
        icon: Users,
        permission: "parent.manage",
      },
      {
        label: "Teachers",
        href: "/teachers",
        icon: Users,
        permission: "teachers.view",
      },
    ],
  },
  {
    label: "Academics",
    items: [
      {
        label: "Academic",
        href: "/academic",
        icon: BookOpen,
        permission: "academic.view",
      },
      {
        label: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
        permission: "attendance.create",
        permissions: [
          "attendance.view",
          "teacher_attendance.view",
          "teacher_attendance.manage",
        ],
        // Students/parents reach their own/children's sheets here too (task 3.2);
        // teachers reach their own check-in/out surface (task 3.3).
        roles: ["parent", "teacher"],
      },
      {
        label: "Exams",
        href: "/exams",
        icon: ClipboardList,
        permission: "exams.view",
      },
      {
        label: "Results",
        href: "/results",
        icon: Award,
        permission: "results.view",
      },
      {
        label: "Promotion",
        href: "/promotions",
        icon: ArrowUpCircle,
        permission: "promotions.view",
      },
    ],
  },
  {
    label: "Student",
    items: [
      {
        label: "My Profile",
        href: "/profile",
        activePath: "/profile",
        activeSearch: { tab: null },
        icon: UserRound,
        permission: "student.self",
        roles: ["student"],
        roleOnly: true,
      },
      {
        label: "Attendance",
        href: "/profile?tab=attendance",
        activePath: "/profile",
        activeSearch: { tab: "attendance" },
        icon: CalendarCheck,
        permission: "student.self",
        roles: ["student"],
        roleOnly: true,
      },
      {
        label: "Results",
        href: "/profile?tab=results",
        activePath: "/profile",
        activeSearch: { tab: "results" },
        icon: Award,
        permission: "student.self",
        roles: ["student"],
        roleOnly: true,
      },
      {
        label: "Leaves",
        href: "/profile?tab=leaves",
        activePath: "/profile",
        activeSearch: { tab: "leaves" },
        icon: CalendarOff,
        permission: "student.self",
        roles: ["student"],
        roleOnly: true,
      },
      {
        label: "Tuition Fees",
        href: "/profile?tab=fees",
        activePath: "/profile",
        activeSearch: { tab: "fees" },
        icon: Receipt,
        permission: "student.self",
        roles: ["student"],
        roleOnly: true,
      },
      {
        label: "ID Card",
        href: "/profile?tab=idcard",
        activePath: "/profile",
        activeSearch: { tab: "idcard" },
        icon: IdCard,
        permission: "student.self",
        roles: ["student"],
        roleOnly: true,
      },
      {
        label: "TC",
        href: "/profile?tab=tc",
        activePath: "/profile",
        activeSearch: { tab: "tc" },
        icon: FileText,
        permission: "student.self",
        roles: ["student"],
        roleOnly: true,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Fees",
        href: "/fees",
        icon: Receipt,
        permission: "fees.view",
      },
      {
        label: "Finance",
        href: "/finance",
        icon: Wallet,
        permission: "finance.view",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
        permission: "documents.view",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        permission: "reports.view",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "settings.view",
      },
    ],
  },
]
