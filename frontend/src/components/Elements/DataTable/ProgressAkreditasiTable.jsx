import { useEffect, useRef, useState } from "react"
import { DataTable } from "simple-datatables"
import ProgressBar from "../Chart/ProgressBar"
import axiosInstance from "../../../utils/axiosConfig"
import "simple-datatables/dist/style.css"

const statusColorMap = {
  "Not Started": "bg-red text-white",
  "In Progress": "bg-yellow text-white",
  Submitted: "bg-green text-white",
}

const ProgressAkreditasiTable = () => {
  const tableRef = useRef(null)
  const [statusFilter, setStatusFilter] = useState("All")
  const [projects, setProjects] = useState([])

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await axiosInstance.get("/projects/all")
      if (response.data.status === "success") {
        setProjects(response.data.data)
      }
    } catch (err) {
      console.error("Error fetching projects:", err)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB")
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${date.toLocaleDateString()}-${hours}:${minutes} ${
      hours >= 12 ? "PM" : "AM"
    }`
  }

  useEffect(() => {
    let dataTable = null
    if (tableRef.current && projects.length > 0) {
      dataTable = new DataTable(tableRef.current, {
        searchable: false,
        perPageSelect: false,
        sortable: false,
        perPage: 5,
        classes: {
          wrapper: "dataTables_wrapper",
          input: "hidden",
          selector: "hidden",
        },
      })

      const filterDataByStatus = () => {
        const rows = tableRef.current.querySelectorAll("tbody tr")
        rows.forEach((row) => {
          if (row && row.cells && row.cells[5]) {
            const status = row.cells[5].textContent.trim()
            if (statusFilter === "All" || status === statusFilter) {
              row.style.display = ""
            } else {
              row.style.display = "none"
            }
          }
        })
      }

      filterDataByStatus()
    }

    return () => {
      if (dataTable) {
        dataTable.destroy()
      }
    }
  }, [statusFilter, projects])

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Progress Akreditasi</h2>
        <select
          id="statusFilter"
          onChange={(e) => setStatusFilter(e.target.value)}
          value={statusFilter}
          className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="All">Status</option>
          <option value="Submitted">Submitted</option>
          <option value="In Progress">In Progress</option>
          <option value="Not Started">Not Started</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table id="default-table" ref={tableRef} className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Program Studi
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Completion Progress
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Submission Timestamp
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Submitted By
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {project.ownerProdi}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatTimestamp(project.startDate)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <ProgressBar progress={project.progress || 0} />
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatTimestamp(project.updated_at)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {project.ownerName}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      project.progress > 0
                        ? project.progress === 100
                          ? statusColorMap.Submitted
                          : statusColorMap["In Progress"]
                        : statusColorMap["Not Started"]
                    }`}
                  >
                    {project.progress > 0
                      ? project.progress === 100
                        ? "Submitted"
                        : "In Progress"
                      : "Not Started"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProgressAkreditasiTable
