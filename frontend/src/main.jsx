import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./index.css"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import LoginPage from "./pages/login.jsx"
import RegisterPage from "./pages/register.jsx"
import ErrorPage from "./pages/404.jsx"
import AuthWrapper from "./components/Auth/AuthWrapper.jsx"

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
    ],
  },
  {
    element: <AuthWrapper isProtected={true} />,
    errorElement: <ErrorPage />,
    children: [
        {
          path: "/dashboard",
          element: <App />,
        }
      ]
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
