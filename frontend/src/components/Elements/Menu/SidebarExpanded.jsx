import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faChevronRight,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons"
import PropTypes from "prop-types"

const Sidebar = ({ items, className = "" }) => {
  const [expanded, setExpanded] = useState({})

  const toggleExpand = (index) => {
    setExpanded((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const renderItems = (items) => {
    return items.map((item, index) => (
      <li key={index} className="group">
        <div
          onClick={() => toggleExpand(index)}
          className="flex items-center justify-between p-2 text-black rounded-lg dark:text-black hover:bg-primary hover:text-white dark:hover:bg-primary cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            {item.icon && <FontAwesomeIcon icon={item.icon} />}
            <span>{item.label}</span>
          </div>
          {item.children && (
            <FontAwesomeIcon
              icon={expanded[index] ? faChevronDown : faChevronRight}
            />
          )}
        </div>
        {item.children && expanded[index] && (
          <ul className="ml-4 space-y-2">{renderItems(item.children)}</ul>
        )}
      </li>
    ))
  }

  return (
    <aside
      id="logo-sidebar"
      className={`fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-primary sm:translate-x-0 dark:bg-white dark:border-gray ${className}`}
      aria-label="Sidebar"
    >
      <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
        <ul className="space-y-2 font-medium">{renderItems(items)}</ul>
      </div>
    </aside>
  )
}

Sidebar.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
      children: PropTypes.array,
    })
  ).isRequired,
  className: PropTypes.string,
}

export default Sidebar
