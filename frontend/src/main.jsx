import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import LoginPage from "./pages/login"
import RegisterPage from "./pages/register"
import ErrorPage from "./pages/404"
import AuthWrapper from "./components/Auth/AuthWrapper"
import RoleBasedRoute from "./components/Auth/RoleBasedRoute"
import DashboardAdmin from "./pages/DashboardAdmin"
import App from "./App"
import { isTokenExpired } from "./utils/axiosConfig"
import { handleLogout } from "./components/Auth/auth.action"

setInterval(() => {
  const token = localStorage.getItem("token")
  if (!token || isTokenExpired(token)) {
    handleLogout()
  }
}, 1000)

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
    path: "/dashboard",
    element: <RoleBasedRoute allowedRoles={["admin"]} />,
    children: [{ index: true, element: <DashboardAdmin /> }],
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
