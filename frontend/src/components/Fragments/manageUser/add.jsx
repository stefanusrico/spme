import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Button from "../../Elements/Button/index"
import Dropdown from "../../Elements/Dropdown"
import { uploadFile } from "../../Elements/Profile/profile.action"
import axiosInstance from "../../../utils/axiosConfig"

const ADMIN_ROLE_NAME = "Admin" // Asumsi nama role untuk Admin

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
    // jurusanId: "", // Dihapus
    prodiId: "",
  })
  const [roles, setRoles] = useState([])
  // const [jurusan, setJurusan] = useState([]) // Dihapus
  const [prodi, setProdi] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const [error, setError] = useState({
    role: "",
    // jurusanId: "", // Dihapus
    prodiId: "",
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesResponse = await axiosInstance.get("/roles")
        setRoles(rolesResponse.data.data)

        // Langsung fetch semua prodi, karena jurusan sudah tidak ada
        // Asumsi endpoint /prodi mengembalikan semua prodi
        const prodiResponse = await axiosInstance.get("/prodi")
        setProdi(prodiResponse.data) // Sesuaikan dengan struktur data respons prodi
      } catch (error) {
        console.error("Error fetching initial data:", error)
        if (error.response && error.response.config.url.includes("/prodi")) {
          setProdi([]) // Gagal fetch prodi, set ke array kosong
          console.error("Khususnya, error fetching prodi data.")
        }
      }
    }
    fetchData()
  }, [])

  // Tidak ada lagi useEffect yang bergantung pada user.jurusanId

  // Fungsi fetchProdi(id) sudah tidak relevan karena prodi difetch semua di awal
  // Fungsi handleJurusanChange juga sudah tidak relevan

  const handleRoleChange = (selectedRole) => {
    setUser((prev) => ({
      ...prev,
      role: selectedRole,
      prodiId: selectedRole === ADMIN_ROLE_NAME ? "" : prev.prodiId, // Reset prodiId jika role Admin
    }))
    // Reset error prodi jika role berubah
    setError((prev) => ({ ...prev, prodiId: "" }))
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
      setError({
        role: "",
        prodiId: "",
      })

      // Validation
      const validationErrors = {
        role: !user.role ? "Role harus dipilih" : "",
        // prodiId tidak divalidasi di sini jika Admin, tapi backend-mu MEWAJIBKANNYA. Ini akan jadi masalah.
        prodiId:
          user.role !== ADMIN_ROLE_NAME && !user.prodiId
            ? "Program Studi harus dipilih"
            : "",
      }

      const requiredFields = [
        "name",
        "email",
        "role",
        "password",
        "verifPass",
        "phone_number",
      ]
      // ProdiId menjadi kondisional
      if (user.role !== ADMIN_ROLE_NAME) {
        requiredFields.push("prodiId")
      }

      const missingFields = requiredFields.filter((field) => !user[field])

      if (missingFields.length > 0) {
        alert(`Harap lengkapi field berikut: ${missingFields.join(", ")}`)
        setIsLoading(false)
        return
      }

      if (user.password !== user.verifPass) {
        alert("Password yang dimasukkan berbeda")
        setIsLoading(false)
        return
      }

      if (
        validationErrors.role ||
        (user.role !== ADMIN_ROLE_NAME && validationErrors.prodiId)
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
        // jurusanId: user.jurusanId, // DIHAPUS. PERHATIAN: Backend-mu MEWAJIBKAN ini!
      }
      delete dataToStore.verifPass
      // delete dataToStore.jurusanId; // Pastikan ini benar-benar dihapus jika tidak dikirim

      // Hanya tambahkan prodiId jika bukan Admin
      // PERHATIAN: Backend-mu MEWAJIBKAN prodiId bahkan untuk Admin!
      if (user.role !== ADMIN_ROLE_NAME) {
        dataToStore.prodiId = user.prodiId
      } else {
        delete dataToStore.prodiId // Hapus prodiId jika Admin
      }

      // **CATATAN PENTING SEKALI:**
      // Berdasarkan info API-mu:
      // 1. `jurusanId` adalah `required`. Menghapusnya dari `dataToStore` akan menyebabkan ERROR dari backend.
      // 2. `prodiId` adalah `required`. Jika `user.role` adalah `ADMIN_ROLE_NAME`, `dataToStore` di atas tidak akan punya `prodiId`, ini juga akan ERROR.
      // Kamu PERLU menangani ini, entah dengan mengubah backend atau mengirim nilai default yang valid.

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
        alert(
          `Gagal membuat user: ${
            error.response?.data?.message || "Silakan coba lagi."
          }`
        )
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
                  (user.profile_picture &&
                  typeof user.profile_picture === "string" // Cek jika string (path dari DB)
                    ? `http://localhost:8000/storage/${user.profile_picture}`
                    : user.profile_picture instanceof File // Cek jika File (belum diupload)
                    ? URL.createObjectURL(user.profile_picture) // Ini akan direvoke oleh previewImage, tapi sbg fallback
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
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "" // Reset file input
                    }
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
                    id: role.id, // Pastikan role.id unik dan string jika dipakai sbg key
                    value: role.name, // Menggunakan role.name sebagai value
                    label: role.name,
                  }))}
                  value={user.role}
                  onChange={(e) => handleRoleChange(e.target.value)} // Gunakan handleRoleChange
                  disabled={isLoading}
                  placeholder="Pilih Role"
                  error={error.role}
                />

                <InputForm
                  label="Username (Opsional)"
                  type="text"
                  placeholder="Mon"
                  name="username"
                  classname="w-80"
                  value={user.username}
                  onChange={(e) =>
                    setUser({ ...user, username: e.target.value })
                  }
                  disabled={isLoading}
                  required={false}
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

                {/* Dropdown Jurusan Dihapus */}

                {/* Prodi hanya muncul jika role bukan Admin dan role sudah dipilih */}
                {user.role && user.role !== ADMIN_ROLE_NAME && (
                  <Dropdown
                    label="Program Studi"
                    name="prodiId"
                    options={prodi.map((p) => ({
                      id: p.id, // Pastikan p.id unik dan string jika dipakai sbg key
                      value: p.id, // Menggunakan p.id sebagai value
                      label: p.name,
                    }))}
                    value={user.prodiId}
                    onChange={(e) => {
                      setUser({
                        ...user,
                        prodiId: e.target.value,
                      })
                    }}
                    disabled={isLoading || prodi.length === 0}
                    placeholder={
                      prodi.length === 0
                        ? "Data Prodi tidak tersedia"
                        : "Pilih Program Studi"
                    }
                    error={error.prodiId}
                  />
                )}

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
            <div className="mt-10 ml-8 flex space-x-96 pb-10">
              {" "}
              {/* Tambah pb-10 untuk padding bawah */}
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
