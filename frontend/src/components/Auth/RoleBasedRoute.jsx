/* eslint-disable react/prop-types */
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { isAuthenticated, getUserRole } from "../../utils/auth"
import Loader from "../../pages/loader"

const RoleBasedRoute = ({ allowedRoles }) => {
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const authenticated = isAuthenticated()
  const location = useLocation()

  useEffect(() => {
    const fetchRole = async () => {
      if (authenticated) {
        const role = await getUserRole()
        setUserRole(role)
      }
      setLoading(false)
    }
    fetchRole()
  }, [authenticated])

  if (loading) {
    return <Loader />
  }

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!allowedRoles.includes(userRole)) {
    return userRole === "admin" ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <Navigate to="/dash" replace />
    )
  }

  return <Outlet />
}

export default RoleBasedRoute
