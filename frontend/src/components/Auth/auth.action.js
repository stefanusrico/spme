import axiosInstance from "../../utils/axiosConfig"

export const handleLogin = async (e, rememberMe, setError, navigate) => {
  e.preventDefault()
  const email = e.target.email.value
  const password = e.target.password.value

  if (!email || !password) {
    setError("Email and password are required")
    return
  }

  try {
    const response = await axiosInstance.post("/login", { email, password })
    const { token } = response.data

    localStorage.setItem("token", token)
    localStorage.setItem("email", email)

    if (rememberMe) {
      localStorage.setItem("rememberMe", true)
    } else {
      localStorage.removeItem("rememberMe")
    }

    const userResponse = await axiosInstance.get("/user")
    const { name, role } = userResponse.data
    localStorage.setItem("userData", JSON.stringify({ name, email, role }))

    if (role === "admin") {
      navigate("/dashboard")
    } else if (role === "Ketua Program Studi") {
      navigate("/dash")
    }
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
    const currentPath = window.location.pathname

    if (
      !token &&
      (currentPath === "/login" ||
        currentPath === "/register" ||
        currentPath === "/")
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
  localStorage.removeItem("userData")
  localStorage.removeItem("rememberMe")
}

const redirectToLogin = () => {
  const currentPath = window.location.pathname
  if (
    currentPath !== "/login" &&
    currentPath !== "/register" &&
    currentPath !== "/"
  ) {
    window.location.href = "/login"
  }
}

export const getUserData = async (setUserData) => {
  const token = localStorage.getItem("token")
  const currentPath = window.location.pathname

  if (
    !token &&
    (currentPath === "/login" ||
      currentPath === "/register" ||
      currentPath === "/")
  ) {
    return
  }

  try {
    const response = await axiosInstance.get("/user")
    const { name, email, role } = response.data
    setUserData({ name, email, role })
  } catch (error) {
    console.error("Error fetching user data:", error)
    if (error.response?.status === 401) {
      handleLogout()
    }
  }
}