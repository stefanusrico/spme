import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faChevronRight,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons"
import PropTypes from "prop-types"
import { useState } from "react"

const ProfileMenu = ({ items, className = "", title = "", onItemClick }) => {
  const [activeItem, setActiveItem] = useState(null)
  const [expandedItems, setExpandedItems] = useState({})

  const toggleExpand = (key) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleClick = (item) => {
    setActiveItem(item.key)
    if (onItemClick) onItemClick(item.key)
  }

  const renderItems = (items) => {
    return items.map((item) => (
      <li key={item.key} className="group">
        <div
          onClick={() =>
            item.children ? toggleExpand(item.key) : handleClick(item)
          }
          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
            ${
              activeItem === item.key
                ? "bg-base text-white"
                : "text-black hover:bg-base hover:text-white"
            }`}
        >
          <div className="flex items-center space-x-3">
            {item.icon && <FontAwesomeIcon icon={item.icon} />}
            <span>{item.label}</span>
          </div>
          {item.children && (
            <FontAwesomeIcon
              icon={expandedItems[item.key] ? faChevronDown : faChevronRight}
              className="ml-2"
            />
          )}
        </div>
        {item.children && expandedItems[item.key] && (
          <ul className="ml-4 space-y-2">{renderItems(item.children)}</ul>
        )}
      </li>
    ))
  }

  return (
    <aside
      id="profile-sidebar"
      className={`w-80 flex pt-20 transition-transform bg-white border-gray ${className}`}
      aria-label="Sidebar"
    >
      <div className="mt-8 w-80 px-7 pb-4 overflow-y-auto bg-white shadow-xl radius rounded-lg">
        <h2 className="text-3xl font-semibold mt-5 ml-2">{title}</h2>
        <ul className="mt-2 space-y-1 font-medium">{renderItems(items)}</ul>
      </div>
    </aside>
  )
}

ProfileMenu.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.object,
      children: PropTypes.array,
    })
  ).isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
  onItemClick: PropTypes.func,
}

export default ProfileMenu
