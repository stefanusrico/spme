/* eslint-disable react/prop-types */
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { isAuthenticated, hasRole, getUserRole } from "../../utils/auth"

const RoleBasedRoute = ({ allowedRoles }) => {
  const location = useLocation()
  const authenticated = isAuthenticated()
  const userHasRole = hasRole(allowedRoles)
  const userRole = getUserRole()

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!userHasRole) {
    if (userRole === "admin") {
      return <Navigate to="/dashboard" replace />
    }
    if (userRole === "Ketua Program Studi") {
      return <Navigate to="/dash" replace />
    }
  }

  return <Outlet />
}

export default RoleBasedRoute
