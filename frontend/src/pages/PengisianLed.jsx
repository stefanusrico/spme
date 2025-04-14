import {
  fetchAllProdi,
  fetchUserTask,
  fetchAllTaskByProdi,
  updateUserTask,
  changeNoSub,
  fetchVersionByProdi,
  fetchMatriksByProdi,
  storeVersion,
  fetchVersionProdiReference,
  addPreviewToFiles,
} from "./PengisianLed"
import { useState, useEffect, version } from "react"
import { useParams, useNavigate } from "react-router-dom"
import ScrollableTabs from "../components/Elements/Tabs"
import Button from "../components/Elements/Button"
import DropdownWithSearch from "../components/Elements/Dropdown/WithSearch"
import BarProgress from "../components/Elements/CircularProgress/BarProgress"
import ColorRangeDropdown from "../components/Elements/Dropdown/ColorRangeDropdown"
import PengisianLedTableNew from "../components/Elements/DataTable/PengisianLedTableNew"
import HeaderPengisianLedTable from "../components/Elements/DataTable/HeaderPengisianLedTable"
import VerticalLinearStepper from "../components/Elements/Stepper"
import { ToastContainer, toast } from "react-toastify"
import { FormToast } from "../components/Elements/FormToast"
import "react-toastify/dist/ReactToastify.css"

const PengisianLed = () => {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [prodi, setProdi] = useState([])
  const [colors, setColors] = useState([])
  const { no = "", sub = "" } = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isVersion, setIsVersion] = useState(false)
  const [user, setUser] = useState({})
  const [allDataTasks, setAllDataTasks] = useState([])
  const [isDataReady, setIsDataReady] = useState(false)
  const [isReference, setIsReference] = useState(false)
  const [allDataVersion, setAllDataVersion] = useState([])
  const [allDataMatriks, setAllDataMatriks] = useState([])
  const [versionSelected, setVersionSelected] = useState("")
  const [viewAllVersion, setViewAllVersion] = useState(false)
  const [isTaskAvailable, setIsTaskAvailable] = useState(true)
  const [isLoadingVersion, setIsLoadingVersion] = useState(false)
  const [dataVersionHistory, setDataVersionHistory] = useState([])
  const [filteredDataMatriks, setFilteredDataMatriks] = useState([])
  const [filteredDataVersion, setFilteredDataVersion] = useState([])
  const [filteredDataHistory, setFilteredDataHistory] = useState([])
  const [dataVersionReference, setDataVersionReference] = useState([])
  const [filteredDataReference, setFilteredDataReference] = useState([])
  const [selectedProdi, setSelectedProdi] = useState({ name: "", id: "" })

  const [dataMatriks, setDataMatriks] = useState({
    C: "",
    "No.": "",
    Sub: "",
    Details: [],
  })

  // Mengambil data program studi
  useEffect(() => {
    const userLocalhost = localStorage.getItem("user")
    const jsonUserLocalhost = JSON.parse(userLocalhost)
    const currentUserProdiId = jsonUserLocalhost.prodiId

    console.log(jsonUserLocalhost)
    setUser(jsonUserLocalhost)

    const getAllProdi = async () => {
      try {
        const data = await fetchAllProdi()
        setProdi(data)
        toast.success("Berhasil fetch Prodi")
      } catch (error) {
        toast.error("Gagal fetch Prodi")
      }
    }

    const getUserTask = async () => {
      try {
        const data = await fetchUserTask()
        setTasks(data)
        toast.success("Berhasil fetch Task")
      } catch (error) {
        toast.error("Gagal fetch Task")
      }
    }

    const getAllDataTasks = async () => {
      try {
        const data = await fetchAllTaskByProdi(currentUserProdiId)
        setAllDataTasks(data)
        toast.success("berhasil fetch semua data task")
      } catch (error) {
        toast.error("gagal fetch semua data tasks")
      }
    }

    const getAllVersionByProdi = async () => {
      try {
        const data = await fetchVersionByProdi(currentUserProdiId)
        console.log("all data version : ", data)
        setAllDataVersion(data)
      } catch (error) {
        toast.error("gagal fetch semua data version")
      }
    }

    const getAllDataMatriks = async () => {
      try {
        const data = await fetchMatriksByProdi(currentUserProdiId)
        console.log("data matriks :", data)
        setAllDataMatriks(data)
      } catch (error) {}
    }

    getAllVersionByProdi() //untuk warna tab
    getAllDataMatriks() //untuk header, diambil semua biar sekali aja
    getUserTask() //untuk tab
    getAllDataTasks() //untuk menambahkan tab task
    getAllProdi() //untuk dropdown piilih referensi
  }, [])

  useEffect(() => {
    const getLatestVersion = (dataArray) => {
      if (!Array.isArray(dataArray)) return null

      const filteredByParams = dataArray.filter(
        (item) => String(item.task?.no) === no && String(item.task?.sub) === sub
      )

      console.log("filtered By param:", filteredByParams)

      const latestVersions = filteredByParams.reduce((acc, current) => {
        const key = `${current.task?.no}-${current.task?.sub}`

        if (
          !acc[key] ||
          new Date(current.created_at) > new Date(acc[key].created_at)
        ) {
          acc[key] = current
        }

        return acc
      }, {})

      return Object.values(latestVersions)[0] || null
    }

    if (Array.isArray(allDataMatriks)) {
      const filtered =
        allDataMatriks.find((item) => item.no === no && item.sub === sub) ||
        null
      setFilteredDataMatriks(filtered)
      console.log("filtered data:", filtered)
    }

    if (Array.isArray(dataVersionHistory)) {
      const filtered = dataVersionHistory.filter(
        (item) =>
          String(item.task.no) === String(no) &&
          String(item.task.sub) === String(sub)
      )

      setFilteredDataHistory(filtered)
      console.log("filtered data history:", filtered)

      setVersionSelected(filtered.length > 1 ? "1" : "0")
    }

    setFilteredDataVersion(getLatestVersion(allDataVersion))
    setFilteredDataReference(getLatestVersion(dataVersionReference))
  }, [
    no,
    sub,
    allDataMatriks,
    allDataVersion,
    dataVersionReference,
    dataVersionHistory,
  ])

  useEffect(() => {
    console.log(filteredDataMatriks)

    if (!filteredDataVersion) {
      const detailsArray = (filteredDataMatriks?.details || [])
        .filter((item) => item.Type === "K") // Filter hanya Type "K"
        .map((item) => ({
          data_pendukung: item["Data Pendukung"] || null,
          isian_asesi: item["Isian Asesi"] || null,
          masukan: item["Masukan"] || null,
          nilai: item["Nilai"] || null,
          reference: item["Reference"] || null,
          seq: item.Seq,
          type: item.Type,
        }))

      // Jika filteredDataVersion null, buat template JSON default
      const defaultVersion = {
        c: filteredDataMatriks?.c || "",
        commit: "",
        details: detailsArray,
        komentar: null,
        prodiId: user.prodiId,
        task: {
          taskId: "TSK-001",
          projectId: "",
          taskListId: "",
          no: 0,
          sub: "",
        },
        taskId: "",
        user_id: user.id,
      }

      setFilteredDataVersion(defaultVersion)
    }

    if (filteredDataMatriks && filteredDataVersion) {
      setIsDataReady(true)
      setIsLoading(false)
    }
  }, [filteredDataMatriks])

  useEffect(() => {
    console.log("Version selected: ", versionSelected)
    setIsVersion(true)
  }, [versionSelected, filteredDataHistory])

  useEffect(() => {
    if (
      filteredDataReference &&
      Object.keys(filteredDataReference).length > 0
    ) {
      console.log("data reference : ", filteredDataReference)
      setIsReference(true)
    }
  }, [filteredDataReference])

  useEffect(() => {
    console.log("prodi reference", selectedProdi)
    const getAllVersionByProdi = async () => {
      try {
        const data = await fetchVersionByProdi(selectedProdi.id)
        console.log("all data version reference : ", data)
        setDataVersionReference(data)
      } catch (error) {
        toast.error("gagal fetch semua data version reference")
      }
    }

    getAllVersionByProdi()
  }, [selectedProdi])

  const toastContainerStyle = {
    zIndex: 20000,
  }

  const updateColor = (data) => {
    setColors(data)
  }

  const changeNoSub = (newNo, newSub) => {
    navigate(`/pengisian-matriks-led/${newNo}/${newSub}`)
  }

  const updateDataIsian = (updateDataIsian) => {
    console.log("update data isian parent :", updateDataIsian)
    console.log("filtered data verison parent : ", filteredDataVersion)
    setFilteredDataVersion(updateDataIsian)
    // setDataIsian(updatedData);
  }

  const updateDataIsianReference = (updateDataIsian) => {
    console.log("update data isian parent :", updateDataIsian)
    console.log("filtered data verison parent : ", filteredDataVersion)
    // setDataIsian(updatedData);
  }

  const handleClickVersion = () => {
    const getAllVersionByProdi = async () => {
      try {
        const data = await fetchVersionByProdi(user.prodiId)
        console.log("all data version reference : ", data)
        setDataVersionHistory(data)
      } catch (error) {
        toast.error("gagal fetch semua data version history")
      }
    }

    getAllVersionByProdi()
  }

  const handleShowToast = () => {
    toast(
      <FormToast
        closeToast={() => toast.dismiss()}
        dataIsian={filteredDataVersion}
        noSub={`${no}${sub}`}
        title="Versi Baru Dibuat"
        message="Tambahkan pesan untuk perubahan"
        onSubmit={storeVersion}
      />,
      {
        position: "bottom-right", // Posisi toast
        autoClose: false, // Tidak menutup otomatis
        closeOnClick: false, // Klik di luar tidak menutup
        draggable: false, // Tidak bisa diseret
      }
    )
  }

  const handleVersionChange = (newIndex) => {
    setVersionSelected(newIndex.toString())
  }

  return (
    <div className="h-[80vh] w-auto mt-4 mr-4 pb-4 overflow-y-auto bg-white shadow-lg rounded-lg p-4">
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
        style={toastContainerStyle}
        className="toast-container-custom"
      />

      {/*Untuk Prodi, progress, dan color*/}
      <div className="flex justify-center space-x-4 mt-4 mb-4">
        <DropdownWithSearch
          name="prodi"
          options={prodi.map((prodi) => ({
            id: prodi.id,
            value: prodi.name,
            label: prodi.name,
          }))}
          value={selectedProdi.name}
          onChange={(newValue) =>
            setSelectedProdi({ name: newValue?.value || "", id: newValue.id })
          }
          sizeSelect="w-60 h-18"
          placeholder={
            selectedProdi.name ? selectedProdi.name : "Pilih Program Studi"
          }
        />
        <BarProgress progress={"60"} />
        <ColorRangeDropdown isLoading={false} dataColors={updateColor} />
      </div>

      {/*Untuk tab matriks, referensi, pengisian matriks sekarang, version */}
      {isTaskAvailable ? (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-normal font-semibold">Loading...</p>
            </div>
          ) : (
            <>
              <div className="mt-[30px] mx-[30px] mb-[0px]">
                <ScrollableTabs
                  no={no}
                  sub={sub}
                  tabsData={tasks}
                  allDataNoSub={allDataTasks}
                  updateUserTask={updateUserTask}
                  onClick={changeNoSub}
                  dataColor={colors}
                  allDataVersion={allDataVersion}
                />

                {/*Header table, berisi guidance, indikator, deskripsi, dan Elemen*/}
                <HeaderPengisianLedTable headerData={filteredDataMatriks} />
              </div>

              {/*Referensi */}
              {isReference && (
                <div className="mt-5 mx-[30px] mb-[0px] bg-[pink] rounded-lg">
                  <PengisianLedTableNew
                    dataKriteriaIndikator={filteredDataMatriks}
                    dataIsian={filteredDataReference}
                    // handleClickButton={handleClickButton}
                    updateDataIsian={updateDataIsianReference}
                    type="readonly"
                    prodi={selectedProdi}
                  />
                </div>
              )}

              {/* Matriks Isian */}
              {isDataReady && (
                <div className="mt-5 mx-[30px] mb-[0px]">
                  <PengisianLedTableNew
                    dataKriteriaIndikator={filteredDataMatriks}
                    dataIsian={filteredDataVersion}
                    // handleClickButton={handleClickButton}
                    updateDataIsian={updateDataIsian}
                    type="editable"
                  />
                </div>
              )}

              {/* History Version */}
              {isVersion && filteredDataHistory ? (
                filteredDataHistory.length > 0 ? (
                  <div>
                    <div className="flex justify-between mx-[30px] mt-[30px]">
                      <div>
                        {viewAllVersion ? (
                          <>
                            <h1 className="text-xl font-bold">
                              Daftar Pembaruan
                            </h1>
                          </>
                        ) : (
                          <>
                            <h1 className="text-xl font-bold">
                              Commit :{" "}
                              {filteredDataHistory[parseInt(versionSelected)]
                                ?.commit || "Data commit tidak tersedia"}
                            </h1>
                            {/* <h3>
                                                            Diperbarui pada {new Intl.DateTimeFormat("en-GB", { 
                                                                day: "2-digit", 
                                                                month: "long", 
                                                                year: "numeric"
                                                            }).format(new Date(filteredDataHistory[parseInt(versionSelected)].created_at))}, 
                                                            oleh {filteredDataHistory[parseInt(versionSelected)].user_name}
                                                        </h3> */}
                          </>
                        )}
                      </div>
                      <div>
                        <button
                          className={`h-10 px-1 text-sm rounded-md bg-primary text-white opacity-50 `}
                          onClick={() => setViewAllVersion(!viewAllVersion)}
                          disabled={isLoadingVersion}
                        >
                          Tampilkan{" "}
                          {viewAllVersion ? "Tabel Isian" : "Daftar Pembaruan"}
                        </button>
                      </div>
                    </div>
                    {viewAllVersion ? (
                      <VerticalLinearStepper
                        dataSteps={filteredDataHistory}
                        paramActiveStep={versionSelected}
                        onStepChange={handleVersionChange}
                      />
                    ) : (
                      <div className="mt-5 mx-[30px] mb-[0px]">
                        <PengisianLedTableNew
                          dataKriteriaIndikator={filteredDataMatriks}
                          dataIsian={
                            filteredDataHistory[parseInt(versionSelected)]
                          }
                          // handleClickButton={handleClickButton}
                          updateDataIsian={updateDataIsian}
                          type="readonlyVersion"
                          prodi={selectedProdi}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>Tidak ada perubahan sebelumnya</div>
                )
              ) : (
                <div></div>
              )}

              {/* Button Version, Commit */}
              <div className="m-[30px] flex justify-between items-center">
                <Button
                  className="bg-primary w-40 hover:bg-white hover:text-primary"
                  aria-label="Update"
                  // onClick={() =>navigate(`/versi/${no}/${selectedData.Sub}`)}
                  onClick={() => handleClickVersion()}
                  disabled={isLoading || isLoadingVersion}
                >
                  {isLoadingVersion ? " ..." : "Version"}
                </Button>
                <Button
                  className="bg-primary w-40 hover:bg-white hover:text-primary "
                  aria-label="Update"
                  onClick={handleShowToast}
                  disabled={isLoading}
                >
                  Commit
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="h-[80vh] my-10 pb-20 overflow-y-auto bg-white shadow-lg radius rounded-lg flex justify-center items-center text-center">
          Tidak ada task untuk anda😊
        </div>
      )}

      {/*Untuk reference*/}
    </div>
  )
}

export default PengisianLed
