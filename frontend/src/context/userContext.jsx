import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"
import { fetchUserData } from "../components/Elements/Profile/profile.action"

const UserContext = createContext(null)

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState(null)

  const loadUserData = useCallback(async () => {
    const token = localStorage.getItem("token")

    if (!token) {
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
          if (typeof data.prodi === "object" && data.prodi._id) {
            prodiId = data.prodi._id
            prodi = data.prodi
            localStorage.setItem("prodi_id", prodiId)
          } else if (typeof data.prodi === "string") {
            prodiId = data.prodi
            localStorage.setItem("prodi_id", prodiId)
          }
        } else {
          localStorage.removeItem("prodi_id")
        }

        const userDataWithProdi = {
          ...data,
          prodi_id: prodiId,
          prodi: prodi,
        }

        setUserData(userDataWithProdi)
        localStorage.setItem("user", JSON.stringify(userDataWithProdi))
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      setError(error)
      setUserData(null)
      if (error?.response?.status === 401) {
        localStorage.clear()
        window.location.href = "/login"
      }
    } finally {
      setIsLoading(false)
    }
  }, []) // No dependencies to prevent recreation

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const clearUserData = useCallback(() => {
    setUserData(null)
    setError(null)
    localStorage.removeItem("user")
    localStorage.removeItem("prodi_id")
  }, [])

  const contextValue = {
    userData,
    isLoading,
    isUpdating,
    error,
    loadUserData,
    refetchUser: loadUserData,
    updateUserData: loadUserData,
    clearUserData,
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
