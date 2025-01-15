import React, { useEffect, useRef, useState } from "react"
import DataTable from "datatables.net-dt"
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css"
import "datatables.net-bs5"
import axiosInstance from "../../../utils/axiosConfig"
import $ from "jquery"
import "../../../styles/ProdiTable.css"

const ProdiTable = () => {
  const tableRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [prodiData, setProdiData] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState("All")
  const dataTableInstance = useRef(null)

  const fetchDepartments = async () => {
    try {
      const response = await axiosInstance.get("/jurusan")
      setDepartments(response.data)
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

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
    fetchDepartments()
    fetchProdi()

    return () => {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (!loading && tableRef.current) {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy()
      }

      let filteredData = prodiData
      if (selectedDepartment !== "All") {
        filteredData = prodiData.filter(
          (item) => item.jurusanId === selectedDepartment
        )
      }

      dataTableInstance.current = new DataTable(tableRef.current, {
        data: filteredData,
        columns: [
          {
            data: "name",
            title: "PROGRAM STUDI",
            className: "font-semibold",
            orderable: false, // tambahkan ini untuk mematikan sorting
          },
          {
            data: "nomorSK",
            title: "NOMOR SK",
            orderable: false,
          },
          {
            data: "tahunSK",
            title: "TAHUN SK",
            orderable: false,
          },
          {
            data: "peringkat",
            title: "PERINGKAT",
            orderable: false,
            render: (data) => {
              return `<span class="text-sm font-semibold text-blue bg-blue_badge rounded-lg px-2 py-1">
          ${data}
        </span>`
            },
          },
          {
            data: "tanggalKedaluwarsa",
            title: "TANGGAL KEDALUWARSA",
            orderable: false,
          },
        ],
        pageLength: 10,
        ordering: false, // matikan ordering/sorting secara global
        dom: '<"top"f>rt<"bottom d-flex justify-content-end"p><"clear">', // ubah dom structure
        language: {
          search: "Search prodi:",
          paginate: {
            next: "→",
            previous: "←",
          },
        },
        responsive: true,
        createdRow: function (row) {
          $(row).addClass("hover:bg-gray-50")
        },
      })
    }
  }, [loading, selectedDepartment, prodiData])

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value)
  }

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto mt-32">
        <div className="ml-32 mt-2 w-full">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full">
            <div className="min-h-[200px] flex items-center justify-center">
              <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-center">
                Loading table...
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto mt-32">
      <div className="ml-32 mt-2 w-full">
        <h1 className="text-2xl font-bold mb-6">Data Program Studi</h1>
        <div className="flex justify-end mb-4">
          <select
            onChange={handleDepartmentChange}
            value={selectedDepartment}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">Semua Jurusan</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 w-full">
          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className="w-full relative stripe hover"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProdiTable
