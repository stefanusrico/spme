import { useState, useRef, useEffect } from "react"
import { User, Settings, LogOut, HelpCircle, ChevronDown } from "lucide-react"

const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

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
    console.log(`Clicked: ${action}`)
    setIsOpen(false)
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
          src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
          alt="User profile"
        />
        <div className="hidden sm:block text-left">
          <p className="text-sm text-gray-900 dark:text-black">Neil Sims</p>
          <p className="text-xs font-medium text-gray-500 truncate dark:text-gray-300">
            Software Engineer
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
            <p className="text-sm text-gray-900 dark:text-white">Neil Sims</p>
            <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-300">
              neil.sims@flowbite.com
            </p>
          </div>
          <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
            <li>
              <button
                onClick={() => handleMenuItemClick("dashboard")}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                role="menuitem"
              >
                <User className="mr-2 w-4 h-4" />
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => handleMenuItemClick("settings")}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                role="menuitem"
              >
                <Settings className="mr-2 w-4 h-4" />
                Settings
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
          </ul>
          <div className="py-2">
            <button
              onClick={() => handleMenuItemClick("logout")}
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
