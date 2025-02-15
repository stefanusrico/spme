import { useEffect, useState } from "react"
import CardProgress from "../Elements/CircularProgress/CardProgress"
import Card from "../Elements/Card/Card"
import ProgressAkreditasiTable from "../Elements/DataTable/ProgressAkreditasiTable"
import "../../index.css"
import axiosInstance from "../../utils/axiosConfig"

const MonitoringAkreditasi = () => {
  const [peringkatCount, setPeringkatCount] = useState([])

  useEffect(() => {
    axiosInstance
      .get("/count")
      .then((response) => {
        setPeringkatCount(response.data)
      })
      .catch((error) => {
        console.error("There was an error fetching peringkat count!", error)
      })
  }, [])

  const getPeringkatValue = (peringkat) => {
    const item = peringkatCount.find((item) => item.peringkat === peringkat)
    return item ? item.count : 0
  }
  return (
    <div className="w-full mx-auto">
      <div className="mt-10 bg-white border border-gray rounded-lg shadow border-gray p-6 w-full flex justify-between">
        <div className="w-full flex ml-8 gap-8 items-center">
          <Card title="Akreditasi Unggul" value={getPeringkatValue("Unggul")} />
          <Card
            title="Akreditasi Baik Sekali"
            value={getPeringkatValue("Baik Sekali")}
          />
          <Card title="Akreditasi Baik" value={getPeringkatValue("Baik")} />
        </div>
        <div className="flex flex-col justify-center items-center gap-4 mr-2">
          <CardProgress
            currentStatus={2}
            totalStatus={4}
            status="submitted"
            statusText="Submitted"
          />
          <CardProgress
            currentStatus={4}
            totalStatus={4}
            status="inprogress"
            statusText="In Progress"
          />
          <CardProgress
            currentStatus={2}
            totalStatus={4}
            status="notsubmitted"
            statusText="Not Started"
          />
        </div>
      </div>

      <div className="mt-2 w-full rounded-lg">
        <ProgressAkreditasiTable />
      </div>
    </div>
  )
}

export default MonitoringAkreditasi
