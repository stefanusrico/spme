import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { differenceInMonths, format } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import axiosInstance from "../../../utils/axiosConfig"

const LoadingBar = () => (
  <div className="relative h-1 bg-gray-100 overflow-hidden">
    <div className="absolute top-0 h-1 bg-blue loading-bar w-full"></div>
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

const ProdiTable = () => {
  const [prodiData, setProdiData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const columnHelper = createColumnHelper()

  const getSubmitDateStatus = (submitDate) => {
    if (!submitDate) return "normal"

    const today = new Date()
    const submitDateTime = new Date(submitDate)
    const monthDiff = differenceInMonths(submitDateTime, today)

    if (monthDiff < 0) return "past"
    if (monthDiff <= 6) return "urgent"
    if (monthDiff <= 36) return "warning"
    return "normal"
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "PROGRAM STUDI",
        cell: (info) => info.getValue(),
        size: 400,
      }),
      columnHelper.accessor("akreditasi.nomorSK", {
        header: <div className="text-center">NOMOR SK</div>,
        cell: (info) => info.getValue() || "",
        size: 600,
      }),
      columnHelper.accessor("akreditasi.tahun", {
        header: <div className="text-center">TAHUN SK</div>,
        cell: (info) => (
          <span className="block text-center w-full">{info.getValue()}</span>
        ),
        size: 500,
      }),
      columnHelper.accessor("akreditasi.peringkat", {
        header: "PERINGKAT",
        cell: (info) => (
          <span className="text-sm flex w-24 text-center justify-center font-semibold text-blue bg-blue_badge rounded-lg px-2 py-1">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("akreditasi.tanggalKedaluwarsa", {
        header: "TANGGAL KEDALUWARSA",
        cell: (info) => format(new Date(info.getValue()), "dd-MM-yyyy"),
      }),
      columnHelper.accessor("tanggalSubmit", {
        header: "TANGGAL AKHIR SUBMIT",
        cell: (info) => {
          const submitDate = info.getValue()
          const status = getSubmitDateStatus(submitDate)
          const formattedDate = format(new Date(submitDate), "dd-MM-yyyy")

          const statusClasses = {
            urgent: "bg-blue_badge text-black rounded",
            warning: "bg-orange_badge text-black rounded",
            past: "bg-red_badge text-black rounded",
          }

          return (
            <span
              className={`text-sm px-2 py-1 ${statusClasses[status] || ""}`}
            >
              {formattedDate}
            </span>
          )
        },
        size: 300,
      }),
      columnHelper.accessor("tanggalPengumuman", {
        header: "TANGGAL PENGUMUMAN",
        cell: (info) => format(new Date(info.getValue()), "dd-MM-yyyy"),
      }),
      columnHelper.accessor("lam.name", {
        header: "LEMBAGA AKREDITASI",
        cell: (info) => info.getValue(),
      }),
    ],
    []
  )

  const table = useReactTable({
    data: prodiData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const fetchProdi = async () => {
    try {
      const response = await axiosInstance.get("/prodi")
      setProdiData(response.data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching prodi:", error)
      setError("Failed to load data")
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProdi()
  }, [])

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">Data Program Studi</h1>

      <div className="bg-white rounded-xl shadow-lg p-4 w-full relative">
        {loading && <LoadingBar />}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={`px-6 py-3 text-left text-sm font-bold text-black uppercase tracking-wider bg-gray ${
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
              ) : prodiData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center text-gray-500 py-4"
                  >
                    No data found
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
                        style={{ width: cell.column.getSize() }}
                        className="px-4 py-2"
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

        {!loading && prodiData.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-4">
            <div className="text-sm text-gray-600">
              Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {table.getPageOptions().map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => table.setPageIndex(pageNumber)}
                  className={`px-3 py-1 rounded-md ${
                    table.getState().pagination.pageIndex === pageNumber
                      ? "bg-blue text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {pageNumber + 1}
                </button>
              ))}

              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProdiTable
