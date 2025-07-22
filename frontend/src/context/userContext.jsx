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
      console.log("Raw API response:", data)

      if (data) {
        localStorage.setItem("role", data.role)

        // Langsung gunakan data dari API tanpa modifikasi berlebihan
        let prodiId = null
        let prodiName = null

        // Cek apakah prodi ada dan berisi object
        if (data.prodi && typeof data.prodi === "object" && data.prodi.name) {
          prodiId = data.prodi.id || data.prodiId
          prodiName = data.prodi.name
          localStorage.setItem("prodi_id", prodiId)
        } else if (data.prodiId) {
          // Fallback ke prodiId saja
          prodiId = data.prodiId
          localStorage.setItem("prodi_id", prodiId)
          prodiName = "Default Prodi" // fallback sementara
        } else {
          localStorage.removeItem("prodi_id")
        }

        // Minimal processing - biarkan data asli tetap utuh
        const processedUserData = {
          ...data, // gunakan semua data asli dari API
          prodi_id: prodiId,
          prodi_name: prodiName,
          // TIDAK override data.prodi yang sudah benar dari API
        }

        console.log("Processed userData:", processedUserData)
        setUserData(processedUserData)
        localStorage.setItem("user", JSON.stringify(processedUserData))
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
  }, [])

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
