import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Button from "../../Elements/Button/index"
import Dropdown from "../../Elements/Dropdown"
import { uploadFile } from "../../Elements/Profile/profile.action"
import { error } from "jquery"
import axiosInstance from "../../../utils/axiosConfig"

const AddUser = ({ title = "Add User" }) => {
  const navigate = useNavigate()
  const [user, setUser] = useState({
    name: "",
    email: "",
    role: "",
    username: "",
    password: "",
    verifPass: "",
    phone_number: "",
    profile_picture: "",
  })
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesResponse = await axiosInstance.get("/roles")
        console.log("data roles : ", rolesResponse.data.data)
        setRoles(rolesResponse.data.data)
        console.log("tes", roles)
        console.log("tes2", user)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [])

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

      if (
        !user.name ||
        !user.email ||
        !user.username ||
        !user.role ||
        !user.password ||
        !user.verifPass
      ) {
        alert("Nama, email, role, password dan username harus diisi")
        return
      }

      if (user.password !== user.verifPass) {
        alert("password yang dimasukan berbeda")
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

      const dataToStore = {
        ...user,
        profile_picture: newProfilePicture,
      }

      console.log("Final data to update:", dataToStore)

      try {
        console.log("gagal1")
        const response = await axiosInstance.post(`/users`, dataToStore)
        console.log("berhasil", response)
        navigate("/user-management/1")
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
      <div className="fixed justify w-[75%] ml-72 pt-20">
        <h2 className="text-3xl font-semibold mt-5 ml-2">{title}</h2>
        <div className="h-[80vh] my-10 pb-20 overflow-y-auto bg-white shadow-lg radius rounded-lg">
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

                <Dropdown
                  label="Role"
                  name="role"
                  options={roles.map((role) => ({
                    id: role.id,
                    value: role.name,
                    label: role.name,
                  }))}
                  value={user.role}
                  onChange={(e) => setUser({ ...user, role: e.target.value })}
                  disabled={isLoading}
                  placeholder="Select Role"
                  error={error.role}
                ></Dropdown>

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
                  label="Password"
                  type="password"
                  placeholder="******"
                  name="password"
                  classname="w-80"
                  value={user.password}
                  onChange={(e) =>
                    setUser({ ...user, password: e.target.value })
                  }
                  disabled={isLoading}
                  required
                />

                <InputForm
                  label="VerifPass"
                  type="password"
                  placeholder="******"
                  name="verifPass"
                  classname="w-80"
                  value={user.verifPass}
                  onChange={(e) =>
                    setUser({ ...user, verifPass: e.target.value })
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
                onClick={() => navigate("/user-management/1")}
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

export default AddUser
