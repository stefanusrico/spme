import { useState, useEffect } from "react"
import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar"
import { useUser } from "@/context/userContext"
import { useSidebarMenu } from "../hooks/useSideBarMenu"
import { userMenuItems } from "@/config/sidebarItems"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { NavProjects } from "./nav-projects"
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

const getIcon = (iconName) => {
  const icons = {
    home: Home,
    inbox: Inbox,
    settings: Settings,
    calendar: Calendar,
    search: Search,
    creditcard: CreditCard,
    user2: User2,
    bell: Bell,
    logout: LogOut,
    user: User,
  }

  return icons[iconName.toLowerCase()] || Home
}

const processMenus = (menus) => {
  if (!Array.isArray(menus)) {
    console.error("Menus is not an array:", menus)
    return []
  }

  const menuMap = new Map()

  menus.forEach((menu, index) => {
    const menuId = menu.id || `menu-${index + 1}`

    menuMap.set(menuId, {
      id: menuId,
      title: menu.name,
      url: menu.url,
      icon: getIcon(menu.icon),
      order: menu.order || 0,
      parentId: menu.parent_id,
      subItems: menu.children || [],
    })
  })

  const allMenus = Array.from(menuMap.values())
  const sortByOrder = (a, b) => (a.order || 0) - (b.order || 0)
  return allMenus.sort(sortByOrder)
}

export function AppSidebar() {
  const { userData } = useUser()
  const {
    isOpen,
    dropdownRef,
    toggleDropdown,
    handleMenuItemClick,
    handleLogoutSubmit,
  } = useSidebarMenu()

  const [sidebarMenus, setSidebarMenus] = useState([])

  useEffect(() => {
    try {
      const storedMenus = JSON.parse(localStorage.getItem("access")) || []
      const processedMenus = processMenus(storedMenus)
      setSidebarMenus(processedMenus)
    } catch (error) {
      setSidebarMenus([])
    }
  }, [])

  return (
    <div className="dark">
      <Sidebar className="w-[--sidebar-width]">
        <SidebarContent>
          <NavMain items={sidebarMenus} />
          <NavProjects />
        </SidebarContent>
        <SidebarFooter>
          <NavUser
            userData={userData}
            userMenuItems={userMenuItems}
            onMenuItemClick={handleMenuItemClick}
            onLogout={handleLogoutSubmit}
          />
        </SidebarFooter>
      </Sidebar>
    </div>
  )
}
