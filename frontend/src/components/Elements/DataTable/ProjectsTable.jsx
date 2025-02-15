import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import ProgressBar from "../Chart/ProgressBar"
import { X } from "lucide-react"
import $ from "jquery"
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css"
import "datatables.net-bs5"
import axiosInstance from "../../../utils/axiosConfig"
import "../../../styles/ProjectTable.css"

const ProjectsTable = ({ isCollapsed }) => {
  const tableRef = useRef(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tableInstance, setTableInstance] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
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

  const initializeDataTable = () => {
    if (!tableRef.current) return null

    if ($.fn.DataTable.isDataTable(tableRef.current)) {
      $(tableRef.current).DataTable().destroy()
    }

    const table = $(tableRef.current).DataTable({
      data: projects,
      responsive: true,
      autoWidth: false,
      scrollX: false,
      columns: [
        {
          data: "0",
          title: "ID",
          width: "8%",
        },
        {
          data: "1",
          title: "PROJECT NAME",
          width: "20%",
          render: (data, type, row) => {
            if (type === "display") {
              return `
              <div class="relative group">
                <span>${data}</span>
                <a href="/projects/${row[8]}" 
                  class="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue_badge text-blue text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-400">
                  Access Project
                </a>
              </div>
            `
            }
            return data
          },
        },
        {
          data: "5",
          title: "%",
          width: "8%",
          className: "text-center",
        },
        {
          data: "3",
          title: "OWNER",
          width: "15%",
          render: (data, type) => {
            if (type === "display") {
              return `
              <div class="flex items-center gap-2">
                ${
                  data.profile_picture
                    ? `<img src="${data.profile_picture}" alt="Profile" class="w-8 h-8 rounded-full object-cover"/>`
                    : ""
                }
                <span>${data.name}</span>
              </div>
            `
            }
            return data.name
          },
        },
        {
          data: "4",
          title: "STATUS",
          width: "12%",
          render: (data, type) => {
            if (type === "display") {
              const className =
                data === "ACTIVE"
                  ? "text-green bg-green_badge"
                  : "bg-red_badge text-red"
              return `
              <span class="text-sm text-center font-semibold rounded-lg px-2 py-1 ${className}">
                ${data}
              </span>
            `
            }
            return data
          },
        },
        {
          data: "2",
          title: "TASK",
          width: "15%",
          render: (data, type, row) => {
            if (type === "display") {
              const containerId = `progress-cell-${row[8]}`
              setTimeout(() => {
                const container = document.getElementById(containerId)
                if (container && !container.hasAttribute("data-initialized")) {
                  const root = createRoot(container)
                  root.render(<ProgressBar progress={parseInt(data)} />)
                  container.setAttribute("data-initialized", "true")
                }
              }, 0)
              return `<div id="${containerId}"></div>`
            }
            return data
          },
        },
        {
          data: "6",
          title: "START DATE",
          width: "12%",
          className: "text-center",
        },
        {
          data: "7",
          title: "END DATE",
          width: "12%",
          className: "text-center",
        },
      ],
      paging: false,
      searching: true,
      dom: '<"top"f>rt<"clear">',
      ordering: false,
      info: false,
      language: {
        search: "Search projects:",
      },
      createdRow: function (row) {
        $(row).addClass("hover:bg-gray-50 group relative")
      },
      drawCallback: function () {
        this.api().columns.adjust()
      },

      initComplete: () => {
        $(".dataTables_filter input").addClass(
          "w-64 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        )

        $(".dataTables_paginate").addClass(
          "mt-4 flex items-center justify-end gap-2"
        )
        $(".paginate_button").addClass("px-3 py-1 rounded-lg hover:bg-gray-100")
        $(".paginate_button.current").addClass(
          "bg-blue-50 text-blue-600 font-medium"
        )
      },
    })

    return table
  }

  const fetchProjects = async () => {
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

              return [
                project.projectId,
                project.name,
                project.progress || "0",
                {
                  userId: project.createdBy,
                  name: userData?.name || project.createdBy,
                  profile_picture: userData?.profile_picture,
                },
                project.status,
                `${project.progress || 0}%`,
                new Date(project.startDate).toLocaleDateString(),
                new Date(project.endDate).toLocaleDateString(),
                project.id,
              ]
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

  useEffect(() => {
    if (projects.length > 0) {
      if (tableInstance) {
        tableInstance.destroy()
        document
          .querySelectorAll('[id^="progress-cell-"]')
          .forEach((element) => {
            const root = element._reactRootContainer
            if (root) {
              root.unmount()
            }
          })
      }
      const newTable = initializeDataTable()
      setTableInstance(newTable)
    }
  }, [projects])

  useEffect(() => {
    if (tableInstance) {
      setTimeout(() => {
        tableInstance.columns.adjust()
      }, 300)
    }
  }, [isCollapsed, tableInstance])

  const Modal = () => (
    <>
      <div
        className={`fixed inset-y-0 right-0 w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          showModal ? "translate-x-0" : "translate-x-full"
        } z-50`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Add New Project</h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                  </svg>
                </div>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                  </svg>
                </div>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-base rounded-lg hover:bg-base/90"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setShowModal(false)}
        ></div>
      )}
    </>
  )

  if (loading) {
    return (
      <div className="w-full mx-auto mt-32">
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full">
            <div className="min-h-[200px] flex items-center justify-center">
              <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-center">
                Loading projects...
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="w-full mx-auto">
          <div className="w-full">
            <h1 className="text-2xl font-bold mb-6">Projects</h1>
            <div className="flex justify-end mb-4">
              <button
                className="bg-base hover:bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
                onClick={() => setShowModal(true)}
              >
                Add project
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 w-full">
              <div className="min-h-[200px] flex flex-col items-center justify-center text-gray-500">
                <p className="text-lg mb-4">No projects found</p>
                <p className="text-sm">
                  Click &quot;Add project&quot; to create your first project
                </p>
              </div>
            </div>
          </div>
        </div>
        <Modal />
      </>
    )
  }

  return (
    <>
      <div className="p-3 w-full">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Projects</h1>
          <button
            className="bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
            onClick={() => setShowModal(true)}
          >
            Add project
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 h-[calc(100vh-180px)]">
          <div className="overflow-x-auto h-full">
            <table ref={tableRef} className="w-full relative stripe hover" />
          </div>
        </div>
      </div>
      <Modal />
    </>
  )
}

export default ProjectsTable
