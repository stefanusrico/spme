import { useState } from "react"
import ProgressAkreditasiTable from "../components/Elements/DataTable/ProgressAkreditasiTable"
import ProfileMenu from "../components/Elements/Menu/ProfileMenu"
import Navbar from "../components/Elements/Menu/Navbar"
import Sidebar from "../components/Elements/Menu/SidebarExpanded"
import {
  faUser,
  faCircleUser,
  faLock,
  faHome,
  faCogs,
  faKey,
} from "@fortawesome/free-solid-svg-icons"
import RightProfileMenu from "../components/Elements/Profile/AccountPreferences"
import SigninSecurity from "../components/Elements/Profile/SigninSecurity"

const profileMenuItems = [
  { label: "Account preferences", key: "preferences", icon: faCircleUser },
  { label: "Sign in & security", key: "security", icon: faLock },
]

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: faHome },
  { label: "Syarat", href: "/syarat", icon: faCogs },
  {
    label: "User Management",
    icon: faCogs,
    children: [
      { label: "Users", href: "/settings/general", icon: faKey },
      { label: "Permissions", href: "/settings/security", icon: faLock },
    ],
  },
]

const TestingPage = () => {
  const [activeMenu, setActiveMenu] = useState("preferences")

  const renderContent = () => {
    if (activeMenu === "preferences") {
      console.log("this is preferences")
      return <RightProfileMenu headingIcon={faCircleUser} />
    } else if (activeMenu === "security") {
      return <SigninSecurity headingIcon={faLock} />
    }
  }

  return (
    <div className="flex min-h-screen bg-graybackground">
      <Sidebar items={sidebarItems} />
      <Navbar />
      <div className="fixed justify w-full ml-72">
        <div className="flex justify-center items-center flex-grow">
          <ProfileMenu
            title="Settings"
            items={profileMenuItems}
            onItemClick={(key) => setActiveMenu(key)}
          />
          <div className="flex justify-center items-center flex-grow">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestingPage
