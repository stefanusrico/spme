import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Label from "../../Elements/Input/Label"
import Button from "../../Elements/Button/index"
import { uploadFile } from "../../Elements/Profile/profile.action"
import axiosInstance from "../../../utils/axiosConfig"

const EditUser = ({ title = "Edit User" }) => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState({
    name: "",
    email: "",
    role: "",
    username: "",
    phone_number: "",
    profile_picture: "",
  })
  const [roles, setRoles] = useState([])
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await axiosInstance.get(`/users/${id}`)
        const rolesResponse = await axiosInstance.get("/roles")
        setUser(userResponse.data.data)
        setRoles(rolesResponse.data.data)
        setPreviewImage(userResponse.data.data.profile_picture)

        console.log("tes", userResponse)
        console.log("tes2", user)
        console.log("path image : ", user.profile_picture)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [id])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      console.log("masuk file", file)

      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file terlalu besar (maksimal 5MB)")
        return
      }

      if (!file.type.startsWith("image/")) {
        alert("Hanya file gambar yang diperbolehkan")
        return
      }

      setPreviewImage(URL.createObjectURL(file))
      setUser({ ...user, profile_picture: file })
      console.log("profile picture", user.profile_picture)
    }
  }

  const handleChange = async () => {
    try {
      setIsLoading(true)
      console.log("cek sebelum update : ", user)
      if (!user.name || !user.email || !user.username || !user.role) {
        alert("Nama, email, role, dan username harus diisi")
        return
      }

      let newProfilePicture = user.profile_picture

      if (user.profile_picture instanceof File) {
        console.log("New file detected:", user.profile_picture)

        const uploadResponse = await uploadFile(
          user.profile_picture,
          "profile_pictures"
        )

        console.log("Upload response received:", uploadResponse)

        if (uploadResponse.status === "success") {
          newProfilePicture =
            uploadResponse.file_path ||
            uploadResponse.path ||
            uploadResponse.url
          console.log("New profile picture path:", newProfilePicture)
        } else {
          throw new Error("Gagal mengunggah foto profil")
        }
      } else {
        console.log("masuk sini")
      }

      const dataToUpdate = {
        ...user,
        profile_picture: newProfilePicture,
      }

      console.log("Final data to update:", dataToUpdate)

      try {
        console.log("gagal1")
        const response = await axiosInstance.put(`/users/${id}`, dataToUpdate)
        console.log("berhasil", response)
        navigate("/user-management")
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
    <div className="flex w-full">
      <div className="w-full">
        <h2 className="text-3xl font-semibold mt-5">{title}</h2>
        <div className="h-[80vh] mt-5 overflow-y-auto bg-white shadow-lg radius rounded-lg">
          <div className=" items-center flex-grow">
            <div className="mt-8 ml-8 flex items-center space-x-8">
              <img
                src={
                  previewImage ||
                  (user.profile_picture
                    ? `http://localhost:8000/storage/${user.profile_picture}`
                    : "/default-avatar.png")
                }
                alt="User Avatar"
                className="inline-block h-[110px] w-[110px] rounded-full object-cover object-center"
              />
              <div className="flex flex-col space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <Button
                  className="bg-primary w-36 text-white"
                  onClick={() => fileInputRef.current.click()}
                  aria-label="Change"
                  disabled={isLoading}
                >
                  Change
                </Button>
                <Button
                  className="bg-primary w-36 text-white"
                  onClick={() => {
                    if (previewImage) {
                      URL.revokeObjectURL(previewImage)
                    }
                    setPreviewImage(null)
                    setUser({ ...user, profile_picture: "" })
                  }}
                  aria-label="Remove"
                  disabled={isLoading}
                >
                  Remove
                </Button>
              </div>
            </div>
            <div className="flex space-x-16">
              <div className="mt-10 ml-8 flex flex-col">
                <InputForm
                  label="Name"
                  type="text"
                  placeholder="Monica"
                  name="name"
                  classname="w-80"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  disabled={isLoading}
                  required
                />

                <div className="mb-6">
                  <Label htmlFor={name}>Role</Label>
                  <select
                    name="role"
                    value={user.role || ""}
                    onChange={(e) => setUser({ ...user, role: e.target.value })}
                    disabled={isLoading}
                    className="w-80 p-2 rounded-md text-sm bg-gray focus:outline-none focus:ring focus:ring-gray-400 p-3"
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <span className="text-red-500 text-xs">{errors.role}</span>
                  )}
                </div>

                <InputForm
                  label="Phone_number"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  name="phone_number"
                  classname="w-80"
                  value={user.phone_number}
                  onChange={(e) =>
                    setUser({ ...user, phone_number: e.target.value })
                  }
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="mt-10 ml-10 flex flex-col">
                <InputForm
                  label="Email"
                  type="email"
                  placeholder="example@email.com"
                  name="email"
                  classname="w-80"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  disabled={isLoading}
                  required
                />

                <InputForm
                  label="Username"
                  type="text"
                  placeholder="Mon"
                  name="username"
                  classname="w-80"
                  value={user.username}
                  onChange={(e) =>
                    setUser({ ...user, username: e.target.value })
                  }
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            <div className="mt-10 ml-8 flex space-x-96">
              <Button
                className="bg-red w-40 hover:bg-white hover:text-red"
                aria-label="Cancel"
                onClick={() => navigate("/user-management")}
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

export default EditUser
