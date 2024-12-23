/* eslint-disable react/prop-types */
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { isAuthenticated, getUserRole } from "../../utils/auth"

const AuthWrapper = ({ isProtected = false }) => {
  const authenticated = isAuthenticated()
  const userRole = getUserRole()
  const location = useLocation()

  if (
    !isProtected &&
    authenticated &&
    ["/", "/login"].includes(location.pathname)
  ) {
    if (userRole === "admin") {
      return <Navigate to="/dashboard" replace />
    }
    if (userRole === "Ketua Program Studi") {
      return <Navigate to="/dash" replace />
    }
  }

  if (isProtected && !authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

export default AuthWrapper
