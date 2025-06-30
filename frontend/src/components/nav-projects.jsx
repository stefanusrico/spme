import { useNavigate, useLocation } from "react-router-dom"
import { useCallback } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavProjects() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigation = useCallback(
    (url) => {
      const normalizedUrl = url.startsWith("/") ? url : `/${url}`

      // Force navigation and remount by using key or forcing refresh
      if (location.pathname === normalizedUrl) {
        // If we're already on the route, force a refresh
        window.location.href = normalizedUrl
      } else {
        navigate(normalizedUrl)
      }
    },
    [navigate, location.pathname]
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-zinc-400">Projects</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="w-full hover:bg-[#1E293B] text-zinc-200"
            onClick={() => handleNavigation("/projects")}
          >
            <div className="flex items-center w-full">
              <span className="ml-2">Project Management</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
