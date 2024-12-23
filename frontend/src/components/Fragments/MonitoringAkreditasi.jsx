import CardProgress from "../Elements/CircularProgress/CardProgress"
import Card from "../Elements/Card/Card"
import ProgressAkreditasiTable from "../Elements/DataTable/ProgressAkreditasiTable"
import "../../index.css"

const MonitoringAkreditasi = () => {
  return (
    <div className="w-full max-w-[1600px] mx-auto mt-5">
      <div className="ml-32 mt-10 bg-white border border-gray-300 rounded-lg shadow bg-white border-gray p-6 w-full flex justify-between">
        <div className="ml-5 flex gap-8 items-center">
          <Card title="Akreditasi Unggul" value="13" />
          <Card title="Akreditasi Baik Sekali" value="13" />
          <Card title="Akreditasi Baik" value="13" />
        </div>
        <div className="flex flex-col justify-center items-center gap-4 mr-8">
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

      <div className="ml-32 mt-2 w-full rounded-lg">
        <ProgressAkreditasiTable />
      </div>
    </div>
  )
}

export default MonitoringAkreditasi
