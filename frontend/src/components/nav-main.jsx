import { ChevronRight } from "lucide-react"
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
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2 text-zinc-400 mb-8 mt-5">
        <img
          src="https://www.polban.ac.id/wp-content/uploads/2018/06/logo-polban-80.png"
          alt="SPME Logo"
          className="w-12 h-16"
        />
        <span className="p-5 text-2xl">SPME</span>
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.subItems ? (
              <Collapsible defaultOpen className="group/collapsible w-full">
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
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuButton
                          asChild
                          className="pl-9 hover:bg-[#1E293B] text-zinc-200"
                        >
                          <a href={subItem.url}>
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuButton
                asChild
                className="w-full hover:bg-[#1E293B] text-zinc-200"
              >
                <a href={item.url} className="flex items-center">
                  <item.icon className="w-4 h-4" />
                  <span className="ml-2">{item.title}</span>
                </a>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
