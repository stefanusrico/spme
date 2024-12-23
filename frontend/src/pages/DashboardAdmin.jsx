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
      <div className="flex flex-col justify-center min-h-screen items-center bg-graybackground">
        {/* Navbar that adjusts based on screen size */}
        <Navbar />

        {/* Monitoring Akreditasi Content */}

        {/* Sidebar that toggles on mobile */}
        <div className="flex w-full">
          {/* Sidebar will be hidden on small screens, shown on large */}
          <Sidebar items={sidebarItems} className="hidden sm:block" />

          {/* Content area */}
          <main className="w-full sm:w-9/12 p-4">
            <MonitoringAkreditasi />
          </main>
        </div>
      </div>
    </>
  )
}

export default DashboardAdmin
