import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Button from "../../Elements/Button/index"
import Dropdown from "../../Elements/Dropdown"
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
    jurusanId: "",
    prodiId: "",
  })
  const [roles, setRoles] = useState([])
  const [jurusan, setJurusan] = useState([])
  const [prodi, setProdi] = useState([])
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await axiosInstance.get(`/users/${id}`)
        const rolesResponse = await axiosInstance.get("/roles")
        const jurusanResponse = await axiosInstance.get("/jurusan")

        const userData = userResponse.data.data

        // Map old fields to new fields if necessary
        setUser({
          ...userData,
          jurusanId: userData.jurusanId || userData.jurusan,
          prodiId: userData.prodiId || userData.prodi,
        })

        setRoles(rolesResponse.data.data)
        setJurusan(jurusanResponse.data)
        setPreviewImage(userData.profile_picture)

        // If jurusanId exists, fetch corresponding prodi
        if (userData.jurusanId) {
          fetchProdi(userData.jurusanId)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [id])

  const fetchProdi = async (jurusanId) => {
    try {
      const prodiResponse = await axiosInstance.get(`/prodi/${jurusanId}`)
      setProdi(prodiResponse.data)
    } catch (error) {
      console.error("Error fetching prodi:", error)
      setProdi([])
    }
  }

  const handleJurusanChange = (jurusanId) => {
    setUser((prev) => ({
      ...prev,
      jurusanId: jurusanId,
      prodiId: "",
    }))
    fetchProdi(jurusanId)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
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
    }
  }

  const handleChange = async () => {
    try {
      setIsLoading(true)

      // Validate required fields
      if (
        !user.name ||
        !user.email ||
        !user.username ||
        !user.role ||
        !user.jurusanId ||
        !user.prodiId
      ) {
        alert("Semua field harus diisi")
        return
      }

      let newProfilePicture = user.profile_picture

      // Upload profile picture if it's a new file
      if (user.profile_picture instanceof File) {
        const uploadResponse = await uploadFile(
          user.profile_picture,
          "profile_pictures"
        )

        if (uploadResponse.status === "success") {
          newProfilePicture =
            uploadResponse.file_path ||
            uploadResponse.path ||
            uploadResponse.url
        } else {
          throw new Error("Gagal mengunggah foto profil")
        }
      }

      // Prepare data for update
      const dataToUpdate = {
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        phone_number: user.phone_number,
        profile_picture: newProfilePicture,
        jurusanId: user.jurusanId,
        prodiId: user.prodiId,
      }

      try {
        const response = await axiosInstance.put(`/users/${id}`, dataToUpdate)
        navigate("/user-management")
      } catch (error) {
        console.error("Update error:", error)
        alert("Gagal memperbarui user")
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
          <div className="items-center flex-grow">
            <div className="mt-8 ml-8 flex items-center space-x-8">
              <img
                src={
                  previewImage
                    ? `http://localhost:8000/storage/${previewImage}`
                    : "/default-avatar.png"
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
                  className="mb-6"
                  placeholder={user.role || "Pilih Role"}
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

                <InputForm
                  label="Phone Number"
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

                <Dropdown
                  label="Jurusan"
                  name="jurusanId"
                  options={jurusan.map((j) => ({
                    id: j.id,
                    value: j.id,
                    label: j.name,
                  }))}
                  value={user.jurusanId}
                  onChange={(e) => {
                    handleJurusanChange(e.target.value)
                  }}
                  disabled={isLoading}
                  className="mb-6"
                  placeholder={
                    user.jurusanId ? "Jurusan Terpilih" : "Pilih Jurusan"
                  }
                />

                <Dropdown
                  label="Program Studi"
                  name="prodiId"
                  options={prodi.map((p) => ({
                    id: p.id,
                    value: p.id,
                    label: p.name,
                  }))}
                  value={user.prodiId}
                  onChange={(e) =>
                    setUser({ ...user, prodiId: e.target.value })
                  }
                  disabled={isLoading || !user.jurusanId}
                  className="mb-6"
                  placeholder={
                    user.prodiId ? "Prodi Terpilih" : "Pilih Program Studi"
                  }
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