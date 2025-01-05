import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import LoginPage from "./pages/login"
import RegisterPage from "./pages/register"
import ErrorPage from "./pages/404"
import AuthWrapper from "./components/Auth/AuthWrapper"
import RoleBasedRoute from "./components/Auth/RoleBasedRoute"
import DashboardAdmin from "./pages/DashboardAdmin"
import App from "./App"
import TestingPage from "./pages/testing"
import UserManagement from "./pages/userManagement"
import EditUser from "./components/Fragments/manageUser/edit"
import EditRole from "./components/Fragments/managePermission/edit"
import AddUser from "./components/Fragments/manageUser/add"
import AddPermission from "./components/Fragments/managePermission/add"
import { isTokenExpired } from "./utils/axiosConfig"
import { handleLogout } from "./components/Auth/auth.action"
import Testing from "./pages/test2"
import SigninSecurity from "./components/Elements/Profile/SigninSecurity"

const CHECK_INTERVAL = 1000

let tokenCheckInterval = setInterval(() => {
  const token = localStorage.getItem("token")
  if (!token || isTokenExpired(token)) {
    clearInterval(tokenCheckInterval)
    handleLogout()
  }
}, CHECK_INTERVAL)

const router = createBrowserRouter([
  {
    element: <AuthWrapper isProtected={false} />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <LoginPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <RoleBasedRoute allowedRoles={["admin"]} />,
    children: [
      { path: "/dashboard", element: <DashboardAdmin /> },
      { path: "/user/profile", element: <TestingPage /> },
      { path: "/user/security", element: <TestingPage /> },
      { path: "/user-management", element: <Navigate to="/user-management/1" replace /> },
      { path: "/user-management/:modeParams", element: <UserManagement /> },
      { path: "/user-management/user/:id/edit", element: <EditUser /> },
      { path: "/user-management/role/:id/edit", element: <EditRole /> },
      { path: "/user-management/user/add", element: <AddUser /> },
      { path: "/user-management/role/add", element: <AddPermission /> },
    ],
  },
  {
    path: "/dash",
    element: <RoleBasedRoute allowedRoles={["Ketua Program Studi"]} />,
    children: [{ index: true, element: <App /> }],
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
