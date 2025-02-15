// userContext.js
import { createContext, useState, useContext, useEffect } from "react"
import { fetchUserData } from "../components/Elements/Profile/profile.action"

const UserContext = createContext(null)

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState(null)

  const loadUserData = async () => {
    if (!localStorage.getItem("token")) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchUserData()
      if (data) {
        localStorage.setItem("role", data.role)

        setUserData({
          name: data.name || "Unknown",
          username: data.username || "",
          email: data.email || "No email",
          role: data.role || "User",
          phone_number: data.phone_number || "",
          profile_picture: data.profile_picture || "",
          jurusan: data.jurusan || "",
        })
      }
    } catch (error) {
      setError(error)
      setUserData(null)
      if (error?.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("role")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  const contextValue = {
    userData,
    isLoading,
    isUpdating,
    error,
    loadUserData,
    updateUserData: loadUserData,
    clearUserData: () => {
      setUserData(null)
      setError(null)
    },
  }

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === null) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
