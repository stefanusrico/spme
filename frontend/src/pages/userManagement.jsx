import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import ManageUser from "../components/Fragments/manageUser"
import ManagePermission from "../components/Fragments/managePermission"
import "../App.css"
import Button from "../components/Elements/Button"

const UserManagement = ({
  title = ["User Management", "Permission Management"],
}) => {
  const [mode, setMode] = useState(1)
  const navigate = useNavigate()
  const { modeParams } = useParams()

  useEffect(() => {
    const parsedMode = parseInt(modeParams, 10)
    if (!isNaN(parsedMode) && (parsedMode === 1 || parsedMode === 2)) {
      setMode(parsedMode)
    } else {
      setMode(1)
    }
  }, [modeParams])

  const handleMode = (mode) => {
    setMode(mode)
    navigate(`/user-management/${mode}`)
  }

  const handleAdd = () => {
    mode == 1
      ? navigate("/user-management/user/add")
      : navigate("/user-management/role/add")
  }

  const renderContent = () => {
    if (mode === 1) {
      return <ManageUser />
    } else if (mode === 2) {
      return <ManagePermission />
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="justify w-full pt-20">
        <div className="h-[calc(100vh-5rem)] overflow-y-auto hide-scrollbar">
          {" "}
          {/* Tambahkan scroll Y */}
          <h2 className="text-3xl font-semibold mt-5 ml-2">
            {title[mode - 1]}
          </h2>
          <div className="cursor-pointer mt-8 flex justify-between px-7 items-center w-full">
            <div className="flex gap-5 items-center">
              <div
                onClick={() => handleMode(1)}
                className={`relative ${
                  mode === 1 ? "text-primary font-semibold" : "text-gray-500"
                } hover:text-primary group`}
              >
                Users
                <span
                  className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] bg-primary transition-all duration-300 ease-in-out ${
                    mode === 1
                      ? "w-[55px] scale-x-100"
                      : "w-0 group-hover:w-[55px] group-hover:scale-x-100"
                  }`}
                ></span>
              </div>

              <div
                onClick={() => handleMode(2)}
                className={`relative ${
                  mode === 2 ? "text-primary font-semibold" : "text-gray-500"
                } hover:text-primary group`}
              >
                Permissions
                <span
                  className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] bg-primary transition-all duration-300 ease-in-out ${
                    mode === 2
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
              {mode === 1 ? "Add User" : "Add Role"}
            </Button>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default UserManagement
