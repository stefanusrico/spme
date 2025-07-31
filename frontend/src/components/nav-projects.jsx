import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavProjects() {
  const handleNavigation = (url) => {
    // Paksa reload halaman untuk memastikan komponen ter-render
    window.location.href = url
  }

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
