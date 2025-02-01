import React, { useMemo, useState } from "react"
import Sidebar from "./components/Elements/Menu/SidebarExpanded"
import Navbar from "./components/Elements/Menu/Navbar"
import {
  sidebarAdmin,
  sidebarKaprodi,
} from "./components/Elements/Menu/sidebar"
import { useUser } from "./context/userContext"

const MainLayout = ({ children }) => {
  const { userData } = useUser()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const sidebarItems = useMemo(() => {
    if (userData?.role === "Admin") {
      return sidebarAdmin
    } else if (userData?.role === "Ketua Program Studi") {
      return sidebarKaprodi
    }
    return []
  }, [userData?.role])

  const childrenWithProps = React.Children.map(children, (child) =>
    React.cloneElement(child, { isCollapsed })
  )

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        items={sidebarItems}
        onCollapse={(collapsed) => setIsCollapsed(collapsed)}
        className="z-20"
      />
      <div className="flex-1 flex flex-col">
        <Navbar className="z-30" />
        <main
          className={`flex-1 overflow-auto transition-all duration-300 ${
            isCollapsed ? "ml-24 w-[1800px]" : "ml-64 w-[1650px]"
          }`}
        >
          <div className="mx-auto">
            <div className="p-4">{childrenWithProps}</div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
