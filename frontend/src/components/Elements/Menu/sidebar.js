import { Home, Settings, UserCircle, Lock } from "lucide-react"

export const sidebarAdmin = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Syarat", href: "/syarat", icon: Settings },
  {
    label: "User Management",
    href: "/user-management",
    icon: Settings,
  },
]

export const sidebarKaprodi = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Projects", href: "/projects", icon: Settings },
]

export const profileMenuItems = [
  { label: "Account preferences", key: "preferences", icon: UserCircle },
  { label: "Sign in & security", key: "security", icon: Lock },
]

export const getSidebarMenus = () => {
  const menus = JSON.parse(localStorage.getItem("access")) || []

  const mapMenus = (menu) => ({
    label: menu.name,
    href: menu.url,
    icon: getIcon(menu.icon),
    children: menu.children
      ? menu.children.map((child) => mapMenus(child)) 
      : [], 
  });

  return menus.map((menu) => mapMenus(menu));
}

// Fungsi untuk mencocokkan ikon berdasarkan nama
const getIcon = (iconName) => {
  const icons = {
    home: faHome,
    cogs: faCogs,
    lock : faLock,
    circleuser : faCircleUser,
    // cartshopping : faCartShopping,
    // notesticky: faNoteSticky
    // Tambahkan ikon lainnya 
  }
  const formattedIconName = iconName.replace(/^fa/, "").toLowerCase()

  console.log("Formatted iconName:", formattedIconName)
  return icons[formattedIconName] || faHome
}

export const menus = getSidebarMenus()
