import axiosInstance from "../../../utils/axiosConfig"

export const uploadFile = async (file, directory) => {
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("directory", directory)

    console.log("Uploading file:", file)
    console.log("To directory:", directory)

    const response = await axiosInstance.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    console.log("Upload response:", response.data)
    return response.data
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

export const updateUserProfile = async (data, onSuccess, onError) => {
  try {
    const userData = await fetchUserData()
    const userId = userData.id

    console.log("Updating profile with data:", data)

    const updatePayload = {
      name: data.name,
      username: data.username,
      email: data.email,
      phone_number: data.phone_number,
      profile_picture: data.profile_picture,
    }

    console.log("Update payload:", updatePayload)

    const response = await axiosInstance.put(`/users/${userId}`, updatePayload)
    console.log("Update response:", response.data)

    if (response.data.status === "success") {
      onSuccess(response.data)
    } else {
      onError(response.data.message)
    }
  } catch (error) {
    console.error("Update error:", error)
    onError(error.response?.data?.message || "Terjadi kesalahan.")
  }
}

export const updatePassword = async (userId, passwordData) => {
  try {
    const response = await axiosInstance.put(`/users/password/${userId}`, {
      current_password: passwordData.currentPassword,
      password: passwordData.newPassword,
      password_confirmation: passwordData.confirmPassword,
    })

    return response.data
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      "Terjadi kesalahan saat mengupdate password"
    throw new Error(errorMessage)
  }
}

export const fetchUserData = async () => {
  try {
    const response = await axiosInstance.get("/user")
    console.log("Fetched user data:", response.data)
    return response.data
  } catch (error) {
    console.error("Error fetching user data:", error)
    throw error
  }
}
