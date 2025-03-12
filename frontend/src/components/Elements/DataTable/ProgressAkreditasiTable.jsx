import { useState, useEffect } from "react"
import ProgressBar from "../Chart/ProgressBar"
import { useProjects } from "../../../hooks/useProjects"

const statusColorMap = {
  "Not Started": "bg-red text-white",
  "In Progress": "bg-yellow text-white",
  Submitted: "bg-green text-white",
}

const ProgressAkreditasiTable = () => {
  const [statusFilter, setStatusFilter] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const { projects, isLoading, refetch } = useProjects()

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-"
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${date.toLocaleDateString()}-${hours}:${minutes} ${
      hours >= 12 ? "PM" : "AM"
    }`
  }

  // Get project status for consistent display
  const getProjectStatus = (progress) => {
    return progress > 0
      ? progress === 100
        ? "Submitted"
        : "In Progress"
      : "Not Started"
  }

  // Filter projects based on status
  const filteredProjects =
    statusFilter === "All"
      ? projects
      : projects.filter((project) => {
          const projectStatus = getProjectStatus(project.progress)
          return projectStatus === statusFilter
        })

  // Calculate pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProjects = filteredProjects.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

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
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500">No projects found</p>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Program Studi
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Completion Progress
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Submission Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProjects.map((project) => (
                  <tr key={project._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-black">
                      {project.prodiName || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-black">
                      {formatTimestamp(project.startDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <ProgressBar progress={project.progress || 0} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-black">
                      {formatTimestamp(project.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-black">
                      {project.ownerName || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statusColorMap[getProjectStatus(project.progress)]
                        }`}
                      >
                        {getProjectStatus(project.progress)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-end mt-4">
                <nav className="flex items-center">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 mx-1 rounded ${
                      currentPage === 1
                        ? "text-black cursor-not-allowed"
                        : "text-black hover:bg-gray"
                    }`}
                  >
                    Prev
                  </button>

                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageChange(index + 1)}
                      className={`px-3 py-1 mx-1 rounded ${
                        currentPage === index + 1
                          ? "bg-gray text-black"
                          : "text-black hover:bg-gray"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 mx-1 rounded ${
                      currentPage === totalPages
                        ? "text-black cursor-not-allowed"
                        : "text-black hover:bg-gray"
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ProgressAkreditasiTable
