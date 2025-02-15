import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar"
import { useUser } from "@/context/userContext"
import { useSidebarMenu } from "@/hooks/useSidebarMenu"
import { sidebarItems, userMenuItems } from "@/config/sidebarItems"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { NavProjects } from "./nav-projects"

export function AppSidebar() {
  const { userData } = useUser()
  const {
    isOpen,
    dropdownRef,
    toggleDropdown,
    handleMenuItemClick,
    handleLogoutSubmit,
  } = useSidebarMenu()

  return (
    <div className="dark">
      <Sidebar className="w-[--sidebar-width]">
        <SidebarContent>
          <NavMain items={sidebarItems} />
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
