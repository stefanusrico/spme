import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { handleLogout } from "../components/Auth/auth.action"

export const useSidebarMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
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

  const toggleCollapse = () => {
    setCollapsed(!collapsed)
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

  return {
    isOpen,
    collapsed,
    dropdownRef,
    toggleDropdown,
    toggleCollapse,
    handleMenuItemClick,
    handleLogoutSubmit,
  }
}
