import ProgressAkreditasiTable from "../components/Elements/DataTable/ProgressAkreditasiTable"
import ProfileMenu from "../components/Elements/Menu/ProfileMenu"
import Navbar from "../components/Elements/Menu/Navbar"
import MonitoringAkreditasi from "../components/Fragments/MonitoringAkreditasi"
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
  { label: "Account preferences", href: "/dashboard", icon: faCircleUser },
  { label: "Sign in & security", href: "/syarat", icon: faLock },
]

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

const TestingPage = () => {
  return (
    <div className="flex justify-around min-h-screen bg-graybackground">
      <Navbar />
      <ProfileMenu title="Settings" items={profileMenuItems} />
      {/* <RightProfileMenu headingIcon={faCircleUser} />  */}
      <SigninSecurity headingIcon={faLock} /> 
      <Sidebar items={sidebarItems} />
    </div>
  )
}

export default TestingPage
