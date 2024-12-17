import Sidebar from "./components/Elements/Menu/SidebarExpanded"
import Navbar from "./components/Elements/Menu/Navbar"
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

function App() {
  return (
    <>
      <div className="flex justify-center min-h-screen items-center ">
        <Navbar />
        <Sidebar items={sidebarItems} />
      </div>
    </>
  )
}

export default App
