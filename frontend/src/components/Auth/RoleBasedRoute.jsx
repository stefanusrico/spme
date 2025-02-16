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
            const defaultPath =
              userRole === "Admin" ? "/dashboard" : "/dashboard"
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

    if (isLoading && !immediateRole) return <Loader />

    if (!authenticated) {
      return (
        <Navigate to="/login" state={{ from: location.pathname }} replace />
      )
    }

    if (error) {
      console.error("Error in RoleBasedRoute:", error)
      return <Navigate to="/login" replace />
    }

    if (showNotFound) {
      return <NotFound />
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

RoleBasedRoute.displayName = "RoleBasedRoute"

export default RoleBasedRoute
