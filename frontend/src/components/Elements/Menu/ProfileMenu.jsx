import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronRight } from "@fortawesome/free-solid-svg-icons"
import PropTypes from "prop-types"
import { useState } from "react"

const ProfileMenu = ({ items, className = "", title = "" }) => {
  const [activeItem, setActiveItem] = useState(null)

  const renderItems = (items) => {
    return items.map((item, index) => (
      <li key={index} className="group">
        <div
          onClick={() => setActiveItem(index)}
          className={`flex font-lg items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
            ${
              activeItem === index
                ? "bg-primary text-white"
                : "text-black hover:bg-primary hover:text-white"
            }`}
        >
          <div className="flex items-center space-x-3">
            {item.icon && (
              <FontAwesomeIcon
                icon={item.icon}
                className={activeItem === index ? "text-white" : ""}
              />
            )}
            <span>{item.label}</span>
          </div>
          {item.children && (
            <FontAwesomeIcon
              icon={faChevronRight}
              className={activeItem === index ? "text-purple-600" : ""}
            />
          )}
        </div>
        {item.children && (
          <ul className="ml-4 space-y-2">{renderItems(item.children)}</ul>
        )}
      </li>
    ))
  }

  return (
    <aside
      id="logo-sidebar"
      className={`w-96 h-screen pt-20 transition-transform bg-graybackground border-gray ${className}`}
      aria-label="Sidebar"
    >
      <div className="mt-8 h-[800px] w-80 px-7 pb-4 overflow-y-auto bg-white shadow-lg radius rounded-lg">
        <h2 className="text-3xl font-semibold mt-5 ml-2">{title}</h2>
        <ul className="mt-2 space-y-1 font-medium">{renderItems(items)}</ul>
      </div>
    </aside>
  )
}

ProfileMenu.propTypes = {
  items: PropTypes.array.isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
}

export default ProfileMenu
