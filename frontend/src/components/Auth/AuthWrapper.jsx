import { Navigate, Outlet } from "react-router-dom"
import { isAuthenticated } from "../../utils/auth"

// eslint-disable-next-line react/prop-types
const AuthWrapper = ({ isProtected = false }) => {
  const authenticated = isAuthenticated()

  if (isProtected && !authenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isProtected && authenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AuthWrapper
