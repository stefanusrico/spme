import { useState, useRef, useEffect } from "react"
import { Globe, Settings, LogOut, HelpCircle, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { handleLogout } from "../../Auth/auth.action"
import { useUser } from "../../../context/userContext"

const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { userData, clearUserData } = useUser()
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleMenuItemClick = (action) => {
    switch (action) {
      case "settings":
        navigate("/user/profile")
        break
      case "help":
        navigate("/help")
        break
      case "language":
        navigate("/language")
        break
      default:
        console.log(`Unknown action: ${action}`)
    }
    setIsOpen(false)
  }

  const handleLogoutSubmit = () => {
    handleLogout()
      .then(() => {
        clearUserData()
        navigate("/login")
        setIsOpen(false)
      })
      .catch((error) => {
        console.error("Error during logout:", error)
      })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center space-x-2 text-sm bg-gray-200 rounded-full focus:ring-4 focus:ring-gray-300 p-1"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="sr-only">Open user menu</span>
        <img
          className="w-8 h-8 rounded-full object-cover"
          src={
            userData.profile_picture
              ? `http://localhost:8000/storage/${userData.profile_picture}`
              : "/default-avatar.png"
          }
          alt="User profile"
        />
        <div className="hidden sm:block text-left">
          <p className="text-sm text-gray-900 dark:text-black">
            {userData.name || "Loading..."}
          </p>
          <p className="text-xs font-medium text-gray-500 truncate dark:text-gray-300">
            {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white divide-y divide-gray-100 rounded-lg shadow-lg dark:bg-gray-700 dark:divide-gray-600"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-4 py-3">
            <p className="text-sm text-gray-900 dark:text-black">
              {userData.name || "Loading..."}
            </p>
            <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-300">
              {userData.email || "Loading..."}
            </p>
          </div>
          <ul className="py-2 text-sm text-black">
            <li>
              <button
                onClick={() => handleMenuItemClick("settings")}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                role="menuitem"
              >
                <Settings className="mr-2 w-4 h-4" />
                Settings & Privacy
              </button>
            </li>
            <li>
              <button
                onClick={() => handleMenuItemClick("help")}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                role="menuitem"
              >
                <HelpCircle className="mr-2 w-4 h-4" />
                Help
              </button>
            </li>
            <li>
              <button
                onClick={() => handleMenuItemClick("language")}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                role="menuitem"
              >
                <Globe className="mr-2 w-4 h-4" />
                Language
              </button>
            </li>
          </ul>
          <div className="py-2">
            <button
              onClick={handleLogoutSubmit}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
              role="menuitem"
            >
              <LogOut className="mr-2 w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDropdown
