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

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-full">
        <div className="h-[calc(100vh-5rem)] overflow-y-auto hide-scrollbar">
          <h2 className="text-3xl font-semibold ml-2">{getTitle()}</h2>
          <div className="cursor-pointer mt-8 flex justify-between px-7 items-center w-full">
            <div className="flex gap-5 items-center">
              <div
                onClick={() => handleMode("users")}
                className={`relative ${
                  mode === "users"
                    ? "text-primary font-semibold"
                    : "text-gray-500"
                } hover:text-primary group`}
              >
                Users
                <span
                  className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] bg-primary transition-all duration-300 ease-in-out ${
                    mode === "users"
                      ? "w-[55px] scale-x-100"
                      : "w-0 group-hover:w-[55px] group-hover:scale-x-100"
                  }`}
                ></span>
              </div>

              <div
                onClick={() => handleMode("permissions")}
                className={`relative ${
                  mode === "permissions"
                    ? "text-primary font-semibold"
                    : "text-gray-500"
                } hover:text-primary group`}
              >
                Permissions
                <span
                  className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] bg-primary transition-all duration-300 ease-in-out ${
                    mode === "permissions"
                      ? "w-[80px] scale-x-100"
                      : "w-0 group-hover:w-[80px] group-hover:scale-x-100"
                  }`}
                ></span>
              </div>
            </div>
            <Button
              className="bg-base mb-5"
              aria-label="Add"
              onClick={handleAdd}
            >
              {mode === "users" ? "Add User" : "Add Role"}
            </Button>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default UserManagement
