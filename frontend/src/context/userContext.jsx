import { createContext, useState, useContext, useEffect } from "react"
import { fetchUserData } from "../components/Elements/Profile/profile.action"

const UserContext = createContext()

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState(null)

  const loadUserData = async () => {
    if (!localStorage.getItem("token")) return
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchUserData()
      if (data) {
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
      }
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserData = async () => {
    setIsUpdating(true)
    try {
      const data = await fetchUserData()
      if (data) {
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
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  return (
    <UserContext.Provider
      value={{
        userData,
        isLoading,
        isUpdating,
        error,
        updateUserData,
        clearUserData: () => {
          setUserData(null)
          setError(null)
        },
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
