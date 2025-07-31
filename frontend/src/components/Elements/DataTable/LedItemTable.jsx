import React, { useState, useMemo, useEffect } from "react"
import { Icon } from "@iconify/react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import axiosInstance from "../../../utils/axiosConfig"
import { Modal } from 'antd'

const LedItem = ({userData}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ledItem, setLedItem] = useState([])

  useEffect(() => {
    const fetchLedItem = async () => {
      setLoading(true)
      try {
        const response = await axiosInstance.get(
          `/getLedItemByProdi/${userData?.prodiId}`
        );

        // Transform data untuk struktur hierarchical yang tepat
        const transformedData = response.data.data.map(item => ({
          id: item.id,
          kriteria: item.kriteria,
          no: item.no,
          sub: item.sub,
          strataId: item.strataId,
          lamId: item.lamId,
          updated_at: item.updated_at,
          created_at: item.created_at,
          // Pastikan details ada dan berisi array
          details: item.details && item.details.length > 0 ? item.details.map(detail => ({
            seq: detail.seq,
            type: detail.type,
            reference: detail.reference,
          })) : []
        }))

        // Sort berdasarkan nomor
        transformedData.sort((a, b) => {
          // Extract numeric parts for proper sorting
          const parseNumber = (str) => {
            const matches = str.match(/(\d+\.?\d*)/g)
            return matches ? matches.map(num => parseFloat(num)) : [0]
          }
          
          const aNumbers = parseNumber(a.no)
          const bNumbers = parseNumber(b.no)
          
          // Compare each numeric part
          for (let i = 0; i < Math.max(aNumbers.length, bNumbers.length); i++) {
            const aNum = aNumbers[i] || 0
            const bNum = bNumbers[i] || 0
            
            if (aNum !== bNum) {
              return aNum - bNum
            }
          }
          
          // If all numeric parts are equal, compare the full string
          return a.no.localeCompare(b.no, undefined, { numeric: true, sensitivity: 'base' })
        })
        setLedItem(transformedData); 
      } catch (error) {
        console.error('Error fetching led item:', error);
        setError(error.message)
      } finally {
        setLoading(false)
      }
    };

    if (userData?.prodiId) {
      fetchLedItem();
    }
  }, [userData?.prodiId]);

  const handleEdit = (rowData) => {
    setEditData(rowData)
    setIsEditModalOpen(true)
  }

  const handleDelete = (id, no, sub) => {
    Modal.confirm({
      title: "Hapus Data",
      content: `Yakin ingin menghapus data ${no}-${sub} id : "${id}"?`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/delete-led-item/${id}`);
          setLedItem((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
          console.error("Gagal menghapus data:", err);
          Modal.error({
            title: "Gagal",
            content: "Terjadi kesalahan saat menghapus data.",
          });
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        id: 'expander',
        header: '',
        size: 50,
        cell: ({ row }) => {
          if (row.original.details && row.original.details.length > 0) {
            return (
              <button 
                onClick={row.getToggleExpandedHandler()}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors duration-150"
              >
                <Icon 
                  icon={row.getIsExpanded() ? "heroicons:chevron-down" : "heroicons:chevron-right"}
                  className="w-4 h-4 text-gray-600"
                />
              </button>
            )
          }
          return (
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            </div>
          )
        },
      },
      {
        accessorKey: "no",
        header: "NO",
        size: 120,
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {row.original.no}
          </div>
        )
      },
      {
        accessorKey: "sub",
        header: "SUB",
        size: 100,
        cell: ({ row }) => (
          <div className="text-gray-700">
            {row.original.sub || "-"}
          </div>
        )
      },
      {
        accessorKey: "kriteria",
        header: "KRITERIA",
        size: 300,
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {row.original.kriteria}
          </div>
        )
      },
      {
        id: "details_count",
        header: "DETAILS",
        size: 80,
        cell: ({ row }) => (
          <div className="text-center">
            {row.original.details && row.original.details.length > 0 ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {row.original.details.length} item{row.original.details.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        )
      },
      {
        id: "actions",
        header: () => <div className="text-center">ACTION</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1">
            {userData.role === "Admin" ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(row.original)}
                  className="h-8 w-8 p-0 hover:bg-blue-50"
                  title="Edit"
                >
                  <Icon icon="heroicons:pencil" className="h-4 w-4 text-blue-600" />
                </Button>

                {/* <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(row.original.id, row.original.no, row.original.sub)}
                  className="h-8 w-8 p-0 hover:bg-red-50"
                  title="Delete"
                >
                  <Icon icon="heroicons:trash" className="h-4 w-4 text-red-600" />
                </Button> */}
              </>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        )
      },
    ],
    [userData.role]
  )

  const table = useReactTable({
    data: ledItem,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.details && row.original.details.length > 0,
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
        {Array(columnLength).fill(0).map((__, colIndex) => (
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
            <Icon icon="heroicons:exclamation-triangle" className="h-5 w-5 text-red-500 mr-2" />
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
              <h2 className="text-xl font-semibold text-gray-900">LED Item Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Total: {ledItem.length} items
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
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
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-gray-50 transition-colors duration-150">
                      {row.getVisibleCells().map((cell) => (
                        <td 
                          key={cell.id} 
                          className="px-6 py-4 whitespace-nowrap text-sm"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>

                    {row.getIsExpanded() && row.original.details && row.original.details.length > 0 && (
                      <tr key={`expanded-${row.id}`}>
                        <td colSpan={columns.length} className="px-6 py-0">
                          <div className="bg-gray-50 border-l-4 border-blue-400 my-2 rounded-r-lg">
                            <div className="px-6 py-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                <Icon icon="heroicons:list-bullet" className="h-4 w-4 mr-2" />
                                Detail Items ({row.original.details.length})
                              </h4>
                              <div className="space-y-3">
                                {row.original.details.map((detail, index) => (
                                  <div 
                                    key={`detail-${row.id}-${index}`} 
                                    className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors duration-150"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center mb-2">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3">
                                            SEQ: {detail.seq}
                                          </span>
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            {detail.type}
                                          </span>
                                        </div>
                                        <div className="text-sm text-gray-700">
                                          <strong className="text-gray-900">Reference:</strong>
                                          <p className="mt-1 leading-relaxed">
                                            {detail.reference || "No reference available"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>

          {!loading && ledItem.length === 0 && (
            <div className="text-center py-12">
              <Icon icon="heroicons:document-text" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No LED items found</p>
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
          title="Edit Data"
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          onOk={async () => {
            try {
              await axiosInstance.put(`/update-led-item/${editData.id}`, editData)
              setLedItem((prev) =>
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
                <label className="block text-sm font-medium mb-2 text-gray-700">Kriteria:</label>
                <input
                  type="text"
                  value={editData?.kriteria || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, kriteria: e.target.value })
                  }
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">No:</label>
                <input
                  type="text"
                  value={editData?.no || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, no: e.target.value })
                  }
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Sub:</label>
                <input
                  type="text"
                  value={editData?.sub || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, sub: e.target.value })
                  }
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Details Section */}
              {editData?.details && editData.details.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-700">
                    Details ({editData.details.length} items):
                  </label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {editData.details.map((detail, index) => (
                      <div key={`edit-detail-${index}`} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-600">SEQ:</label>
                            <input
                              type="text"
                              value={detail.seq || ""}
                              onChange={(e) => {
                                const updatedDetails = [...editData.details]
                                updatedDetails[index] = { ...detail, seq: e.target.value }
                                setEditData({ ...editData, details: updatedDetails })
                              }}
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-gray-600">TYPE:</label>
                            <input
                              type="text"
                              value={detail.type || ""}
                              onChange={(e) => {
                                const updatedDetails = [...editData.details]
                                updatedDetails[index] = { ...detail, type: e.target.value }
                                setEditData({ ...editData, details: updatedDetails })
                              }}
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600">REFERENCE:</label>
                          <textarea
                            value={detail.reference || ""}
                            onChange={(e) => {
                              const updatedDetails = [...editData.details]
                              updatedDetails[index] = { ...detail, reference: e.target.value }
                              setEditData({ ...editData, details: updatedDetails })
                            }}
                            className="w-full border border-gray-300 px-2 py-1 rounded text-sm h-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={2}
                          />
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedDetails = editData.details.filter((_, i) => i !== index)
                              setEditData({ ...editData, details: updatedDetails })
                            }}
                            className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Icon icon="heroicons:trash" className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </Modal>
        
      )}
    </div>
  )
}

export default LedItem