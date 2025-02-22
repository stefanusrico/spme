import { useState, useEffect, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table"
import { format } from "date-fns"
import axiosInstance from "../../../utils/axiosConfig"
import { useParams } from "react-router-dom"
import AddMemberModal from "../Modals/AddMember"

const LoadingBar = () => (
  <div className="relative mt-2 h-1 bg-gray overflow-hidden">
    <div className="absolute top-0 h-1 bg-blue loading-bar"></div>
  </div>
)

const LoadingRow = ({ columnLength }) => {
  const skeletonData = [1, 2, 3]

  return (
    <>
      {skeletonData.map((_, index) => (
        <tr key={index} className="animate-pulse">
          {Array.from({ length: columnLength }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-2">
              <div className="h-8 bg-gray rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

const Members = () => {
  const { projectId } = useParams()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const columnHelper = createColumnHelper()

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("joinedAt", {
        header: "Joined At",
        cell: (info) => format(new Date(info.getValue()), "PP"),
      }),
    ],
    []
  )

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const fetchMembers = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/members`)
      if (response.data.status === "success") {
        setMembers(response.data.data.members)
      } else {
        setError(response.data.message || "Failed to load project members")
      }
    } catch (err) {
      console.error("Error fetching members:", err.response || err)
      setError(err.response?.data?.message || "Failed to load project members")
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (memberData) => {
    try {
      const response = await axiosInstance.post(
        `/projects/${projectId}/members`,
        memberData
      )

      if (response.data.status === "success") {
        setShowModal(false)
        await fetchMembers()
      }
    } catch (err) {
      console.error("Error adding member:", err)
      setError(err.response?.data?.message || "Failed to add member")
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchMembers()
    }
  }, [projectId])

  return (
    <div className="w-full mx-auto">
      <div className="mt-2 w-full">
        <div className="flex justify-end mb-4">
          <button
            className="bg-base hover:bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
            onClick={() => setShowModal(true)}
          >
            Add member
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 w-full relative">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full min-w-[600px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left font-semibold"
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
                <div className="absolute left-0 right-0 h-1 bg-gray-100 overflow-hidden w-full">
                  <div className="absolute top-0 h-1 bg-blue loading-bar w-full"></div>
                </div>
              )}
              <tbody>
                {loading ? (
                  <LoadingRow columnLength={columns.length} />
                ) : error ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="text-center text-red-600 py-4"
                    >
                      {error}
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="text-center text-gray-500 py-4"
                    >
                      No members found in this project.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
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

        <AddMemberModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAdd={handleAddMember}
        />
      </div>
    </div>
  )
}

export default Members
