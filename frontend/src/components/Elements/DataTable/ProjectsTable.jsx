import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import axiosInstance from "../../../utils/axiosConfig"
import ProgressBar from "../Chart/ProgressBar"
import AddProjectModal from "../Modals/AddProjectModal"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// Komponen LoadingBar dan LoadingRow tetap sama (tidak perlu diubah)
const LoadingBar = () => (
  <div className="relative h-1 bg-gray-100 overflow-hidden">
    <div className="absolute top-0 h-1 bg-blue loading-bar"></div>
  </div>
)

const LoadingRow = ({ colSpan }) => {
  const skeletonData = [1, 2, 3, 4, 5]

  return (
    <>
      {skeletonData.map((item, index) => (
        <tr key={index} className="animate-pulse">
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-12" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-3/4" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-8" />
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray rounded-full" />
              <div className="h-4 bg-gray rounded w-24" />
            </div>
          </td>
          <td className="px-4 py-2">
            <div className="h-6 bg-gray rounded w-16" />
          </td>
          <td className="px-4 py-2">
            <div className="h-2 bg-gray rounded w-full" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-20" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 bg-gray rounded w-20" />
          </td>
        </tr>
      ))}
    </>
  )
}

const ProjectsTable = ({ isCollapsed }) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const columnHelper = createColumnHelper()

  // Definisi kolom tetap sama
  const columns = useMemo(
    () => [
      columnHelper.accessor("projectId", {
        header: "ID",
        size: 100,
      }),
      columnHelper.accessor("name", {
        header: "PROJECT NAME",
        cell: ({ row }) => (
          <div className="flex items-center justify-between gap-2 group">
            {" "}
            {/* Tambahkan 'group' di sini */}
            <span className="truncate" title={row.original.name}>
              {row.original.name}
            </span>
            <Link
              to={`/projects/${row.original.id}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out bg-blue_badge text-blue text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-400 whitespace-nowrap shrink-0"
            >
              Access Project
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("progress", {
        header: "%",
        size: 80,
        cell: ({ getValue }) => `${getValue()}%`,
      }),
      columnHelper.accessor("owner", {
        header: "OWNER",
        size: 150,
        cell: ({ row }) => (
          // Perbaiki tampilan owner agar lebih rapi
          <div className="flex items-center gap-2">
            {row.original.owner.profile_picture ? ( // Cek null/undefined
              <img
                src={row.original.owner.profile_picture}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0" // Tambahkan flex-shrink-0
              />
            ) : (
              // Placeholder jika tidak ada gambar
              <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>
            )}
            {/* Tambahkan truncate jika nama panjang */}
            <span className="truncate">{row.original.owner.name}</span>
          </div>
        ),
      }),
      columnHelper.accessor("status", {
        header: "STATUS",
        size: 120,
        cell: ({ getValue }) => {
          const status = getValue()
          const className =
            status === "ACTIVE"
              ? "text-green bg-green_badge"
              : "bg-red_badge text-red"
          return (
            <span
              className={`text-sm text-center font-semibold rounded-lg px-2 py-1 ${className}`}
            >
              {status}
            </span>
          )
        },
      }),
      columnHelper.accessor("task", {
        header: () => <div className="text-center">TASK</div>,
        size: 150,
        cell: ({ getValue }) => (
          <div className="mx-auto w-full flex justify-center">
            <ProgressBar progress={getValue()} />
          </div>
        ),
      }),
      columnHelper.accessor("startDate", {
        header: "START DATE",
        size: 200,
      }),
      columnHelper.accessor("endDate", {
        header: "END DATE",
        size: 200,
      }),
    ],
    [columnHelper]
  )

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Fungsi handleInputChange dan handleSubmit tetap sama
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await axiosInstance.post("/project", formData)
      if (response.data.status === "success") {
        setFormData({ name: "", startDate: "", endDate: "" })
        fetchProjects() // Panggil fetchProjects lagi untuk refresh data
        toast.success("Project berhasil dibuat!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
        setShowModal(false)
      } else {
        // Tambahkan penanganan jika status bukan success tapi tidak error
        toast.error(response.data.message || "Gagal membuat project", {
          position: "top-right",
          autoClose: 3000 /* ... other options */,
        })
      }
    } catch (err) {
      console.error("Error creating project:", err)
      toast.error(err.response?.data?.message || "Gagal membuat project", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- PERBAIKAN UTAMA DI SINI ---
  const fetchProjects = async () => {
    setLoading(true)
    try {
      // 1. Ambil semua data project
      const projectsResponse = await axiosInstance.get("/projects")

      if (
        projectsResponse.data.status === "success" &&
        projectsResponse.data.data
      ) {
        const rawProjects = projectsResponse.data.data

        // 2. Kumpulkan semua ID unik dari 'createdBy'
        const uniqueUserIds = [
          ...new Set(
            rawProjects.map((project) => project.createdBy).filter(Boolean)
          ), // filter(Boolean) untuk menghapus null/undefined
        ]

        let usersMap = {} // Peta untuk menyimpan data user { userId: userData }

        // 3. Hanya fetch data user jika ada ID unik yang ditemukan
        if (uniqueUserIds.length > 0) {
          // Buat array promise untuk mengambil data setiap user unik
          const userPromises = uniqueUserIds.map((userId) =>
            axiosInstance
              .get(`/users/${userId}`)
              .then((res) => {
                if (res.data.status === "success" && res.data.data) {
                  // Pastikan respons valid sebelum menggunakannya
                  return { id: userId, data: res.data.data } // Kembalikan ID bersama data
                }
                console.warn(`User data not found or invalid for ID: ${userId}`)
                return { id: userId, data: null } // Kembalikan null jika data tidak valid
              })
              .catch((err) => {
                console.error(`Error fetching user data for ID ${userId}:`, err)
                return { id: userId, data: null } // Kembalikan null jika terjadi error
              })
          )

          // Jalankan semua promise secara bersamaan
          const usersResults = await Promise.all(userPromises)

          // 4. Buat map dari hasil fetch user untuk akses cepat
          usersMap = usersResults.reduce((acc, result) => {
            if (result && result.data) {
              // Cek jika result dan data ada
              acc[result.id] = result.data // Gunakan ID asli sebagai key
            }
            return acc
          }, {})
        }

        // 5. Gabungkan data project dengan data user dari map
        const projectsWithUserData = rawProjects.map((project) => {
          const userData = usersMap[project.createdBy] || {} // Ambil data user, fallback ke objek kosong jika tidak ada

          return {
            projectId: project.projectId,
            name: project.name,
            progress: project.progress || 0,
            owner: {
              userId: project.createdBy,
              // Fallback ke ID jika nama tidak ditemukan
              name:
                userData?.name ||
                `User ID: ${project.createdBy}` ||
                "Unknown Owner",
              profile_picture: userData?.profile_picture || null, // Fallback ke null
            },
            status: project.status,
            task: project.progress || 0, // Asumsi task sama dengan progress
            startDate: new Date(project.startDate).toLocaleDateString(),
            endDate: new Date(project.endDate).toLocaleDateString(),
            id: project.id,
          }
        })

        setProjects(projectsWithUserData)
      } else {
        // Tangani jika /projects tidak sukses atau tidak ada data
        console.error(
          "Failed to fetch projects or no projects data received:",
          projectsResponse.data
        )
        setProjects([]) // Set ke array kosong jika gagal
        toast.error("Gagal memuat data project.", {
          position: "top-right" /* ... */,
        })
      }
    } catch (err) {
      console.error("Error fetching projects:", err)
      setProjects([]) // Set ke array kosong jika error
      toast.error("Gagal memuat data project.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } finally {
      setLoading(false)
    }
  }
  // --- AKHIR PERBAIKAN ---

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Dependency array kosong agar hanya dijalankan sekali saat mount

  // Render JSX sisanya tetap sama
  return (
    <div className="p-3 w-full">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button
          className="bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 hover:bg-blue-700" // Tambahkan hover effect
          onClick={() => setShowModal(true)}
        >
          Add project
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="overflow-x-auto overflow-y-hidden relative">
          {/* Loading Bar di atas tabel */}
          {loading && <LoadingBar />}
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider bg-gray ${
                        // Ubah px-6 ke px-4, text-normal ke text-xs
                        index === 0 ? "rounded-l-lg" : ""
                      } ${
                        index === headerGroup.headers.length - 1
                          ? "rounded-r-lg"
                          : ""
                      }`}
                      style={{
                        width:
                          header.column.getSize() !== 150 // Default size dari react-table
                            ? header.column.getSize()
                            : undefined, // Biarkan browser/CSS menghandle jika size = default
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {/* Hapus div loading absolut sebelumnya, karena LoadingBar sudah ada */}
            {/* <tbody className="mt-4"> */} {/* Hapus mt-4 dari tbody */}
            <tbody>
              {loading ? (
                <LoadingRow colSpan={columns.length} />
              ) : projects.length === 0 ? ( // Tampilkan pesan jika tidak ada data
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-10 text-gray-500"
                  >
                    No projects found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group hover:bg-gray-50 transition-colors border-b last:border-b-0" // Tambahkan border antar baris
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 whitespace-nowrap" // Tambahkan whitespace-nowrap
                        style={{
                          width:
                            cell.column.getSize() !== 150
                              ? cell.column.getSize()
                              : undefined,
                        }}
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
      </div>

      <AddProjectModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

export default ProjectsTable
