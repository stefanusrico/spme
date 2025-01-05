import Navbar from "../components/Elements/Menu/Navbar"
import MonitoringAkreditasi from "../components/Fragments/MonitoringAkreditasi"
import Sidebar from "../components/Elements/Menu/SidebarExpanded"
import { sidebarAdmin } from "../components/Elements/Menu/sidebar"

const DashboardAdmin = () => {
  return (
    <>
      <div className="flex flex-col justify-center min-h-screen bg-graybackground">
        <Navbar />
        <MonitoringAkreditasi />
        <Sidebar items={sidebarAdmin} />
      </div>
    </>
  )
}

export default DashboardAdmin
