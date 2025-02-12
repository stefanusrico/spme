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
