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
  const skeletonData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

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

const ManageUser = ({ title = "User Management" }) => {
  const [users, setUsers] = useState([])
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
        header: "NAME", // Ubah ke uppercase
        size: 200,
      },
      {
        accessorKey: "email",
        header: "EMAIL", // Ubah ke uppercase
        size: 300,
      },
      {
        accessorKey: "role",
        header: "ROLE", // Ubah ke uppercase
        size: 150,
      },
      {
        accessorKey: "created_at",
        header: "CREATED", // Ubah ke uppercase
        size: 150,
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
      {
        accessorKey: "updated_at",
        header: "UPDATED", // Ubah ke uppercase
        size: 150,
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
      {
        id: "actions",
        header: () => <div className="text-center">ACTION</div>, // Ubah ke uppercase
        size: 150,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
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
    data: users,
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
    navigate(`/user-management/user/${id}/edit`)
  }

  const handleDelete = (id) => {
    setSelectedUserId(id)
    setShowAlert(true)
    setVisible(true)
  }

  const handleClose = async (confirm) => {
    if (confirm && selectedUserId) {
      try {
        await axiosInstance.delete(`/users/${selectedUserId}`)
        setUsers(users.filter((user) => user.id !== selectedUserId))
        alert("User deleted successfully.")
      } catch (error) {
        alert("Failed to delete user.")
      }
    }
    setVisible(false)
    setTimeout(() => setShowAlert(false), 300)
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get("/users")
        if (response.data && Array.isArray(response.data.data)) {
          setUsers(response.data.data)
        } else {
          setError("Unexpected format response data from API")
        }
      } catch (error) {
        setError("Failed to fetch users")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="p-4 h-[calc(100vh-12rem)]">
      <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
        <div className="p-6 flex flex-col h-full">
          <div className="overflow-auto flex-1">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray rounded-full w-full">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="overflow-hidden rounded-full"
                  >
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
                <thead className="sticky top-[49px] z-10">
                  <tr>
                    <td colSpan={columns.length} className="p-0">
                      <LoadingBar />
                    </td>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white divide-y divide-gray">
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
          <div className="flex items-center justify-between mt-4 px-4 pt-4 border-t">
            <div className="text-sm text-gray-500">
              {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()} pages
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
          message="Are you sure you want to delete this user?"
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
          visible={visible}
        />
      )}
    </div>
  )
}

export default ManageUser
