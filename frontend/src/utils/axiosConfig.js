import axios from "axios"
import { jwtDecode } from "jwt-decode"

const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/api/",
})

export const isTokenExpired = (token) => {
  if (!token) return true

  try {
    const decoded = jwtDecode(token)
    // console.log("decoded:", decoded)
    const currentTime = Date.now() / 1000
    // console.log("currentTime:", currentTime)
    return decoded.exp < currentTime
  } catch (error) {
    console.error("Error decoding token:", error)
    return true
  }
}

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")

    if (token) {
      if (isTokenExpired(token) && config.url !== "/logout") {
        const currentPath = window.location.pathname
        if (
          currentPath !== "/login" &&
          currentPath !== "/register" &&
          currentPath !== "/"
        ) {
          localStorage.clear()
          window.location.href = "/login"
        }
        return Promise.reject(new Error("Token expired"))
      }
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

export default axiosInstance
