import React, { useState, useMemo, useEffect } from "react"
import { Icon } from "@iconify/react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import axiosInstance from "../../../utils/axiosConfig"
import { Modal } from "antd"

const LkpsTable = ({ userData }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lkpsData, setLkpsData] = useState([])

  useEffect(() => {
    const fetchLkpsData = async () => {
      setLoading(true)
      try {
        const response = await axiosInstance.get('/lkps/tables')

        const transformedData = response.data.data.map((item) => ({
          id: item._id,
          kodeTabel: item.kode,
          judul: item.judul,
          strataId: item.strataId,
          strataName: item.strata_name,
        }))

        // Sort berdasarkan kode tabel
        transformedData.sort((a, b) => {
          return a.kodeTabel.localeCompare(b.kodeTabel, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        })

        setLkpsData(transformedData)
      } catch (error) {
        console.error("Error fetching LKPS data:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    if (userData?.prodiId) {
      fetchLkpsData()
    }
  }, [userData?.prodiId])

  const handleEdit = (rowData) => {
    setEditData(rowData)
    setIsEditModalOpen(true)
  }

  const handleDelete = (id, kodeTabel, judul) => {
    Modal.confirm({
      title: "Hapus Data",
      content: `Yakin ingin menghapus data "${kodeTabel} - ${judul}"?`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/delete-lkps/${id}`)
          setLkpsData((prev) => prev.filter((item) => item.id !== id))
        } catch (err) {
          console.error("Gagal menghapus data:", err)
          Modal.error({
            title: "Gagal",
            content: "Terjadi kesalahan saat menghapus data.",
          })
        }
      },
    })
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "kodeTabel",
        header: "KODE TABEL",
        size: 150,
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {row.original.kodeTabel}
          </div>
        ),
      },
      {
        accessorKey: "judul",
        header: "JUDUL",
        size: 400,
        cell: ({ row }) => (
          <div className="text-gray-700">{row.original.judul}</div>
        ),
      },
    ],
    [userData?.role]
  )

  const table = useReactTable({
    data: lkpsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  const LoadingBar = () => (
    <div className="relative h-1 bg-gray-100 overflow-hidden">
      <div className="absolute top-0 h-1 w-full animate-pulse bg-blue-500" />
    </div>
  )

  const LoadingRow = ({ columnLength }) => {
    const skeletonData = Array(10).fill(0)
    return skeletonData.map((_, index) => (
      <tr key={`loading-${index}`} className="animate-pulse">
        {Array(columnLength)
          .fill(0)
          .map((__, colIndex) => (
            <td key={`loading-col-${index}-${colIndex}`} className="px-4 py-2">
              <div className="h-6 bg-gray-200 rounded" />
            </td>
          ))}
      </tr>
    ))
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <Icon
              icon="heroicons:exclamation-triangle"
              className="h-5 w-5 text-red-500 mr-2"
            />
            <span className="text-red-700">Error: {error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-lg w-full relative overflow-hidden">
        {loading && <LoadingBar />}

        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                LKPS Template Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Total: {lkpsData.length} templates
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
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

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <LoadingRow columnLength={columns.length} />
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm"
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

          {!loading && lkpsData.length === 0 && (
            <div className="text-center py-12">
              <Icon
                icon="heroicons:document-text"
                className="h-12 w-12 text-gray-400 mx-auto mb-4"
              />
              <p className="text-gray-500">No LKPS templates found</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} pages
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex items-center space-x-1"
            >
              <Icon icon="heroicons:chevron-left" className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex items-center space-x-1"
            >
              <span>Next</span>
              <Icon icon="heroicons:chevron-right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <Modal
          title="Edit LKPS Template"
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          onOk={async () => {
            try {
              await axiosInstance.put(`/update-lkps/${editData.id}`, editData)
              setLkpsData((prev) =>
                prev.map((item) =>
                  item.id === editData.id ? { ...item, ...editData } : item
                )
              )
              setIsEditModalOpen(false)
            } catch (error) {
              console.error("Gagal update data:", error)
              Modal.error({
                title: "Error",
                content: "Gagal mengupdate data.",
              })
            }
          }}
          okText="Simpan"
          cancelText="Batal"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Kode Tabel:
              </label>
              <input
                type="text"
                value={editData?.kodeTabel || ""}
                onChange={(e) =>
                  setEditData({ ...editData, kodeTabel: e.target.value })
                }
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Judul:
              </label>
              <textarea
                value={editData?.judul || ""}
                onChange={(e) =>
                  setEditData({ ...editData, judul: e.target.value })
                }
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default LkpsTable
