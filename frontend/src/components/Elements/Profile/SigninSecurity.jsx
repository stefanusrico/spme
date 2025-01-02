import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { ToastContainer, toast } from "react-toastify"
import Button from "../Button/index"
import InputForm from "../Input/index"
import { updatePassword, fetchUserData } from "./profile.action"
import "react-toastify/dist/ReactToastify.css"

// eslint-disable-next-line react/prop-types
const SigninSecurity = ({ title = "Sign in & Security", headingIcon }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

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

  const handleCancel = () => {
    if (
      passwordData.currentPassword ||
      passwordData.newPassword ||
      passwordData.confirmPassword
    ) {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      toast.info("Perubahan dibatalkan")
    } else {
      toast.info("Tidak ada perubahan untuk dibatalkan")
    }
  }

  const handleUpdate = async () => {
    if (!validatePasswords()) {
      return
    }

    try {
      setIsLoading(true)

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
    } catch (error) {
      console.error("Password update error:", error)
    } finally {
      setIsLoading(false)
    }
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
        style={{marginTop: "65px"}}
      />
      <div className="w-96 h-screen pt-20 transition-transform bg-graybackground border-gray">
        <div className="fixed mt-8 h-[800px] w-[1250px] px-7 pb-4 overflow-y-auto bg-white shadow-lg rounded-lg ml-[-620px]">
          <div className="mt-5 flex items-center space-x-3">
            {headingIcon && <FontAwesomeIcon icon={headingIcon} />}
            <h2 className="text-3xl font-semibold">{title}</h2>
          </div>

          <div className="mt-10 ml-8 flex w-80 flex-col">
            <InputForm
              label="Current password"
              type="password"
              placeholder="Current password"
              name="currentPassword"
              classname="w-80"
              value={passwordData.currentPassword}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
            <InputForm
              label="New password"
              type="password"
              placeholder="New password"
              name="newPassword"
              classname="w-80"
              value={passwordData.newPassword}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
            <InputForm
              label="Re-type new password"
              type="password"
              placeholder="Re-type new password"
              name="confirmPassword"
              classname="w-80"
              value={passwordData.confirmPassword}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
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
    </>
  )
}

export default SigninSecurity
