/* eslint-disable react/prop-types */
import { useState, useRef } from "react"
import { ToastContainer, toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Button from "../Button/index"
import InputForm from "../Input/index"
import { updateUserProfile, uploadFile } from "./profile.action"
import "react-toastify/dist/ReactToastify.css"
import { useUser } from "../../../context/userContext"

const AccountPreferences = ({ title = "Account Preferences", headingIcon }) => {
  const fileInputRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const { userData, updateUserData, isUpdating } = useUser()
  const [formData, setFormData] = useState({
    name: userData.name || "",
    username: userData.username || "",
    email: userData.email || "",
    role: userData.role || "",
    phone_number: userData.phone_number || "",
    profile_picture: userData.profile_picture || "",
  })
  const [previewImage, setPreviewImage] = useState(null)

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

  const hasChanges = () => {
    if (formData.profile_picture instanceof File) return true

    if (userData.profile_picture && !formData.profile_picture) return true

    const fieldsToCompare = ["name", "username", "email", "phone_number"]
    return fieldsToCompare.some((field) => userData[field] !== formData[field])
  }

  const handleUpdate = async () => {
    try {
      if (!hasChanges()) {
        toast.info("Tidak ada perubahan untuk disimpan")
        return
      }

      setIsLoading(true)

      if (!formData.name || !formData.email || !formData.username) {
        toast.warning("Nama, email, dan username harus diisi")
        return
      }

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

      const dataToUpdate = {
        ...updatedData,
        profile_picture: newProfilePicture,
      }

      await updateUserProfile(
        dataToUpdate,
        async (response) => {
          console.log("Update success response:", response)
          onSuccess(response)
        },
        (error) => {
          console.error("Update error:", error)
          onError(error)
        }
      )
    } catch (error) {
      console.error("Handle update error:", error)
      onError(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  const onSuccess = async (response) => {
    toast.success("Profil berhasil diperbarui")

    if (response.data) {
      setFormData(response.data)
      await updateUserData()
    }

    if (previewImage) {
      URL.revokeObjectURL(previewImage)
      setPreviewImage(null)
    }
  }

  const onError = (error) => {
    toast.error(`Gagal memperbarui profil: ${error}`)
  }

  const handleCancel = () => {
    if (!hasChanges()) {
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

    if (previewImage) {
      URL.revokeObjectURL(previewImage)
      setPreviewImage(null)
    }
    toast.info("Perubahan dibatalkan")
  }

  return (
    <>
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
        style={{ marginTop: "65px" }}
      />
      <div className="w-full flex h-screen pt-20 transition-transform bg-white border-gray">
        <div className="w-full mt-8 px-7 pb-4 overflow-y-auto bg-white shadow-xl rounded-lg">
          <div className="mt-5 flex items-center space-x-3">
            {headingIcon && <FontAwesomeIcon icon={headingIcon} />}
            <h2 className="text-3xl font-semibold">{title}</h2>
          </div>
          <div className="mt-8 ml-8 flex items-center space-x-8">
            <img
              src={
                previewImage ||
                (formData.profile_picture
                  ? `http://localhost:8000/storage/${formData.profile_picture}`
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
                className="bg-base w-36 text-white"
                onClick={() => fileInputRef.current.click()}
                aria-label="Change"
                disabled={isLoading}
              >
                Change
              </Button>
              <Button
                className="bg-base w-36 text-white"
                onClick={() => {
                  if (previewImage) {
                    URL.revokeObjectURL(previewImage)
                  }
                  setPreviewImage(null)
                  setFormData({ ...formData, profile_picture: "" })
                  toast.info("Foto profil dihapus")
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
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isLoading}
                required
              />
              <InputForm
                label="Email"
                type="email"
                placeholder="example@email.com"
                name="email"
                classname="w-80"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={isLoading}
                required
              />
              <InputForm
                label="Role"
                type="text"
                placeholder="Admin"
                name="role"
                classname="w-80"
                disabled={true}
                value={
                  formData.role.charAt(0).toUpperCase() + formData.role.slice(1)
                }
              />
            </div>
            <div className="mt-10 ml-10 flex flex-col">
              <InputForm
                label="Username"
                type="text"
                placeholder="Mon"
                name="username"
                classname="w-80"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={isLoading}
                required
              />
              <InputForm
                label="Phone number"
                type="tel"
                placeholder="0821313532"
                name="phoneNumber"
                classname="w-80"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="mt-10 ml-8 flex justify-start space-x-4">
            <Button
              className="bg-base"
              aria-label="Cancel"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-base"
              aria-label="Update"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AccountPreferences
