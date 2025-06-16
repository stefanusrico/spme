import { ChevronRight } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useNavigate } from "react-router-dom"

export function NavProjects() {
  const navigate = useNavigate()
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-zinc-400">Projects</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="w-full hover:bg-[#1E293B] text-zinc-200 justify-between"
            onClick={() => navigate("/projects")}
          >
            <div className="flex items-center justify-between w-full">
              <span className="ml-2">Project Management</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

//change
