import { useEffect, useState, memo } from "react"
import PropTypes from "prop-types"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { isAuthenticated } from "../../utils/auth"
import Loader from "../../pages/loader"
import Layout from "../../layout"
import { useUser } from "../../context/userContext"
import NotFound from "../../pages/404"

const RoleBasedRoute = memo(
  ({ allowedRoles = [], roleComponents = {}, sharedComponents = {} }) => {
    const { userData, isLoading, error } = useUser()
    const authenticated = isAuthenticated()
    const location = useLocation()
    const navigate = useNavigate()

    const [showNotFound, setShowNotFound] = useState(false)
    const immediateRole = localStorage.getItem("role")

    useEffect(() => {
      let redirectTimer

      if (!isLoading && userData && authenticated) {
        const userRole = userData.role || userData.roles?.[0]
        const hasAllowedRole = allowedRoles.includes(userRole)

        if (!hasAllowedRole) {
          setShowNotFound(true)
          redirectTimer = setTimeout(() => {
            const defaultPath = "/dashboard"
            setShowNotFound(false)
            navigate(defaultPath, { replace: true })
          }, 2000)
        }
      }
      return () => {
        if (redirectTimer) {
          clearTimeout(redirectTimer)
        }
      }
    }, [userData, isLoading, authenticated, allowedRoles, navigate])

    useEffect(() => {
      setShowNotFound(false)
    }, [location.pathname])

    // Loading state
    if (isLoading && !immediateRole) return <Loader />

    // Authentication check
    if (!authenticated) {
      return (
        <Navigate to="/login" state={{ from: location.pathname }} replace />
      )
    }

    // Error handling
    if (error) {
      console.error("Error in RoleBasedRoute:", error)
      return <Navigate to="/login" replace />
    }

    // Show not found if user doesn't have permission
    if (showNotFound) {
      return <NotFound />
    }

    const renderContent = () => {
      const userRole = userData?.role || immediateRole

      // Handle role-based components (untuk dashboard dan routes khusus)
      if (Object.keys(roleComponents).length > 0) {
        const RoleComponent = roleComponents[userRole]
        if (RoleComponent) {
          return <RoleComponent />
        }
      }

      // Handle shared components (jika ada)
      if (Object.keys(sharedComponents).length > 0) {
        const currentPath = location.pathname
        const pathSegments = currentPath.split("/").filter(Boolean)
        const lastSegment = pathSegments[pathSegments.length - 1]

        const SharedComponent = sharedComponents[lastSegment]
        if (SharedComponent) {
          return <SharedComponent />
        }
      }

      // Default: render children routes via Outlet
      return <Outlet />
    }

    return <Layout>{renderContent()}</Layout>
  }
)

RoleBasedRoute.displayName = "RoleBasedRoute"

RoleBasedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  roleComponents: PropTypes.object,
  sharedComponents: PropTypes.object,
}

export default RoleBasedRoute
