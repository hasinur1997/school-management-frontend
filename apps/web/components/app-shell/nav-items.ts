import {
  ArrowUpCircle,
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  Settings,
  UserPlus,
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
  icon: LucideIcon
  /** Permission required to see this item; hidden when absent. */
  permission: string
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
        permission: "attendance.view",
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
