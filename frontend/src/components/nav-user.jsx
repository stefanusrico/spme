import { ChevronUp } from "lucide-react"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useNavigate } from "react-router-dom"

const LetterAvatar = ({ name }) => {
  const letter = name ? name.charAt(0).toUpperCase() : "User"

  return (
    <div className="w-full h-full flex items-center justify-center text-zinc-300 font-medium">
      {letter}
    </div>
  )
}

export function NavUser({
  userData = { name: "", email: "" }, // Default empty strings instead of null
  userMenuItems = [],
  onMenuItemClick = () => {},
  onLogout = () => {},
}) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {userData?.profile_picture && !imageError ? (
                    <img
                      src={`http://localhost:8000/storage/${userData.profile_picture}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <LetterAvatar name={userData?.name} />
                  )}
                </div>
                <div className="flex flex-col items-start text-sm">
                  <span className="text-zinc-200">{userData?.name || ""}</span>
                  <span className="text-xs text-zinc-500">
                    {userData?.email || ""}
                  </span>
                </div>
              </div>
              <ChevronUp className="ml-auto h-4 w-4 text-zinc-400" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="dark bg-[hsl(var(--sidebar-background))] w-[--radix-popper-anchor-width] mb-2"
          >
            {userMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.title}
                onClick={() => {
                  if (item.action === "logout") {
                    onLogout()
                  } else if (item.action === "account") {
                    navigate("/account")
                  } else {
                    onMenuItemClick(item.action)
                  }
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
