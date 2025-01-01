import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Button from "../Button/index"
import InputForm from "../Input/index"
import { updatePassword, fetchUserData } from "./profile.action"

// eslint-disable-next-line react/prop-types
const SigninSecurity = ({ title = "Sign in & Security", headingIcon }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")

  const validatePasswords = () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setError("Semua field password harus diisi")
      return false
    }

    if (passwordData.newPassword.length < 8) {
      setError("Password baru harus minimal 8 karakter")
      return false
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Password baru dan konfirmasi password tidak cocok")
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
    setError("") 
  }

  const handleCancel = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setError("")
  }

  const handleUpdate = async () => {
    if (!validatePasswords()) {
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const userData = await fetchUserData()
      await updatePassword(userData.id, passwordData)

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      alert("Password berhasil diupdate")
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-96 h-screen pt-20 transition-transform bg-graybackground border-gray">
      <div className="fixed mt-8 h-[800px] w-[1250px] px-7 pb-4 overflow-y-auto bg-white shadow-lg rounded-lg ml-[-620px]">
        <div className="mt-5 flex items-center space-x-3">
          {headingIcon && <FontAwesomeIcon icon={headingIcon} />}
          <h2 className="text-3xl font-semibold">{title}</h2>
        </div>

        {error && (
          <div className="mt-4 ml-8 w-80 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

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
  )
}

export default SigninSecurity
