import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Button from "../../Elements/Button/index"
import Dropdown from "../../Elements/Dropdown"
import { uploadFile } from "../../Elements/Profile/profile.action"
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
    jurusanId: "",
    prodiId: "",
  })
  const [roles, setRoles] = useState([])
  const [jurusan, setJurusan] = useState([])
  const [prodi, setProdi] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const [error, setError] = useState({
    role: "",
    jurusanId: "",
    prodiId: "",
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesResponse = await axiosInstance.get("/roles")
        const jurusanResponse = await axiosInstance.get("/jurusan")

        setRoles(rolesResponse.data.data)
        setJurusan(jurusanResponse.data)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    // Reset prodi when jurusan changes
    setProdi([])
    setUser((prev) => ({ ...prev, prodiId: "" }))
  }, [user.jurusanId])

  const fetchProdi = async (id) => {
    try {
      const prodiResponse = await axiosInstance.get(`/prodi/${id}`)
      setProdi(prodiResponse.data)
    } catch (error) {
      console.error("Error fetching prodi:", error)
      setProdi([])
    }
  }

  const handleJurusanChange = (id) => {
    // Reset prodi when jurusan changes
    setProdi([])

    // Update user state with new jurusanId and clear prodiId
    setUser((prev) => ({
      ...prev,
      jurusanId: id,
      prodiId: "",
    }))

    // Fetch prodi for the selected jurusan
    fetchProdi(id)
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

      // Reset error states
      setError({
        role: "",
        jurusanId: "",
        prodiId: "",
      })

      // Validation
      const validationErrors = {
        role: !user.role ? "Role harus dipilih" : "",
        jurusanId: !user.jurusanId ? "Jurusan harus dipilih" : "",
        prodiId: !user.prodiId ? "Program Studi harus dipilih" : "",
      }

      // Check all required fields
      const requiredFields = [
        "name",
        "email",
        "username",
        "role",
        "password",
        "verifPass",
        "phone_number",
        "jurusanId",
        "prodiId",
      ]

      const missingFields = requiredFields.filter((field) => !user[field])

      if (missingFields.length > 0) {
        alert(`Harap lengkapi field berikut: ${missingFields.join(", ")}`)
        setIsLoading(false)
        return
      }

      // Additional validations
      if (user.password !== user.verifPass) {
        alert("Password yang dimasukkan berbeda")
        setIsLoading(false)
        return
      }

      // Set any validation errors
      if (
        validationErrors.role ||
        validationErrors.jurusanId ||
        validationErrors.prodiId
      ) {
        setError(validationErrors)
        setIsLoading(false)
        return
      }

      let newProfilePicture = user.profile_picture

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

      const dataToStore = {
        ...user,
        profile_picture: newProfilePicture,
        // Remove unnecessary fields
        phone_number: user.phone_number,
        // Ensure correct field names match backend
        jurusanId: user.jurusanId,
        prodiId: user.prodiId,
      }

      // Remove verifPass before sending
      delete dataToStore.verifPass

      console.log(
        "Data yang akan dikirim:",
        JSON.stringify(dataToStore, null, 2)
      )

      try {
        const response = await axiosInstance.post(`/users`, dataToStore)

        console.log("Response dari backend:", {
          data: response.data,
          status: response.status,
          headers: response.headers,
        })

        navigate("/user-management/1")
      } catch (error) {
        console.error("Error creating user:", {
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
        })
        alert("Gagal membuat user. Silakan coba lagi.")
      }
    } catch (error) {
      console.error("Handle update error:", error)
      alert("Terjadi kesalahan. Silakan coba lagi.")
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
                  placeholder="Pilih Role"
                  error={error.role}
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
                  placeholder={
                    user.jurusanId ? "Jurusan Terpilih" : "Pilih Jurusan"
                  }
                  error={error.jurusanId}
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
                  onChange={(e) => {
                    setUser({
                      ...user,
                      prodiId: e.target.value,
                    })
                  }}
                  disabled={isLoading || !user.jurusanId || prodi.length === 0}
                  placeholder={
                    prodi.length === 0
                      ? "Pilih Jurusan Dulu"
                      : "Pilih Program Studi"
                  }
                  error={error.prodiId}
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
                  label="Verify Password"
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
                aria-label="Add"
                onClick={handleChange}
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddUser
