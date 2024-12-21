import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./index.css"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import LoginPage from "./pages/login.jsx"
import RegisterPage from "./pages/register.jsx"
import ErrorPage from "./pages/404.jsx"
import AuthWrapper from "./components/Auth/AuthWrapper.jsx"
import TestingPage from "./pages/testing.jsx"
import Testing from "./pages/test2.jsx"
import DashboardAdmin from "./pages/DashboardAdmin.jsx"

const router = createBrowserRouter([
  {
    element: <AuthWrapper isProtected={false} />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <LoginPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        path: "/testing",
        element: <TestingPage />,
      },
      {
        path: "/testing/1",
        element: <Testing />,
      },
    ],
  },
  {
    element: <AuthWrapper isProtected={true} />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardAdmin />,
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
