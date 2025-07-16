import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import axiosInstance from "../../../utils/axiosConfig"
import ProgressBar from "../Chart/ProgressBar"
import AddProjectModal from "../Modals/AddProjectModal"
import EditProjectModal from "../Modals/EditProjectModal"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { useUser } from "../../../context/userContext"

const LoadingBar = () => (
  <div className="relative h-1 bg-gray-100 overflow-hidden">
    <div className="absolute top-0 h-1 bg-blue loading-bar"></div>
  </div>
)

const LoadingRow = ({ colSpan }) => {
  const skeletonData = [1, 2, 3, 4, 5]

  return (
    <>
      {skeletonData.map((item, index) => (
        <tr key={index} className="animate-pulse">
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-12" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-3/4" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-8" />
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray rounded-full" />
              <div className="h-4 bg-gray rounded w-24" />
            </div>
          </td>
          <td className="px-4 py-2">
            <div className="h-6 bg-gray rounded w-16" />
          </td>
          <td className="px-4 py-2">
            <div className="h-2 bg-gray rounded w-full" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-20" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-20" />
          </td>
        </tr>
      ))}
    </>
  )
}

const ProjectsTable = ({ isCollapsed }) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
  })
  const [editFormData, setEditFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const columnHelper = createColumnHelper()
  const { userData: user } = useUser()

  // Handler untuk input change pada edit form - pindahkan ke dalam komponen
  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Fungsi handleInputChange untuk add modal
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Definisi kolom dengan tambahan action column
  const columns = useMemo(
    () => [
      columnHelper.accessor("projectId", {
        header: "ID",
        size: 100,
      }),
      columnHelper.accessor("name", {
        header: "PROJECT NAME",
        cell: ({ row }) => (
          <div className="flex items-center justify-between gap-2 group">
            <span className="truncate" title={row.original.name}>
              {row.original.name}
            </span>
            <Link
              to={`/projects/${row.original.id}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out bg-blue_badge text-blue text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-400 whitespace-nowrap shrink-0"
            >
              Access Project
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("progress", {
        header: "%",
        size: 80,
        cell: ({ getValue }) => `${getValue()}%`,
      }),
      columnHelper.accessor("owner", {
        header: "OWNER",
        size: 150,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.owner.profile_picture ? (
              <img
                src={row.original.owner.profile_picture}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>
            )}
            <span className="truncate">{row.original.owner.name}</span>
          </div>
        ),
      }),
      columnHelper.accessor("status", {
        header: "STATUS",
        size: 120,
        cell: ({ getValue }) => {
          const status = getValue()
          const className =
            status === "ACTIVE"
              ? "text-green bg-green_badge"
              : status === "IN PROGRESS"
              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
              : "text-red bg-red_badge"

          return (
            <span
              className={`text-sm text-center font-semibold rounded-lg px-2 py-1 ${className}`}
            >
              {status}
            </span>
          )
        },
      }),
      columnHelper.accessor("task", {
        header: () => <div className="text-center">TASK</div>,
        size: 150,
        cell: ({ getValue }) => (
          <div className="mx-auto w-full flex justify-center">
            <ProgressBar progress={getValue()} />
          </div>
        ),
      }),
      columnHelper.accessor("startDate", {
        header: "START DATE",
        size: 200,
      }),
      columnHelper.accessor("endDate", {
        header: "END DATE",
        size: 200,
      }),
      ...(user?.role === "Koordinator Program Studi"
        ? [
            {
              id: "actions",
              header: "ACTIONS",
              size: 100,
              cell: ({ row }) => (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditProject(row.original)}
                    className="p-2 bg-yellow hover:bg-yellow-600 text-white rounded transition-colors duration-200"
                    title="Edit Project"
                  >
                    {/* Edit Icon */}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteProject(row.original.projectId)}
                    className="p-2 bg-red hover:bg-red-600 text-white rounded transition-colors duration-200"
                    title="Delete Project"
                  >
                    {/* Delete Icon */}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [columnHelper, user?.role]
  )

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Handler untuk edit project
  const handleEditProject = (project) => {
    setEditingProject(project)
    setEditFormData({
      name: project.name,
      startDate: project.originalStartDate || project.startDate,
      endDate: project.originalEndDate || project.endDate,
    })
    setShowEditModal(true)
  }

  // Fungsi handleSubmit dan handleEditSubmit tetap sama
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await axiosInstance.post("/project", formData)
      if (response.data.status === "success") {
        setFormData({ name: "", startDate: "", endDate: "" })
        fetchProjects() // Panggil fetchProjects lagi untuk refresh data
        toast.success("Project berhasil dibuat!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
        setShowModal(false)
      } else {
        // Tambahkan penanganan jika status bukan success tapi tidak error
        toast.error(response.data.message || "Gagal membuat project", {
          position: "top-right",
          autoClose: 3000 /* ... other options */,
        })
      }
    } catch (err) {
      console.error("Error creating project:", err)
      toast.error(err.response?.data?.message || "Gagal membuat project", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler untuk submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Gunakan projectId dari editingProject
      const response = await axiosInstance.put(
        `/project/${editingProject.projectId}`, // Gunakan projectId, bukan id
        editFormData
      )
      if (response.data.status === "success") {
        setEditFormData({ name: "", startDate: "", endDate: "" })
        fetchProjects() // Refresh data
        toast.success("Project berhasil diupdate!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
        setShowEditModal(false)
        setEditingProject(null)
      } else {
        toast.error(response.data.message || "Gagal mengupdate project", {
          position: "top-right",
          autoClose: 3000,
        })
      }
    } catch (err) {
      console.error("Error updating project:", err)
      toast.error(err.response?.data?.message || "Gagal mengupdate project", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler untuk delete project
  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        const response = await axiosInstance.delete(`/project/${projectId}`)
        if (response.data.status === "success") {
          toast.success("Project berhasil dihapus!", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
          fetchProjects() // Refresh data
        }
      } catch (err) {
        console.error("Error deleting project:", err)
        toast.error(err.response?.data?.message || "Gagal menghapus project", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }
    }
  }

  // Update fetchProjects untuk menyimpan projectId yang benar
  const fetchProjects = async () => {
    setLoading(true)
    try {
      const projectsResponse = await axiosInstance.get("/projects")

      if (
        projectsResponse.data.status === "success" &&
        projectsResponse.data.data
      ) {
        const rawProjects = projectsResponse.data.data

        const uniqueUserIds = [
          ...new Set(
            rawProjects.map((project) => project.createdBy).filter(Boolean)
          ),
        ]

        let usersMap = {}

        if (uniqueUserIds.length > 0) {
          const userPromises = uniqueUserIds.map((userId) =>
            axiosInstance
              .get(`/users/${userId}`)
              .then((res) => {
                if (res.data.status === "success" && res.data.data) {
                  return { id: userId, data: res.data.data }
                }
                console.warn(`User data not found or invalid for ID: ${userId}`)
                return { id: userId, data: null }
              })
              .catch((err) => {
                console.error(`Error fetching user data for ID ${userId}:`, err)
                return { id: userId, data: null }
              })
          )

          const usersResults = await Promise.all(userPromises)

          usersMap = usersResults.reduce((acc, result) => {
            if (result && result.data) {
              acc[result.id] = result.data
            }
            return acc
          }, {})
        }

        const projectsWithUserData = rawProjects.map((project) => {
          const userData = usersMap[project.createdBy] || {}

          return {
            projectId: project.projectId,
            name: project.name,
            progress: project.progress || 0,
            owner: {
              userId: project.createdBy,
              name:
                userData?.name ||
                `User ID: ${project.createdBy}` ||
                "Unknown Owner",
              profile_picture: userData?.profile_picture || null,
            },
            status: project.status,
            task: project.progress || 0,
            startDate: new Date(project.startDate).toLocaleDateString(),
            endDate: new Date(project.endDate).toLocaleDateString(),
            originalStartDate: project.startDate,
            originalEndDate: project.endDate,
            id: project.id || project._id, // Fallback to _id if id doesn't exist
          }
        })

        setProjects(projectsWithUserData)
      } else {
        console.error(
          "Failed to fetch projects or no projects data received:",
          projectsResponse.data
        )
        setProjects([])
        toast.error("Gagal memuat data project.", {
          position: "top-right",
        })
      }
    } catch (err) {
      console.error("Error fetching projects:", err)
      setProjects([])
      toast.error("Gagal memuat data project.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchProjects()
  }, [user]) // Dependency array user agar hanya dijalankan ketika user berubah

  // Render JSX sisanya tetap sama
  return (
    <div className="p-3 w-full">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 11001 }}
      />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Projects</h1>
        {user?.role === "Koordinator Program Studi" && (
          <button
            className="bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 hover:bg-blue-700" // Tambahkan hover effect
            onClick={() => setShowModal(true)}
          >
            Add project
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="overflow-x-auto overflow-y-hidden relative">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider bg-gray ${
                        // Ubah px-6 ke px-4, text-normal ke text-xs
                        index === 0 ? "rounded-l-lg" : ""
                      } ${
                        index === headerGroup.headers.length - 1
                          ? "rounded-r-lg"
                          : ""
                      }`}
                      style={{
                        width:
                          header.column.getSize() !== 150 // Default size dari react-table
                            ? header.column.getSize()
                            : undefined, // Biarkan browser/CSS menghandle jika size = default
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {/* Loading Bar dipindahkan ke bawah header */}
            {loading && (
              <thead>
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <LoadingBar />
                  </td>
                </tr>
              </thead>
            )}
            <tbody>
              {loading ? (
                <LoadingRow colSpan={columns.length} />
              ) : projects.length === 0 ? ( // Tampilkan pesan jika tidak ada data
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-10 text-gray-500"
                  >
                    No projects found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group hover:bg-gray-50 transition-colors border-b last:border-b-0" // Tambahkan border antar baris
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 whitespace-nowrap" // Tambahkan whitespace-nowrap
                        style={{
                          width:
                            cell.column.getSize() !== 150
                              ? cell.column.getSize()
                              : undefined,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddProjectModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Edit Project Modal - menggunakan komponen terpisah */}
      <EditProjectModal
        showModal={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingProject(null)
        }}
        formData={editFormData}
        onInputChange={handleEditInputChange}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

export default ProjectsTable
