import { useEffect, useRef, useState } from "react"
import DataTable from "datatables.net-dt"
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css"
import "datatables.net-bs5"
import axiosInstance from "../../../utils/axiosConfig"
import $ from "jquery"
import "../../../styles/ProdiTable.css"

const ProdiTable = ({ isCollapsed }) => {
  const tableRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [prodiData, setProdiData] = useState([])
  const dataTableInstance = useRef(null)

  const fetchProdi = async () => {
    try {
      const response = await axiosInstance.get("/prodi")
      setProdiData(response.data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching prodi:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProdi()
    return () => {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (dataTableInstance.current) {
      setTimeout(() => {
        dataTableInstance.current.columns.adjust()
      }, 300)
    }
  }, [isCollapsed])

  useEffect(() => {
    console.log("Collapsed status:", isCollapsed)
  }, [isCollapsed])

  useEffect(() => {
    if (!loading && tableRef.current) {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy()
      }

      dataTableInstance.current = new DataTable(tableRef.current, {
        data: prodiData,
        columns: [
          {
            data: "name",
            title: "PROGRAM STUDI",
            orderable: false,
            width: "20%",
          },
          {
            data: "nomorSK",
            title: "NOMOR SK",
            orderable: false,
            width: "16%",
          },
          {
            data: "tahunSK",
            title: "TAHUN SK",
            orderable: false,
            width: "10%",
          },
          {
            data: "peringkat",
            title: "PERINGKAT",
            orderable: false,
            width: "10%",
            render: (data) =>
              `<span class="text-sm font-semibold text-blue bg-blue_badge rounded-lg px-2 py-1">${data}</span>`,
          },
          {
            data: "tanggalKedaluwarsa",
            title: "TANGGAL KEDALUWARSA",
            orderable: false,
            width: "15%",
            render: (data) =>
              new Date(data)
                .toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
                .split("/")
                .join("-"),
          },
          {
            data: "tanggalAkhirSubmit",
            title: "TANGGAL AKHIR SUBMIT",
            orderable: false,
            width: "15%",
            render: (data) =>
              new Date(data)
                .toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
                .split("/")
                .join("-"),
          },
          {
            data: "tanggalPengumuman",
            title: "TANGGAL PENGUMUMAN",
            orderable: false,
            width: "20%",
            render: (data) =>
              new Date(data)
                .toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
                .split("/")
                .join("-"),
          },
        ],
        pageLength: 10,
        ordering: false,
        paging: true,
        info: false,
        searching: false,
        responsive: false,
        scrollX: true,
        dom: '<"wrapper"t<"bottom"p>>',
        pagingType: "simple_numbers",
        language: {
          paginate: {
            next: "→",
            previous: "←",
            numbers: "",
          },
        },
      })

      $(tableRef.current).on("page.dt", function () {
        setTimeout(() => {
          window.scrollTo(0, tableRef.current.offsetTop)
        }, 0)
      })
    }
  }, [loading, prodiData])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 w-full mt-32">
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="bg-white shadow-md rounded-lg p-6">
            Loading table...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-32 w-full">
      <h1 className="text-2xl font-bold mb-6">Data Program Studi</h1>
      <div className="bg-white rounded-xl shadow-lg p-6 w-full">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full relative stripe hover" />
        </div>
      </div>
    </div>
  )
}

export default ProdiTable
