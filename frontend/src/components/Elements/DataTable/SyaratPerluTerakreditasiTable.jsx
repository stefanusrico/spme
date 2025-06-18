import React, { useState, useMemo, useEffect } from "react"
import { Icon } from "@iconify/react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button" // Pastikan kamu punya komponen Button ini
import axiosInstance from "../../../utils/axiosConfig"
import { Modal } from 'antd'

const SyaratPerluTerakreditasiTable = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [syaratPerluTerakreditasi, setSyaratPerluTerakreditasi] = useState([])

  useEffect(() => {
    const fetchSyaratPerluTerakreditasi = async () => {
      setLoading(true)
      try {
        const response = await axiosInstance.get(
          'get-syarat-perlu-terakreditasi/681517b1966aaaaf44047a88/68151b0d966aaaaf44047a93'
        );
        setSyaratPerluTerakreditasi(response.data.data); 
      } catch (error) {
        console.error('Error fetching syarat perlu terakreditasi:', error);
      } finally {
        setLoading(false)
      }
    };

    fetchSyaratPerluTerakreditasi();
  }, []);

  const handleEdit = (rowData) => {
    setEditData(rowData)
    setIsEditModalOpen(true)
  }

  const handleDelete = (id, butir) => {
    Modal.confirm({
      title: "Hapus Data",
      content: `Yakin ingin menghapus data butir "${butir}"?`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/delete-syarat-perlu-terakreditasi/${id}`);
          setSyaratPerluTerakreditasi((prev) => prev.filter((item) => item.id !== id));
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
        accessorKey: "no",
        header: "No",
        size: 200,
      },
      {
        accessorKey: "aspek_penilaian",
        header: "ASPEK PENILAIAN",
        size: 300,
      },
      {
        accessorKey: "keterangan",
        header: "KETERANGAN",
        size: 200,
      },
      {
        accessorKey: "butir",
        header: "BUTIR",
        size: 300,
      },
      {
        accessorKey: "skor_minimal",
        header: "SKOR MINIMAL",
        size: 300,
      },
      {
        id: "actions",
        header: () => <div className="text-center">ACTION</div>,
        size: 150,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleEdit(row.original)}
            >
              <Icon icon="heroicons-outline:pencil" className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleDelete(row.original.id, row.original.butir)}
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
    data: syaratPerluTerakreditasi,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
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
      <tr key={index} className="animate-pulse">
        {Array(columnLength).fill(0).map((__, colIndex) => (
          <td key={colIndex} className="px-4 py-2">
            <div className="h-6 bg-gray-200 rounded" />
          </td>
        ))}
      </tr>
    ))
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-lg w-full relative">
        {loading && <LoadingBar />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={`px-6 py-3 font-semibold text-left text-black uppercase tracking-wide ${
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

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <LoadingRow columnLength={columns.length} />
              ) : error ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-4 text-center text-red-500"
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
                      <td key={cell.id} className="px-6 py-4">
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
        <div className="flex items-center justify-between mt-4 mb-4 px-4 pt-4 border-t">
          <div className="text-sm text-gray-500 mb-4">
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} pages
          </div>
          <div className="flex gap-2 mb-4">
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
      {isEditModalOpen && (
        <Modal
          title="Edit Data"
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          onOk={async () => {
            try {
              await axiosInstance.put(`/update-syarat-perlu-terakreditasi/${editData.id}`, editData)
              setSyaratPerluTerakreditasi((prev) =>
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
          <div className="flex flex-col gap-4">
            <label>
              Butir:
              <input
                type="text"
                value={editData?.butir || ""}
                onChange={(e) =>
                  setEditData({ ...editData, butir: e.target.value })
                }
                className="w-full border px-3 py-1 rounded mt-1"
              />
            </label>
            <label>
              Aspek Penilaian:
              <input
                type="text"
                value={editData?.aspek_penilaian || ""}
                onChange={(e) =>
                  setEditData({ ...editData, aspek_penilaian: e.target.value })
                }
                className="w-full border px-3 py-1 rounded mt-1"
              />
            </label>
            <label>
              Keterangan:
              <input
                type="text"
                value={editData?.keterangan || ""}
                onChange={(e) =>
                  setEditData({ ...editData, keterangan: e.target.value })
                }
                className="w-full border px-3 py-1 rounded mt-1"
              />
            </label>
            <label>
              Skor Minimal:
              <input
                type="number"
                value={editData?.skor_minimal || ""}
                onChange={(e) => {
                  const value = Math.min(Number(e.target.value), 4) 
                  setEditData({ ...editData, skor_minimal: value })
                }}
                className="w-full border px-3 py-1 rounded mt-1"
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default SyaratPerluTerakreditasiTable
