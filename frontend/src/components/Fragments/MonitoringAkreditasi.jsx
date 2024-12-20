import React from "react"
import CardProgress from "../Elements/CircularProgress/CardProgress"
import Card from "../Elements/Card/Card"

const MonitoringAkreditasi = () => {
  return (
    <div className="ml-64 bg-white border border-gray-300 rounded-lg shadow bg-white border-gray p-6 w-full max-w-[1425px] flex justify-between mb-96 mt-10">
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
  )
}

export default MonitoringAkreditasi
