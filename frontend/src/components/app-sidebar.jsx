import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar"
import { useUser } from "@/context/userContext"
import { useSidebarMenu } from "../hooks/useSideBarMenu"
import { sidebarItems, userMenuItems } from "@/config/sidebarItems"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { NavProjects } from "./nav-projects"
import { useState, useEffect } from "react";
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
  };

  return icons[iconName.toLowerCase()] || Home; 
};

const mapMenus = (menu) => ({
  title: menu.name,
  url: menu.url,
  icon: getIcon(menu.icon),
  subItems: menu.children ? menu.children.map(mapMenus) : [],
});

export function AppSidebar() {
  const { userData } = useUser()
  const {
    isOpen,
    dropdownRef,
    toggleDropdown,
    handleMenuItemClick,
    handleLogoutSubmit,
  } = useSidebarMenu()

  const [sidebarMenus, setSidebarMenus] = useState([]);

  useEffect(() => {
    const storedMenus = JSON.parse(localStorage.getItem("access")) || [];
    setSidebarMenus(storedMenus.map(mapMenus));
  }, []);

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
