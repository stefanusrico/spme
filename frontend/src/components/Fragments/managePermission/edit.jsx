import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Button from "../../Elements/Button/index"
import Navbar from "../../../components/Elements/Menu/Navbar"
import Sidebar from "../../../components/Elements/Menu/SidebarExpanded"
import { sidebarAdmin } from "../../Elements/Menu/sidebar"
import axiosInstance from "../../../utils/axiosConfig"

const EditRole = ({ title = "Edit Role" }) => {
  const navigate = useNavigate()
  const [role, setRole] = useState({ name: "" })
  const [errors, setErrors] = useState({})
  const { id } = useParams()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get(`/roles/${id}`)
        setRole(response.data.data)
        console.log("data role fetch : ", response)
      } catch {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [id])

  const handleChange = async () => {
    try {
      setIsLoading(true)

      if (!role.name) {
        alert("Nama harus diisi")
        return
      }
      console.log("nama role  :", role.name)

      try {
        console.log("gagal1")
        const response = await axiosInstance.put(`/roles/${id}`, {
          name: role.name,
        })
        console.log("berhasil", response)
        navigate("/user-management/2")
      } catch (error) {
        console.log("gagal")
      }
    } catch (error) {
      console.error("Handle update error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-graybackground">
      <Sidebar items={sidebarAdmin} />
      <Navbar />
      <div className="fixed justify w-[75%] ml-72 pt-20">
        <h2 className="text-3xl font-semibold mt-5 ml-2">{title}</h2>
        <div className="h-[80vh] my-10 pb-4 overflow-y-auto bg-white shadow-lg radius rounded-lg">
          <div className=" items-center flex-grow">
            <div className="flex space-x-16">
              <div className="mt-10 ml-8 flex flex-col">
                <InputForm
                  label="Name"
                  type="text"
                  placeholder="Monica"
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
                {isLoading ? "Update..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditRole
