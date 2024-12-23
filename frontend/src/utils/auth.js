import { jwtDecode } from "jwt-decode"

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

export const getUserRole = () => {
  try {
    const userData = localStorage.getItem("userData")
    if (!userData) return null
    const { role } = JSON.parse(userData)
    return role || null
  } catch {
    return null
  }
}

export const hasRole = (allowedRoles) => {
  const userRole = getUserRole()
  return userRole && allowedRoles.includes(userRole)
}
