import { useEffect, useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
} from "@tanstack/react-table"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import ConfirmAlert from "../../Elements/ConfirmationAlert"
import { useNavigate } from "react-router-dom"
import axiosInstance from "../../../utils/axiosConfig"

const LoadingBar = () => (
  <div className="relative h-1 bg-gray-100 overflow-hidden">
    <div className="absolute top-0 h-1 bg-blue loading-bar"></div>
  </div>
)

const LoadingRow = ({ columnLength }) => {
  const skeletonData = [...Array(3)].map((_, index) => ({
    id: index,
    name: "Loading...",
    created_at: new Date(),
    updated_at: new Date(),
  }))

  return (
    <>
      {skeletonData.map((_, index) => (
        <tr key={index} className="animate-pulse">
          {Array.from({ length: columnLength }).map((__, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div className="h-8 bg-gray rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

const ManagePermission = ({ title = "Permission Management" }) => {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAlert, setShowAlert] = useState(false)
  const [visible, setVisible] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)

  const navigate = useNavigate()

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
      {
        id: "actions",
        header: () => <div className="text-center">Action</div>,
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row.original.id)}
            >
              <Icon icon="heroicons-outline:pencil" className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.original.id)}
            >
              <Icon icon="heroicons-outline:trash" className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: roles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const handleEdit = (id) => {
    navigate(`/user-management/role/${id}/edit`)
  }

  const handleDelete = (id) => {
    setSelectedUserId(id)
    setShowAlert(true)
    setVisible(true)
  }

  const handleClose = async (confirm) => {
    if (confirm && selectedUserId) {
      try {
        await axiosInstance.delete(`/roles/${selectedUserId}`)
        setRoles(roles.filter((role) => role.id !== selectedUserId))
        alert("Role deleted successfully.")
      } catch (error) {
        alert("Failed to delete role.")
      }
    }
    setVisible(false)
    setTimeout(() => setShowAlert(false), 300)
  }

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get("/roles")
        if (response.data && Array.isArray(response.data.data)) {
          setRoles(response.data.data)
        } else {
          setError("Unexpected format response data from API")
        }
      } catch (error) {
        setError("Failed to fetch roles")
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [])

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray sticky top-0 z-10">
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
                <thead>
                  <tr>
                    <td colSpan={columns.length} className="p-0">
                      <LoadingBar />
                    </td>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <LoadingRow columnLength={columns.length} />
                ) : error ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      {error}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-4 whitespace-nowrap"
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

          <div className="flex items-center justify-between mt-4 px-4">
            <div className="text-sm text-black">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showAlert && (
        <ConfirmAlert
          message="Are you sure you want to delete this role?"
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
          visible={visible}
        />
      )}
    </div>
  )
}

export default ManagePermission
