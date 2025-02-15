import {
  Home,
  Inbox,
  Settings,
  Calendar,
  Search,
  CreditCard,
  User2,
  Bell,
  LogOut,
  User,
} from "lucide-react"

export const sidebarItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  },
  {
    title: "Syarat",
    url: "/syarat",
    icon: Inbox,
  },
  {
    title: "User Management",
    url: "/user-management",
    icon: User2,
  },

  //contoh submenu
  // {
  //   title: "Settings",
  //   icon: Settings,
  //   subItems: [
  //     {
  //       title: "Profile",
  //       url: "/settings/profile",
  //     },
  //     {
  //       title: "Users",
  //       url: "/settings/users",
  //     },
  //   ],
  // },
]

export const userMenuItems = [
  {
    title: "Account",
    icon: User2,
    action: "account",
  },
  {
    title: "Log out",
    icon: LogOut,
    action: "logout",
  },
]
