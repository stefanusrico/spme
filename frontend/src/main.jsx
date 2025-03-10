import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { handleLogout } from "./components/Auth/auth.action"
import AuthWrapper from "./components/Auth/AuthWrapper"
import RoleBasedRoute from "./components/Auth/RoleBasedRoute"
import ProdiTable from "./components/Elements/DataTable/ProdiTable"
import ProjectsTable from "./components/Elements/DataTable/ProjectsTable"
import AddPermission from "./components/Fragments/managePermission/add"
import EditRole from "./components/Fragments/managePermission/edit"
import AddUser from "./components/Fragments/manageUser/add"
import EditUser from "./components/Fragments/manageUser/edit"
import Section1 from "./components/Fragments/Sections/Section1"
import { UserProvider } from "./context/userContext"
import ErrorPage from "./pages/404"
import Account from "./pages/account"
import DashboardAdmin from "./pages/DashboardAdmin"
import Jadwal from "./pages/Jadwal"
import JsonGenerator from "./pages/JsonGenerator"
import LoginPage from "./pages/login"
import Notifications from "./pages/Notifications"
import Projects from "./pages/Projects"
import RegisterPage from "./pages/register"
import UserManagement from "./pages/userManagement"
import PengisianMatrikLed from "./pages/PengisianMatriksLed"
import { isTokenExpired } from "./utils/axiosConfig"

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
    element: (
      <UserProvider>
        <AuthWrapper isProtected={false} />
      </UserProvider>
    ),
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <LoginPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: (
      <UserProvider>
        <RoleBasedRoute
          allowedRoles={["Admin", "Ketua Program Studi"]}
          roleComponents={{
            Admin: DashboardAdmin,
            "Ketua Program Studi": ProjectsTable,
          }}
        />
      </UserProvider>
    ),
    children: [{ path: "/dashboard", element: null }],
  },
  {
    element: (
      <UserProvider>
        <RoleBasedRoute
          allowedRoles={["Admin", "Ketua Program Studi"]}
          sharedComponents={{
            account: Account,
            notifications: Notifications,
            projects: Projects,
          }}
        />
      </UserProvider>
    ),
    children: [
      { path: "/account", element: null },
      { path: "/notifications", element: null },
      { path: "/projects/:projectId", element: <Projects /> },
    ],
  },
  {
    element: (
      <UserProvider>
        <RoleBasedRoute allowedRoles={["Admin"]} />
      </UserProvider>
    ),
    children: [
      { path: "/prodi", element: <ProdiTable /> },
      { path: "/jadwal", element: <Jadwal /> },
      { path: "/json/generate", element: <JsonGenerator /> },
      { path: "/user-management/users", element: <UserManagement /> },
      { path: "/user-management/permissions", element: <UserManagement /> },
      {
        path: "/user-management/*",
        element: <Navigate to="/user-management/users" replace />,
      },
      { path: "/user-management/user/:id/edit", element: <EditUser /> },
      { path: "/user-management/role/:id/edit", element: <EditRole /> },
      { path: "/user-management/user/add", element: <AddUser /> },
      { path: "/user-management/role/add", element: <AddPermission /> },
      { path: "section", element: <Section1 /> },
      {
        path: "/pengisian-matriks-led/:no?/:sub?",
        element: <PengisianMatrikLed />,
      },
    ],
  },
  {
    element: (
      <UserProvider>
        <RoleBasedRoute allowedRoles={["Ketua Program Studi"]} />
      </UserProvider>
    ),
    children: [
      { path: "/projects", element: <ProjectsTable /> },
      // {
      //   path: "/pengisian-matriks-led/:no?/:sub?",
      //   element: <PengisianMatrikLed />,
      // },
    ],
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

//auth
