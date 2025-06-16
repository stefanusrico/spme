import { jwtDecode } from "jwt-decode"
import { fetchUserData } from "../components/Elements/Profile/profile.action"
import axiosInstance from "../utils/axiosConfig"

export const isAuthenticated = () => {
  const token = localStorage.getItem("token")

  if (!token) return false

  try {
    const decoded = jwtDecode(token)
    const currentTime = Date.now() / 1000
    return decoded.exp > currentTime
  } catch (error) {
    console.error("Error decoding token:", error)
    return false
  }
}

export const getAuthenticatedUser = async () => {
  try {
    const response = await axiosInstance.get("auth/user")
    console.log("Fetched user data:", response.data)
    return response.data
  } catch (error) {
    console.error("Error fetching authenticated user:", error)
    return null
  }
}

export const getUserRole = async () => {
  try {
    const userData = await fetchUserData()
    if (!userData || !userData.role) {
      console.warn("User data or role not found")
      return null
    }

    const role = userData.role
    console.log("Role fetched successfully:", role)
    return role || null
  } catch (error) {
    console.error("Error in getUserRole:", error)
    return null
  }
}

export const hasRole = (allowedRoles) => {
  const userRole = getUserRole()
  return userRole && allowedRoles.includes(userRole)
}

//auth