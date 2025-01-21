import { useMemo } from "react"
import Sidebar from "./components/Elements/Menu/SidebarExpanded"
import Navbar from "./components/Elements/Menu/Navbar"
import { Outlet } from "react-router-dom"
import {
  sidebarAdmin,
  sidebarKaprodi,
} from "./components/Elements/Menu/sidebar"
import { useUser } from "./context/userContext"

const MainLayout = ({ children }) => {
  const { userData } = useUser()

  const sidebarItems = useMemo(() => {
    if (userData?.role === "Admin") {
      return sidebarAdmin
    } else if (userData?.role === "Ketua Program Studi") {
      return sidebarKaprodi
    }
    return []
  }, [userData?.role])

  return (
    <div className="flex">
      <Sidebar items={sidebarItems} />
      <div className="flex-1">
        <Navbar />
        <main className="p-4">{children}</main>
      </div>
    </div>
  )
}

export default MainLayout
