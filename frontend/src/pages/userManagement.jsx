import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import ManageUser from "../components/Fragments/manageUser"
import ManagePermission from "../components/Fragments/managePermission"
import "../App.css"
import Button from "../components/Elements/Button"

const UserManagement = ({
  title = ["User Management", "Permission Management"],
}) => {
  const [mode, setMode] = useState("users")
  const navigate = useNavigate()
  const { modeParams } = useParams()

  useEffect(() => {
    if (modeParams === "users" || modeParams === "permissions") {
      setMode(modeParams)
    } else {
      setMode("users")
    }
  }, [modeParams])

  const handleMode = (newMode) => {
    setMode(newMode)
    navigate(`/user-management/${newMode}`)
  }

  const handleAdd = () => {
    mode === "users"
      ? navigate("/user-management/user/add")
      : navigate("/user-management/role/add")
  }

  const renderContent = () => {
    if (mode === "users") {
      return <ManageUser />
    } else if (mode === "permissions") {
      return <ManagePermission />
    }
  }

  const getTitle = () => {
    return mode === "users" ? title[0] : title[1]
  }

  const getSubtitle = () => {
    return mode === "users"
      ? "Manage your users and their roles"
      : "Manage roles and their permissions"
  }

  return (
    <div className="flex bg-white">
      <div className="w-full">
        <div className="h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar p-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-gray-800">{getTitle()}</h2>
            <p className="text-gray-500">{getSubtitle()}</p>
          </div>

          <div className="mt-4 flex justify-between items-start w-full">
            <div className="flex border-b border-gray-200 relative">
              <div
                onClick={() => handleMode("users")}
                className={`relative px-4 py-3 cursor-pointer transition-colors duration-200 ${
                  mode === "users"
                    ? "text-primary font-semibold"
                    : "text-gray-500 hover:text-primary"
                }`}
              >
                Users
                {mode === "users" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
                )}
              </div>

              <div
                onClick={() => handleMode("permissions")}
                className={`relative px-4 py-3 cursor-pointer transition-colors duration-200 ${
                  mode === "permissions"
                    ? "text-primary font-semibold"
                    : "text-gray-500 hover:text-primary"
                }`}
              >
                Permissions
                {mode === "permissions" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
                )}
              </div>
            </div>

            <Button
              className="bg-base text-white px-4 py-2"
              aria-label="Add"
              onClick={handleAdd}
            >
              {mode === "users" ? "Add User" : "Add Role"}
            </Button>
          </div>

          <div className="mt-4">{renderContent()}</div>
        </div>
      </div>
    </div>
  )
}

export default UserManagement
