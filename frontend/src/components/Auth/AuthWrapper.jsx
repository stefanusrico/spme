import { Navigate, Outlet } from "react-router-dom"

const AuthWrapper = ({ isProtected = false }) => {
  const token = localStorage.getItem("token")
  const role = localStorage.getItem("role")

  if (!isProtected) {
    if (token) {
      const dashboardPath = "dashboard"
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
