import { Navigate, Outlet } from "react-router-dom"

const AuthWrapper = ({ isProtected = false }) => {
  const token = localStorage.getItem("token")

  if (!isProtected) {
    if (token) {
      const role = localStorage.getItem("role")
      const dashboardPath = role === "Admin" ? "/dashboard" : "/dashboard"
      return <Navigate to={dashboardPath} replace />
    }
    return <Outlet />
  }

  if (isProtected && !token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default AuthWrapper

//auth