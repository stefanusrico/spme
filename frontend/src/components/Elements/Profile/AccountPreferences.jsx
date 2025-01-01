/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Button from "../Button/index"
import InputForm from "../Input/index"
import { updateUserProfile, fetchUserData, uploadFile } from "./profile.action"

const AccountPreferences = ({ title = "Account Preferences", headingIcon }) => {
  const fileInputRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState({
    name: "",
    username: "",
    email: "",
    role: "",
    phone_number: "",
    profile_picture: "",
  })
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await fetchUserData()
        setUserData({
          name: data.name || "",
          username: data.username || "",
          email: data.email || "",
          role: data.role || "",
          phone_number: data.phone_number || "",
          profile_picture: data.profile_picture || "",
        })
      } catch (error) {
        console.error("Failed to fetch user data:", error)
        alert("Gagal memuat data pengguna")
      }
    }
    loadUserData()
  }, [])

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
      setUserData({ ...userData, profile_picture: file })
    }
  }

  const handleUpdate = async () => {
    try {
      setIsLoading(true)

      if (!userData.name || !userData.email || !userData.username) {
        alert("Nama, email, dan username harus diisi")
        return
      }

      let updatedData = { ...userData }
      let newProfilePicture = userData.profile_picture

      if (userData.profile_picture instanceof File) {
        console.log("New file detected:", userData.profile_picture)

        const uploadResponse = await uploadFile(
          userData.profile_picture,
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
      }

      const dataToUpdate = {
        ...updatedData,
        profile_picture: newProfilePicture,
      }

      console.log("Final data to update:", dataToUpdate)

      await updateUserProfile(
        dataToUpdate,
        (response) => {
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

  const onSuccess = (response) => {
    console.log("Success handler response:", response)
    alert("Profil berhasil diperbarui")

    if (response.data) {
      setUserData(response.data)
    }

    if (previewImage) {
      URL.revokeObjectURL(previewImage)
      setPreviewImage(null)
    }
  }

  const onError = (error) => {
    alert(`Gagal memperbarui profil: ${error}`)
  }

  const handleCancel = () => {
    const loadUserData = async () => {
      try {
        const data = await fetchUserData()
        setUserData({
          name: data.name || "",
          username: data.username || "",
          email: data.email || "",
          role: data.role || "",
          phone_number: data.phone_number || "",
          profile_picture: data.profile_picture || "",
        })
        setPreviewImage(null)
        if (previewImage) {
          URL.revokeObjectURL(previewImage)
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
        alert("Gagal memuat data pengguna")
      }
    }
    loadUserData()
  }

  return (
    <div className="w-96 h-screen pt-20 transition-transform bg-graybackground border-gray">
      <div className="fixed mt-8 h-[800px] w-[1250px] px-7 pb-4 overflow-y-auto bg-white shadow-lg rounded-lg ml-[-620px]">
        <div className="mt-5 flex items-center space-x-3">
          {headingIcon && <FontAwesomeIcon icon={headingIcon} />}
          <h2 className="text-3xl font-semibold">{title}</h2>
        </div>
        <div className="mt-8 ml-8 flex items-center space-x-8">
          <img
            src={
              previewImage ||
              (userData.profile_picture
                ? `http://localhost:8000/storage/${userData.profile_picture}`
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
                setUserData({ ...userData, profile_picture: "" })
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
              value={userData.name}
              onChange={(e) =>
                setUserData({ ...userData, name: e.target.value })
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
              value={userData.email}
              onChange={(e) =>
                setUserData({ ...userData, email: e.target.value })
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
                userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
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
              value={userData.username}
              onChange={(e) =>
                setUserData({ ...userData, username: e.target.value })
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
              value={userData.phone_number}
              onChange={(e) =>
                setUserData({ ...userData, phone_number: e.target.value })
              }
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="mt-10 ml-8 flex justify-start space-x-4">
          <Button
            className="bg-primary"
            aria-label="Cancel"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary"
            aria-label="Update"
            onClick={handleUpdate}
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AccountPreferences
