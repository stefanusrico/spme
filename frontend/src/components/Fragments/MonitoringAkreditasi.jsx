import { useEffect, useState } from "react"
import CardProgress from "../Elements/CircularProgress/CardProgress"
import Card from "../Elements/Card/Card"
import ProgressAkreditasiTable from "../Elements/DataTable/ProgressAkreditasiTable"
import "../../index.css"
import axiosInstance from "../../utils/axiosConfig"
import { useProjects } from "../../hooks/useProjects"

const MonitoringAkreditasi = () => {
  const [peringkatCount, setPeringkatCount] = useState([])
  const { stats: projectStats } = useProjects() // Use the shared hook

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
    <div className="w-full">
      <div className="mt-6 bg-white border border-gray rounded-lg shadow p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-4">
          {/* First section - Cards */}
          <div className="w-full flex flex-wrap justify-center sm:justify-between lg:justify-start gap-4">
            <Card
              title="Akreditasi Unggul"
              value={getPeringkatValue("Unggul")}
            />
            <Card
              title="Akreditasi Baik Sekali"
              value={getPeringkatValue("Baik Sekali")}
            />
            <Card title="Akreditasi Baik" value={getPeringkatValue("Baik")} />
          </div>

          {/* Second section - Progress circles */}
          <div className="flex flex-row lg:flex-col justify-center items-center gap-4 pb-2">
            <div className="flex-shrink-0">
              <CardProgress
                currentStatus={projectStats.submitted}
                totalStatus={projectStats.total}
                status="submitted"
                statusText="Submitted"
              />
            </div>
            <div className="flex-shrink-0">
              <CardProgress
                currentStatus={projectStats.inProgress}
                totalStatus={projectStats.total}
                status="inprogress"
                statusText="In Progress"
              />
            </div>
            <div className="flex-shrink-0">
              <CardProgress
                currentStatus={projectStats.notStarted}
                totalStatus={projectStats.total}
                status="notsubmitted"
                statusText="Not Started"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 w-full">
        <ProgressAkreditasiTable />
      </div>
    </div>
  )
}

export default MonitoringAkreditasi
