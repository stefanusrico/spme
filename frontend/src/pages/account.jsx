import { useState, useRef, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ToastContainer, toast } from "react-toastify"
import {
  updateUserProfile,
  uploadFile,
  updatePassword,
  fetchUserData,
} from "../components/Elements/Profile/profile.action"
import { useUser } from "../context/userContext"
import "react-toastify/dist/ReactToastify.css"

const Account = () => {
  const fileInputRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const { userData, updateUserData, isUpdating } = useUser()
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    role: "",
    phone_number: "",
    profile_picture: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        username: userData.username || "",
        email: userData.email || "",
        role: userData.role || "",
        phone_number: userData.phone_number || "",
        profile_picture: userData.profile_picture || "",
      })
    }
  }, [userData])

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue"></div>
      </div>
    )
  }

  const hasChanges = () => {
    if (formData.profile_picture instanceof File) return true
    if (userData.profile_picture && !formData.profile_picture) return true
    const fieldsToCompare = ["name", "username", "email", "phone_number"]
    return fieldsToCompare.some((field) => userData[field] !== formData[field])
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning("Ukuran file terlalu besar (maksimal 5MB)")
        return
      }

      if (!file.type.startsWith("image/")) {
        toast.warning("Hanya file gambar yang diperbolehkan")
        return
      }

      setPreviewImage(URL.createObjectURL(file))
      setFormData({ ...formData, profile_picture: file })
    }
  }

  const validatePasswords = () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error("Semua field password harus diisi")
      return false
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password baru harus minimal 8 karakter")
      return false
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Password baru dan konfirmasi password tidak cocok")
      return false
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      toast.error("Password baru tidak boleh sama dengan password saat ini")
      return false
    }

    return true
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleUpdate = async () => {
    try {
      setIsLoading(true)

      // Handle profile updates
      let updatedData = { ...formData }
      let newProfilePicture = formData.profile_picture

      if (formData.profile_picture instanceof File) {
        const uploadPromise = uploadFile(
          formData.profile_picture,
          "profile_pictures"
        )

        toast.promise(uploadPromise, {
          pending: "Mengunggah foto profil...",
          success: "Foto profil berhasil diunggah",
          error: "Gagal mengunggah foto profil",
        })

        const uploadResponse = await uploadPromise
        if (uploadResponse.status === "success") {
          newProfilePicture =
            uploadResponse.file_path ||
            uploadResponse.path ||
            uploadResponse.url
        } else {
          throw new Error("Gagal mengunggah foto profil")
        }
      }

      // Check if there are profile changes
      if (hasChanges()) {
        const dataToUpdate = {
          ...updatedData,
          profile_picture: newProfilePicture,
        }

        await updateUserProfile(
          dataToUpdate,
          async (response) => {
            toast.success("Profil berhasil diperbarui")
            if (response.data) {
              setFormData(response.data)
              await updateUserData()
            }
            if (previewImage) {
              URL.revokeObjectURL(previewImage)
              setPreviewImage(null)
            }
          },
          (error) => {
            toast.error(`Gagal memperbarui profil: ${error}`)
          }
        )
      }

      if (
        passwordData.currentPassword ||
        passwordData.newPassword ||
        passwordData.confirmPassword
      ) {
        if (validatePasswords()) {
          const userData = await fetchUserData()
          const updatePromise = updatePassword(userData.id, passwordData)

          toast.promise(updatePromise, {
            pending: "Memperbarui password...",
            success: "Password berhasil diperbarui",
            error: {
              render({ data }) {
                return `Gagal memperbarui password: ${data.message}`
              },
            },
          })

          await updatePromise
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          })
        }
      }
    } catch (error) {
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (
      !hasChanges() &&
      !passwordData.currentPassword &&
      !passwordData.newPassword &&
      !passwordData.confirmPassword
    ) {
      toast.info("Tidak ada perubahan untuk dibatalkan")
      return
    }

    setFormData({
      name: userData.name || "",
      username: userData.username || "",
      email: userData.email || "",
      role: userData.role || "",
      phone_number: userData.phone_number || "",
      profile_picture: userData.profile_picture || "",
    })

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })

    if (previewImage) {
      URL.revokeObjectURL(previewImage)
      setPreviewImage(null)
    }
    toast.info("Perubahan dibatalkan")
  }

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="px-4 space-y-6 md:px-6">
        <header className="space-y-1.5">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <img
                src={
                  previewImage ||
                  (formData.profile_picture
                    ? `http://localhost:8000/storage/${formData.profile_picture}`
                    : "/default-avatar.png")
                }
                alt="Avatar"
                width="96"
                height="96"
                className="border rounded-full"
                style={{ aspectRatio: "96/96", objectFit: "cover" }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-black rounded-full opacity-50"></div>
                <div className="relative flex gap-2">
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    title="Change Picture"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  {formData.profile_picture && (
                    <button
                      onClick={() => {
                        if (previewImage) {
                          URL.revokeObjectURL(previewImage)
                        }
                        setPreviewImage(null)
                        setFormData({ ...formData, profile_picture: "" })
                        toast.info("Foto profil dihapus")
                      }}
                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                      title="Remove Picture"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold">
                {formData.name || "User Name"}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {formData.role &&
                  formData.role.charAt(0).toUpperCase() +
                    formData.role.slice(1)}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={
                    formData.role
                      ? formData.role.charAt(0).toUpperCase() +
                        formData.role.slice(1)
                      : ""
                  }
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Change Password</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  value={passwordData.currentPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={passwordData.newPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={passwordData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex space-x-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleUpdate}
            disabled={isUpdating || isLoading}
          >
            {isLoading ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Account
