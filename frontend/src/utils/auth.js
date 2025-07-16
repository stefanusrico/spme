import { jwtDecode } from "jwt-decode"
import { fetchUserData } from "../components/Elements/Profile/profile.action"
import axiosInstance from "../utils/axiosConfig"

export const isAuthenticated = () => {
  const token = localStorage.getItem("token")

  if (!token) return false

  try {
    const decoded = jwtDecode(token)
    const currentTime = Date.now() / 1000
    // Add buffer time (5 minutes) to prevent edge cases
    return decoded.exp > currentTime + 300
  } catch (error) {
    console.error("Error decoding token:", error)
    // Clear invalid token
    localStorage.removeItem("token")
    return false
  }
}

export const getAuthenticatedUser = async () => {
  try {
    if (!isAuthenticated()) {
      throw new Error("Token not valid")
    }

    const response = await axiosInstance.get("auth/user") // Ubah dari "user" ke "auth/user"
    console.log("Fetched user data:", response.data)
    return response.data
  } catch (error) {
    console.error("Error fetching authenticated user:", error)
    // If 401, clear storage and redirect
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = "/login"
    }
    return null
  }
}

export const getUserRole = async () => {
  try {
    // First check if user data exists in localStorage
    const cachedUser = localStorage.getItem("user")
    if (cachedUser) {
      const userData = JSON.parse(cachedUser)
      if (userData.role) return userData.role
    }

    // If no cached data, fetch from API
    const userData = await fetchUserData()
    if (!userData || !userData.role) {
      console.warn("User data or role not found")
      return localStorage.getItem("role") // Fallback to stored role
    }

    const role = userData.role
    console.log("Role fetched successfully:", role)
    return role || null
  } catch (error) {
    console.error("Error in getUserRole:", error)
    return localStorage.getItem("role") // Fallback to stored role
  }
}

export const hasRole = async (allowedRoles) => {
  const userRole = await getUserRole()
  return userRole && allowedRoles.includes(userRole)
}

// Add token refresh function
export const refreshToken = async () => {
  try {
    const response = await axiosInstance.post("/refresh")
    const { token } = response.data
    localStorage.setItem("token", token)
    return token
  } catch (error) {
    console.error("Token refresh failed:", error)
    localStorage.clear()
    window.location.href = "/login"
    return null
  }
}
