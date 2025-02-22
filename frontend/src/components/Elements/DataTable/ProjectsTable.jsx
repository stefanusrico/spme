import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import axiosInstance from "../../../utils/axiosConfig"
import ProgressBar from "../Chart/ProgressBar"
import AddProjectModal from "../Modals/AddProjectModal"

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
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
  })

  const columnHelper = createColumnHelper()

  const columns = useMemo(
    () => [
      columnHelper.accessor("projectId", {
        header: "ID",
        size: 100,
      }),
      columnHelper.accessor("name", {
        header: "PROJECT NAME",
        size: 200,
        cell: ({ row }) => (
          <div className="relative group">
            <span>{row.original.name}</span>
            <a
              href={`/projects/${row.original.id}`}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue_badge text-blue text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-400"
            >
              Access Project
            </a>
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
            {row.original.owner.profile_picture && (
              <img
                src={row.original.owner.profile_picture}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span>{row.original.owner.name}</span>
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
              : "bg-red_badge text-red"
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
        size: 120,
      }),
      columnHelper.accessor("endDate", {
        header: "END DATE",
        size: 120,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axiosInstance.post("/project", formData)
      if (response.data.status === "success") {
        setFormData({ name: "", startDate: "", endDate: "" })
        setShowModal(false)
        fetchProjects()
      }
    } catch (err) {
      console.error("Error creating project:", err)
    }
  }

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get("/projects")
      if (response.data.status === "success") {
        const projectsWithUserData = await Promise.all(
          response.data.data.map(async (project) => {
            try {
              const userResponse = await axiosInstance.get(
                `/users/${project.createdBy}`
              )
              const userData =
                userResponse.data.status === "success"
                  ? userResponse.data.data
                  : null

              return {
                projectId: project.projectId,
                name: project.name,
                progress: project.progress || 0,
                owner: {
                  userId: project.createdBy,
                  name: userData?.name || project.createdBy,
                  profile_picture: userData?.profile_picture,
                },
                status: project.status,
                task: project.progress || 0,
                startDate: new Date(project.startDate).toLocaleDateString(),
                endDate: new Date(project.endDate).toLocaleDateString(),
                id: project.id,
              }
            } catch (err) {
              console.error(`Error fetching user data:`, err)
              return null
            }
          })
        )
        setProjects(projectsWithUserData.filter(Boolean))
      }
    } catch (err) {
      console.error("Error fetching projects:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return (
    <div className="p-3 w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button
          className="bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
          onClick={() => setShowModal(true)}
        >
          Add project
        </button>
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
                      className={`px-6 py-3 text-left text-normal font-bold text-black uppercase tracking-wider bg-gray ${
                        index === 0 ? "rounded-l-lg" : ""
                      } ${
                        index === headerGroup.headers.length - 1
                          ? "rounded-r-lg"
                          : ""
                      }`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {loading && (
              <div className="absolute mt-2 left-0 right-0 h-1 bg-gray-100 overflow-hidden w-full">
                <div className="absolute top-0 h-1 bg-blue loading-bar w-full"></div>
              </div>
            )}
            <tbody>
              {loading ? (
                <LoadingRow colSpan={columns.length} />
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2"
                        style={{ width: cell.column.getSize() }}
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
      />
    </div>
  )
}

export default ProjectsTable
