import React, { useEffect, useRef, useState } from "react"
import { DataTable } from "simple-datatables"
import ProgressBar from "../Chart/ProgressBar"

const dataProgressAkreditasi = [
  [
    "D3-Teknik Mesin",
    "20/11/2024",
    "45",
    "12.09.2019-12.53 PM",
    "Budi Raharjo",
    "Submitted",
  ],
  [
    "D4-Teknik Sipil",
    "22/11/2024",
    "80",
    "15.10.2022-02.45 PM",
    "Siti Nurhaliza",
    "In Progress",
  ],
  [
    "D3-Teknik Informatika",
    "30/11/2024",
    "60",
    "10.07.2023-11.30 AM",
    "Agus Setiawan",
    "Not Started",
  ],
  [
    "D3-Keuangan",
    "05/12/2024",
    "90",
    "01.03.2024-09.20 AM",
    "Indah Permata",
    "Submitted",
  ],
  [
    "D4-Manajemen Bisnis",
    "15/12/2024",
    "55",
    "23.08.2021-10.15 AM",
    "Rendi Pratama",
    "In Progress",
  ],
  [
    "D3-Teknik Elektro",
    "10/12/2024",
    "70",
    "18.06.2022-04.40 PM",
    "Dewi Arianthi",
    "Submitted",
  ],
  [
    "D3-Kedokteran",
    "20/12/2024",
    "65",
    "05.02.2022-01.50 PM",
    "Ali Fauzi",
    "Submitted",
  ],
  [
    "D4-Pendidikan Bahasa Inggris",
    "25/12/2024",
    "40",
    "10.10.2023-03.00 PM",
    "Rina Maharani",
    "Not Started",
  ],
  [
    "D3-Teknik Mesin Otomotif",
    "28/12/2024",
    "85",
    "14.07.2023-10.00 AM",
    "Teguh Prasetyo",
    "In Progress",
  ],
  [
    "D4-Teknologi Pangan",
    "10/01/2025",
    "75",
    "17.05.2023-05.45 PM",
    "Farah Aliyah",
    "Submitted",
  ],
  [
    "D3-Teknik Komputer",
    "18/01/2025",
    "90",
    "01.06.2024-12.30 PM",
    "Joko Santoso",
    "Submitted",
  ],
  [
    "D4-Sistem Informasi",
    "22/01/2025",
    "50",
    "04.11.2023-09.10 AM",
    "Nina Suryani",
    "In Progress",
  ],
  [
    "D3-Desain Grafis",
    "25/01/2025",
    "60",
    "22.08.2024-01.25 PM",
    "Fitria Dewi",
    "Not Started",
  ],
  [
    "D4-Kehutanan",
    "28/01/2025",
    "80",
    "12.04.2023-02.30 PM",
    "Maya Kusuma",
    "Submitted",
  ],
  [
    "D3-Perhotelan",
    "02/02/2025",
    "95",
    "29.06.2023-04.00 PM",
    "Lina Septiana",
    "In Progress",
  ],
  [
    "D3-Penyiaran",
    "10/02/2025",
    "85",
    "08.09.2023-11.50 AM",
    "Rico Gunawan",
    "Submitted",
  ],
  [
    "D4-Logistik",
    "15/02/2025",
    "70",
    "13.01.2023-02.45 PM",
    "Rina Susanti",
    "Not Started",
  ],
  [
    "D3-Animasi",
    "20/02/2025",
    "60",
    "24.10.2023-03.30 PM",
    "Andi Prabowo",
    "In Progress",
  ],
  [
    "D3-Perbankan",
    "25/02/2025",
    "55",
    "30.05.2023-08.20 AM",
    "Putri Ayu",
    "Submitted",
  ],
  [
    "D4-Teknologi Informasi",
    "01/03/2025",
    "50",
    "20.12.2023-10.10 AM",
    "Hendra Wijaya",
    "In Progress",
  ],
]

const getColorStatus = () => {
  return dataProgressAkreditasi.map((dataProgress) => {
    switch (dataProgress[5]) {
      case "Not Started":
        return "red"
      case "In Progress":
        return "yellow"
      case "Submitted":
        return "green"
      default:
        return "gray"
    }
  })
}

const ProgressAkreditasiTable = () => {
  const tableRef = useRef(null)
  const [statusFilter, setStatusFilter] = useState("All")
  const statusColors = getColorStatus()

  useEffect(() => {
    console.log(statusColors)
    if (tableRef.current) {
      const dataTable = new DataTable(tableRef.current, {
        searchable: false,
        sortable: false,
        perPage: 5,
      })

      const filterDataByStatus = () => {
        const rows = tableRef.current.querySelectorAll("tbody tr")
        rows.forEach((row) => {
          const status = row.cells[5].textContent
          console.log(status)
          if (statusFilter === "All" || status === statusFilter) {
            row.style.display = ""
          } else {
            row.style.display = "none"
          }
        })
      }

      filterDataByStatus()
    }
  }, [statusFilter])

  return (
    <div className="bg-white border border-gray rounded-lg shadow p-6 w-full max-w-[1425px]">
      <div
        className="filter-section"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <label htmlFor="tableTitle" className="text-3xl font-bold">
          Progress Akreditasi
        </label>
        <select
          id="statusFilter"
          onChange={(e) => setStatusFilter(e.target.value)}
          value={statusFilter}
        >
          <option value="All">All</option>
          <option value="Submitted">Submitted</option>
          <option value="In Progress">In Progress</option>
          <option value="Not Started">Not Started</option>
        </select>
      </div>

      <table id="search-table" ref={tableRef} className="styled-table">
        <thead>
          <tr>
            <th>Program Studi</th>
            <th>Start Date</th>
            <th>Completion Progress</th>
            <th>Submission Timestamp</th>
            <th>Submitted By</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {dataProgressAkreditasi.map((dataProgress, index) => (
            <tr key={index}>
              <td>{dataProgress[0]}</td>
              <td>{dataProgress[1]}</td>
              <td>
                <ProgressBar progress={dataProgress[2]} />
              </td>
              <td>{dataProgress[3]}</td>
              <td>{dataProgress[4]}</td>
              <td
                className={`text-black bg-${statusColors[index]} hover:bg-${statusColors[index]} focus:outline-none focus:ring-4 focus:ring-${statusColors[index]} font-normal rounded-full text-xs px-4 py-1 text-center dark:bg-${statusColors[index]} dark:hover:bg-${statusColors[index]} dark:focus:ring-${statusColors[index]}`}
              >
                {dataProgress[5]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ProgressAkreditasiTable
