import { useState } from "react"
import { useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Button from "../../Elements/Button/index"
import axiosInstance from "../../../utils/axiosConfig"

const AddPermission = ({ title = "Add Role" }) => {
  const navigate = useNavigate()
  const [role, setRole] = useState({ name: "" })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = async () => {
    try {
      setIsLoading(true)

      if (!role.name) {
        alert("Nama harus diisi")
        return
      }

      const response = await axiosInstance.post("/roles", {
        name: role.name,
        access: [],
      })

      console.log("Success:", response)
      navigate("/user-management/permissions")
    } catch (error) {
      console.error("Error creating role:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full">
      <div className="w-full">
        <h2 className="text-3xl font-semibold mt-5">{title}</h2>
        <div className="h-[80vh] my-10 pb-4 overflow-y-auto bg-white shadow-lg radius rounded-lg">
          <div className=" items-center flex-grow">
            <div className="flex space-x-16">
              <div className="mt-10 ml-8 flex flex-col">
                <InputForm
                  label="Name"
                  type="text"
                  placeholder="Admin"
                  name="name"
                  classname="w-80"
                  value={role.name}
                  onChange={(e) => setRole({ ...role, name: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            <div className="mt-10 ml-8 flex space-x-96">
              <Button
                className="bg-red w-40 hover:bg-white hover:text-red"
                aria-label="Cancel"
                onClick={() => navigate("/user-management/2")}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-primary w-40 hover:bg-white hover:text-primary"
                aria-label="Update"
                onClick={handleChange}
                disabled={isLoading}
              >
                {isLoading ? "Add..." : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddPermission
