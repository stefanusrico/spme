import React from "react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useSidebarMenu } from "@/hooks/useSidebarMenu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"

function MainLayout({ children }) {
  const { collapsed, toggleCollapse } = useSidebarMenu()

  const location = useLocation()
  const navigate = useNavigate()

  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter((path) => path)

    // Mapping untuk label custom
    const pathToLabel = {
      // "user-management": "User Management",
    }

    const formatLabel = (path) => {
      if (pathToLabel[path]) return pathToLabel[path]

      return path
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }

    return paths.map((path, index) => ({
      label: formatLabel(path),
      path: "/" + paths.slice(0, index + 1).join("/"),
      isLast: index === paths.length - 1,
    }))
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <SidebarInset>
      <div className="flex flex-col h-full">
        <header className="fixed z-50 w-full flex h-16 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-gray shadow-sm bg-background">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger
              className="text-[hsl(var(--foreground))]"
              onClick={toggleCollapse}
            />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <button
                    onClick={() => navigate("/")}
                    className="hover:text-foreground"
                  >
                    Home
                  </button>
                </BreadcrumbItem>

                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem className="hidden md:block">
                      {crumb.isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <button
                          onClick={() => navigate(crumb.path)}
                          className="hover:text-foreground"
                        >
                          {crumb.label}
                        </button>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div
          className={`mx-auto transition-all duration-300 ease-in-out ${
            collapsed ? "p-2 mt-16 w-[1920px]" : "p-5 mt-12 w-[1650px]"
          }`}
        >
          <div className="flex flex-col gap-4 p-4 pt-0 transition-all duration-300">
            {children}
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}

export default function Layout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <MainLayout>{children}</MainLayout>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}
