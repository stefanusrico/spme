import { useState } from "react"
import ProfileMenu from "../components/Elements/Menu/ProfileMenu"
import Navbar from "../components/Elements/Menu/Navbar"
import Sidebar from "../components/Elements/Menu/SidebarExpanded"
import { faCircleUser, faLock } from "@fortawesome/free-solid-svg-icons"
import RightProfileMenu from "../components/Elements/Profile/AccountPreferences"
import SigninSecurity from "../components/Elements/Profile/SigninSecurity"
import {
  sidebarAdmin,
  profileMenuItems,
} from "../components/Elements/Menu/sidebar"

const ProfileManagement = () => {
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
      <Sidebar items={sidebarAdmin} />
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

export default ProfileManagement
