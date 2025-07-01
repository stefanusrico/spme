import axiosInstance from "../../utils/axiosConfig"

export const handleLogin = async (
  e,
  rememberMe,
  setError,
  navigate,
  loadUserData
) => {
  e.preventDefault()
  const email = e.target.email.value
  const password = e.target.password.value

  if (!email || !password) {
    setError("Email and password are required")
    return
  }

  try {
    const response = await axiosInstance.post("/login", { email, password })
    const { token, role, access } = response.data

    localStorage.setItem("token", token)
    localStorage.setItem("email", email)
    localStorage.setItem("role", role)
    localStorage.setItem("access", JSON.stringify(access))

    if (rememberMe) {
      localStorage.setItem("rememberMe", true)
    } else {
      localStorage.removeItem("rememberMe")
    }

    // Load user data akan handle prodi_id dengan safe checking
    await loadUserData()
    navigate("/dashboard")
  } catch (error) {
    console.error("Login failed:", error)
    setError(error.response?.data?.message || "Invalid email or password")
  }
}

let isLoggingOut = false

export const handleLogout = async () => {
  if (isLoggingOut) return
  isLoggingOut = true

  try {
    const token = localStorage.getItem("token")

    if (
      !token &&
      (window.location.pathname === "/login" ||
        window.location.pathname === "/register" ||
        window.location.pathname === "/")
    ) {
      isLoggingOut = false
      return
    }

    if (token) {
      try {
        await axiosInstance.post("/logout")
      } catch (error) {
        console.log("Logout API error:", error.message)
      }
    }

    cleanupStorage()
    redirectToLogin()
  } finally {
    isLoggingOut = false
  }
}

const cleanupStorage = () => {
  localStorage.removeItem("email")
  localStorage.removeItem("token")
  localStorage.removeItem("access")
  localStorage.removeItem("rememberMe")
  localStorage.removeItem("role")
  localStorage.removeItem("user")
  localStorage.removeItem("prodi_id") // Clean up prodi_id too
}

const redirectToLogin = () => {
  window.location.href = "/login"
}
