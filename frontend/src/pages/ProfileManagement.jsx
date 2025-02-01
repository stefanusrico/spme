import { useState } from "react"
import ProfileMenu from "../components/Elements/Menu/ProfileMenu"
import { faCircleUser, faLock } from "@fortawesome/free-solid-svg-icons"
import RightProfileMenu from "../components/Elements/Profile/AccountPreferences"
import SigninSecurity from "../components/Elements/Profile/SigninSecurity"
import { profileMenuItems } from "../components/Elements/Menu/sidebar"

const ProfileManagement = () => {
  const [activeMenu, setActiveMenu] = useState("preferences")

  const renderContent = () => {
    if (activeMenu === "preferences") {
      return <RightProfileMenu headingIcon={faCircleUser} />
    } else if (activeMenu === "security") {
      return <SigninSecurity headingIcon={faLock} />
    }
  }

  return (
    <div className="h-[910px] bg-white overflow-y-hidden">
      <div className="w-full">
        <div className="flex flex-row">
          <ProfileMenu
            title="Settings"
            items={profileMenuItems}
            onItemClick={(key) => setActiveMenu(key)}
          />
          <div className="w-full ml-8">{renderContent()}</div>
        </div>
      </div>
    </div>
  )
}

export default ProfileManagement
