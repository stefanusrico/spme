import { useEffect, useState, memo } from "react"
import PropTypes from "prop-types"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { isAuthenticated } from "../../utils/auth"
import Layout from "../../layout"
import { useUser } from "../../context/userContext"
import NotFound from "../../pages/404"

const RoleBasedRoute = memo(
  ({ allowedRoles = [], roleComponents = {}, sharedComponents = {} }) => {
    const { userData, isLoading, error, loadUserData } = useUser()
    const location = useLocation()
    const navigate = useNavigate()

    const [showNotFound, setShowNotFound] = useState(false)
    const [authChecked, setAuthChecked] = useState(false)
    const [userDataLoaded, setUserDataLoaded] = useState(false)

    const authenticated = isAuthenticated()
    const immediateRole = localStorage.getItem("role")

    // Check authentication on mount and location change
    useEffect(() => {
      const checkAuth = async () => {
        if (!authenticated) {
          setAuthChecked(true)
          return
        }

        // If no user data but token exists, try to load user data
        if (!userData && !isLoading && authenticated && !userDataLoaded) {
          try {
            setUserDataLoaded(true) // Prevent multiple calls
            await loadUserData()
          } catch (err) {
            console.error("Failed to load user data:", err)
            setUserDataLoaded(false) // Reset on error
          }
        }

        setAuthChecked(true)
      }

      checkAuth()
    }, [authenticated, userData, isLoading, userDataLoaded]) // Remove loadUserData from dependencies

    useEffect(() => {
      let redirectTimer

      if (authChecked && authenticated) {
        const userRole = userData?.role || immediateRole
        const hasAllowedRole =
          allowedRoles.length === 0 || allowedRoles.includes(userRole)

        if (!hasAllowedRole && userRole) {
          // Only check if we have a role
          setShowNotFound(true)
          redirectTimer = setTimeout(() => {
            const defaultPath = "/dashboard"
            setShowNotFound(false)
            navigate(defaultPath, { replace: true })
          }, 2000)
        } else {
          setShowNotFound(false)
        }
      }

      return () => {
        if (redirectTimer) {
          clearTimeout(redirectTimer)
        }
      }
    }, [
      authChecked,
      authenticated,
      userData?.role,
      immediateRole,
      allowedRoles,
      navigate,
    ])

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

      // Handle role-based components
      if (Object.keys(roleComponents).length > 0) {
        const RoleComponent = roleComponents[userRole]
        if (RoleComponent) {
          return <RoleComponent />
        }
      }

      // Handle shared components
      if (Object.keys(sharedComponents).length > 0) {
        const currentPath = location.pathname
        const pathSegments = currentPath.split("/").filter(Boolean)
        const lastSegment = pathSegments[pathSegments.length - 1]

        const SharedComponent = sharedComponents[lastSegment]
        if (SharedComponent) {
          return <SharedComponent />
        }
      }

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
