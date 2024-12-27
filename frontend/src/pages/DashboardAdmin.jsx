import Navbar from "../components/Elements/Menu/Navbar"
import MonitoringAkreditasi from "../components/Fragments/MonitoringAkreditasi"
import Sidebar from "../components/Elements/Menu/SidebarExpanded"
import {
  faHome,
  faCogs,
  faKey,
  faLock,
} from "@fortawesome/free-solid-svg-icons"

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: faHome },
  { label: "Syarat", href: "/syarat", icon: faCogs },
  {
    label: "User Management",
    icon: faCogs,
    children: [
      { label: "Users", href: "/settings/general", icon: faKey },
      {
        label: "Permissions",
        href: "/settings/security",
        icon: faLock,
      },
    ],
  },
]

const DashboardAdmin = () => {
  return (
    <>
      <div className="flex flex-col justify-center min-h-screen bg-graybackground">
        <Navbar />
        <MonitoringAkreditasi />
        <Sidebar items={sidebarItems} />
      </div>
    </>
  )
}

export default DashboardAdmin
