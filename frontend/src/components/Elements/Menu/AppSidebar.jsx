import { useState } from "react"
import { PanelLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const AppSidebar = ({ items, className = "" }) => {
  const [expanded, setExpanded] = useState({})

  const toggleExpand = (index) => {
    setExpanded((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const renderItems = (items) => {
    return items.map((item, index) => (
      <SidebarMenuItem key={index}>
        <SidebarMenuButton
          asChild={item.href ? true : false}
          onClick={!item.href ? () => toggleExpand(index) : undefined}
          className="w-full px-3 py-2"
        >
          {item.href ? (
            <a
              href={item.href}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </div>
            </a>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </div>
              {item.children && (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expanded[index] && "rotate-90"
                  )}
                />
              )}
            </div>
          )}
        </SidebarMenuButton>
        {item.children && expanded[index] && (
          <SidebarMenuSub>{renderItems(item.children)}</SidebarMenuSub>
        )}
      </SidebarMenuItem>
    ))
  }

  return (
    <SidebarProvider>
      <div className="hidden md:block">
        <SidebarTrigger>
          <PanelLeft className="h-4 w-4" />
        </SidebarTrigger>
      </div>

      <Sidebar className={className}>
        <SidebarHeader className="pb-4"></SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(items)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}

export default AppSidebar
