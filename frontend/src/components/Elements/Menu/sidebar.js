import {
  faHome,
  faCogs,
  faLock,
  faCircleUser,
} from "@fortawesome/free-solid-svg-icons"

export const sidebarAdmin = [
  { label: "Dashboard", href: "/dashboard", icon: faHome },
  { label: "Syarat", href: "/syarat", icon: faCogs },
  {
    label: "User Management",
    href: "/user-management",
    icon: faCogs,
  },
]

export const sidebarKaprodi = [
  { label: "Dashboard", href: "/dashboard", icon: faHome },
  { label: "Projects", href: "/projects", icon: faCogs },
]

export const profileMenuItems = [
  { label: "Account preferences", key: "preferences", icon: faCircleUser },
  { label: "Sign in & security", key: "security", icon: faLock },
]
