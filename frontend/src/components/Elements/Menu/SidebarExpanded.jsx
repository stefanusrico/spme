import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faChevronRight,
  faChevronDown,
  faBars,
  faTimes,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons"
import PropTypes from "prop-types"

const Sidebar = ({ items, className = "", onCollapse }) => {
  const [expanded, setExpanded] = useState({})
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleExpand = (index) => {
    setExpanded((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
    onCollapse && onCollapse(!isCollapsed)
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // const toggleCollapse = () => {
  //   setIsCollapsed(!isCollapsed)
  // }

  const renderItems = (items) => {
    return items.map((item, index) => (
      <li key={index} className="group">
        {item.href ? (
          <a
            href={item.href}
            className="flex font-lg items-center justify-between p-2 text-black rounded-lg hover:bg-base hover:text-white dark:hover:bg-base cursor-pointer"
          >
            <div className="ml-2 flex items-center space-x-2">
              {item.icon && <FontAwesomeIcon icon={item.icon} />}
              {!isCollapsed && <span>{item.label}</span>}
            </div>
          </a>
        ) : (
          <div
            onClick={() => toggleExpand(index)}
            className="flex font-lg items-center justify-between p-2 text-black rounded-lg hover:bg-base hover:text-white dark:hover:bg-base cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              {item.icon && <FontAwesomeIcon icon={item.icon} />}
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {!isCollapsed && item.children && (
              <FontAwesomeIcon
                icon={expanded[index] ? faChevronDown : faChevronRight}
              />
            )}
          </div>
        )}
        {item.children && expanded[index] && !isCollapsed && (
          <ul className="ml-4 space-y-2">{renderItems(item.children)}</ul>
        )}
      </li>
    ))
  }

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="sm:hidden p-2 text-black "
        aria-label="Toggle Sidebar"
      >
        <FontAwesomeIcon icon={isOpen ? faTimes : faBars} />
      </button>

      <aside
        id="logo-sidebar"
        className={`fixed top-0 left-0 z-40 ${
          isCollapsed ? "w-16" : "w-64"
        } h-screen pt-20 transition-all duration-300 bg-white border-r border-gray sm:translate-x-0 overflow-x-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${className}`}
        aria-label="Sidebar"
      >
        <div className="relative h-full px-3 pb-4 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-800">
          <button
            onClick={toggleCollapse}
            className="absolute right-[-12px] top-[50%] transform -translate-y-1/2 bg-white border border-gray-200 rounded-full p-2 hover:bg-gray-100"
            aria-label="Collapse Sidebar"
          >
            <FontAwesomeIcon
              icon={isCollapsed ? faChevronRight : faChevronLeft}
              className="text-gray-500"
            />
          </button>
          <ul className="space-y-2 font-medium">{renderItems(items)}</ul>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
