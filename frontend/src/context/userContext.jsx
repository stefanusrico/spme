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

        // Safe handling untuk prodi - bisa null untuk admin
        let prodiId = null
        let prodi = null

        if (data.prodi) {
          prodi = data.prodi
          // Check if prodi has id property and it's not null
          if (data.prodi.id !== null && data.prodi.id !== undefined) {
            prodiId = data.prodi.id
            localStorage.setItem("prodi_id", prodiId.toString())
          } else {
            // Remove prodi_id from localStorage if null (untuk admin)
            localStorage.removeItem("prodi_id")
          }
        } else {
          // Remove prodi_id from localStorage if prodi object doesn't exist
          localStorage.removeItem("prodi_id")
        }

        setUserData({
          id: data.id || "",
          name: data.name || "Unknown",
          username: data.username || "",
          email: data.email || "No email",
          role: data.role || "User",
          phone_number: data.phone_number || "",
          profile_picture: data.profile_picture || "",
          jurusan: data.jurusan || "",
          prodi: prodi, // Could be null for admin
          prodiId: prodiId, // Could be null for admin
        })

        localStorage.setItem("user", JSON.stringify(data))

        console.log("Fetched user data:", {
          ...data,
          prodiId: prodiId,
          hasProdi: !!prodi,
        })
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      setError(error)
      setUserData(null)
      if (error?.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("role")
        localStorage.removeItem("prodi_id")
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
      localStorage.removeItem("user")
      localStorage.removeItem("prodi_id")
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
