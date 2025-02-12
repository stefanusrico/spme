import { useEffect, memo } from "react"
import PropTypes from "prop-types"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { isAuthenticated } from "../../utils/auth"
import Loader from "../../pages/loader"
import Layout from "../../layout"
import { useUser } from "../../context/userContext"

const RoleBasedRoute = memo(
  ({ allowedRoles = [], roleComponents = {}, sharedComponents = {} }) => {
    const { userData, isLoading, error } = useUser()
    const authenticated = isAuthenticated()
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
      if (!isLoading && userData && authenticated) {
        const userRole = userData.role || userData.roles?.[0]
        const hasAllowedRole = allowedRoles.includes(userRole)

        if (!hasAllowedRole) {
          const defaultPath =
            userRole === "Admin" ? "/dashboard" : "/unauthorized"
          navigate(defaultPath, { replace: true })
        }
      }
    }, [userData, isLoading, authenticated, allowedRoles, navigate])

    if (isLoading) return <Loader />

    if (!authenticated) {
      return (
        <Navigate to="/login" state={{ from: location.pathname }} replace />
      )
    }

    if (error) {
      console.error("Error in RoleBasedRoute:", error)
      return <Navigate to="/login" replace />
    }

    const renderContent = () => {
      const currentPath = location.pathname
      const pathSegments = currentPath.split("/").filter(Boolean)

      if (sharedComponents) {
        const sharedComponentKey = pathSegments[pathSegments.length - 1]
        const SharedComponent = sharedComponents[sharedComponentKey]
        if (SharedComponent) {
          return <SharedComponent />
        }
      }

      if (
        currentPath === "/dashboard" &&
        Object.keys(roleComponents).length > 0
      ) {
        const userRole = userData?.role
        const SpecificComponent = roleComponents[userRole]
        if (SpecificComponent) {
          return <SpecificComponent />
        }
      }

      return <Outlet />
    }

    return <Layout>{renderContent()}</Layout>
  }
)

RoleBasedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  roleComponents: PropTypes.objectOf(PropTypes.elementType),
  sharedComponents: PropTypes.objectOf(PropTypes.elementType),
}

RoleBasedRoute.displayName = "RoleBasedRoute"

export default RoleBasedRoute

// update role based route