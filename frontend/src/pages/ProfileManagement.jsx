import { useState } from "react"
import ProfileMenu from "../components/Elements/Menu/ProfileMenu"
import { faCircleUser, faLock } from "@fortawesome/free-solid-svg-icons"
import RightProfileMenu from "../components/Elements/Profile/AccountPreferences"
import SigninSecurity from "../components/Elements/Profile/SigninSecurity"
import {
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
      <div className="fixed w-full ml-72">
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
