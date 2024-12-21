import CardProgress from "../components/Elements/CircularProgress/CardProgress"
import Card from "../components/Elements/Card/Card"
import ProgressAkreditasiTable from "../components/Elements/DataTable/ProgressAkreditasiTable"
import ProgressBar from "../components/Elements/Chart/ProgressBar"

const TestingPage = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <ProgressAkreditasiTable></ProgressAkreditasiTable>
    </div>
  )
}

export default TestingPage
