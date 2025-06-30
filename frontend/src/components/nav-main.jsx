import { ChevronRight } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useCallback } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({ items }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigation = useCallback(
    (url) => {
      // Normalize the URL
      const normalizedUrl = url.startsWith("/") ? url : `/${url}`

      // Check if we're already on this route
      if (location.pathname !== normalizedUrl) {
        navigate(normalizedUrl)
      }
    },
    [navigate, location.pathname]
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2 text-zinc-400 mb-8 mt-5">
        <img
          src="https://www.polban.ac.id/wp-content/uploads/2018/06/logo-polban-80.png"
          alt="SPME Logo"
          className="w-12 h-16"
        />
        <span className="p-5 text-2xl">SIMPEL</span>
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={`menu-item-${item.id}`}>
            {item.subItems && item.subItems.length > 0 ? (
              <Collapsible
                key={`collapsible-${item.id}`}
                defaultOpen
                className="group/collapsible w-full"
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="w-full hover:bg-[#1E293B] text-zinc-200 justify-between">
                    <div className="flex items-center">
                      <item.icon className="w-4 h-4" />
                      <span className="ml-2">{item.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.subItems.map((subItem) => (
                      <SidebarMenuSubItem key={`sub-item-${subItem.id}`}>
                        <SidebarMenuButton
                          className="pl-9 hover:bg-[#1E293B] text-zinc-200 w-full"
                          onClick={() => handleNavigation(subItem.url)}
                        >
                          <div className="flex items-center text-left w-full">
                            {subItem.icon && (
                              <subItem.icon className="w-4 h-4 mr-2" />
                            )}
                            <span>{subItem.title}</span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuButton
                key={`button-${item.id}`}
                className="w-full hover:bg-[#1E293B] text-zinc-200"
                onClick={() => handleNavigation(item.url)}
              >
                <div className="flex items-center text-left w-full">
                  <item.icon className="w-4 h-4" />
                  <span className="ml-2">{item.title}</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
