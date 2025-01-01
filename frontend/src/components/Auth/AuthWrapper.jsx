/* eslint-disable react/prop-types */
import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { isAuthenticated, getUserRole } from "../../utils/auth"
import Loader from "../../pages/loader"

const AuthWrapper = ({ isProtected = false }) => {
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
