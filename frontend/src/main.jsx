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
import UserManagement from "./pages/userManagement"
import EditUser from "./components/Fragments/manageUser/edit"
import EditRole from "./components/Fragments/managePermission/edit"
import AddUser from "./components/Fragments/manageUser/add"
import AddPermission from "./components/Fragments/managePermission/add"
import { isTokenExpired } from "./utils/axiosConfig"
import { handleLogout } from "./components/Auth/auth.action"
import ProfileManagement from "./pages/ProfileManagement"
import { UserProvider } from "./context/userContext"
import ProjectsTable from "./components/Elements/DataTable/ProjectsTable"
import DashboardKaprodi from "./pages/DashboardKaprodi"
import TaskTable from "./components/Elements/DataTable/TaskTable"
import ProjectMemberTable from "./components/Elements/DataTable/ProjectMemberTable"
import ProdiTable from "./components/Elements/DataTable/ProdiTable"
import "datatables.net-dt/css/dataTables.dataTables.css"
import "datatables.net-bs5/css/dataTables.bootstrap5.css"
import "datatables.net-rowgroup-bs5/css/rowGroup.bootstrap5.css"

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
            profile: ProfileManagement,
          }}
        />
      </UserProvider>
    ),
    children: [{ path: "/user/profile", element: null }],
  },
  {
    element: (
      <UserProvider>
        <RoleBasedRoute allowedRoles={["Admin"]} />
      </UserProvider>
    ),
    children: [
      {
        path: "/user-management",
        element: <Navigate to="/user-management/1" replace />,
      },
      { path: "/user-management/:modeParams", element: <UserManagement /> },
      { path: "/user-management/user/:id/edit", element: <EditUser /> },
      { path: "/user-management/role/:id/edit", element: <EditRole /> },
      { path: "/user-management/user/add", element: <AddUser /> },
      { path: "/user-management/role/add", element: <AddPermission /> },
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
      { path: "/projects/:projectId", element: <TaskTable /> },
      { path: "/projects/:projectId/members", element: <ProjectMemberTable /> },
      { path: "/prodi", element: <ProdiTable /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
