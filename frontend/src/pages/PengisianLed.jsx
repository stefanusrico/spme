import {
  fetchAllProdi,
  fetchUserTask,
  fetchAllTaskByProdi,
  updateUserTask,
  changeNoSub,
  fetchLedDataByProdi,
  fetchLedItemByProdi,
  storeLedData,
  fetchLedDataProdiReference,
  addPreviewToFiles,
} from "./PengisianLed"
import { useState, useEffect } from "react"
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
import MySelectComponent from "../components/Elements/Select"
import SelectColor from "../components/Elements/Select/SelectColor"
import { Spin } from "antd"
import { useUser } from "../context/userContext"

const PengisianLed = () => {
  const navigate = useNavigate()
  const { userData } = useUser()
  const [tasks, setTasks] = useState([])
  const [prodi, setProdi] = useState([])
  const [colors, setColors] = useState([])
  const { no = "", sub = "", projectId = "" } = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isVersion, setIsVersion] = useState(false)
  const [user, setUser] = useState({})
  const [allDataTasks, setAllDataTasks] = useState([])
  const [isDataReady, setIsDataReady] = useState(false)
  const [isReference, setIsReference] = useState(false)
  const [allLedData, setAllLedData] = useState([])
  const [allDataLedItem, setAllDataLedItem] = useState([])
  const [ledDataSelected, setLedDataSelected] = useState("")
  const [viewAllVersion, setViewAllVersion] = useState(false)
  const [isTaskAvailable, setIsTaskAvailable] = useState(true)
  const [isLoadingVersion, setIsLoadingVersion] = useState(false)
  const [dataVersionHistory, setDataVersionHistory] = useState([])
  const [filteredDataLedItem, setFilteredDataLedItem] = useState([])
  const [filteredLedData, setFilteredLedData] = useState([])
  const [filteredDataHistory, setFilteredDataHistory] = useState([])
  const [dataVersionReference, setDataVersionReference] = useState([])
  const [filteredDataReference, setFilteredDataReference] = useState([])
  const [selectedProdi, setSelectedProdi] = useState({ name: "", id: "" })

  const [dataLedItem, setDataLedItem] = useState({
    kriteria: "",
    no: "",
    sub: "",
    details: [],
  })

  // Mengambil data program studi
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (!userData) return;
        console.log("userData :", userData)
        const [prodiData, userTasks, allTasks, ledData, ledItems] = await Promise.all([
          fetchAllProdi(),
          fetchUserTask(),
          fetchAllTaskByProdi(userData?.prodiId),
          fetchLedDataByProdi(userData?.prodiId),
          fetchLedItemByProdi(userData?.prodiId)
        ]);

        setProdi(prodiData);
        setTasks(userTasks);
        setAllDataTasks(allTasks);
        setAllLedData(ledData);
        setAllDataLedItem(ledItems);

        toast.success("Berhasil fetch data awal");
      } catch (error) {
        toast.error("Gagal fetch data awal");
      }
    };

    fetchInitialData();
  }, [userData]);


  useEffect(() => {
    if (!no || !sub) {
      const firstTask = tasks[0] || allDataTasks[0];
      if (firstTask) {
        navigate(`projects/${firstTask.project.id}/pengisian-matriks-led/${firstTask.no}/${firstTask.sub}`, { replace: true });
      }
    }
  }, [no, sub, tasks, allDataTasks, navigate]);

  const getLatestLedData = (dataArray) => {
    if (!Array.isArray(dataArray)) return null

    const filtered = dataArray.filter(
      (item) =>
        item.task.led_item?.no === no &&
        item.task?.led_item?.sub === sub
    );

    return filtered.reduce((latest, current) => {
      if (!latest || new Date(current.created_at) > new Date(latest.created_at)) {
        return current;
      }
      return latest;
    }, null);
  };

  useEffect(() => {
    // Ambil data LED terbaru dan data referensi
    console.log("All Led Data :", allLedData)
    const latestLedData = getLatestLedData(allLedData);
    setFilteredLedData(latestLedData);
    
    const latestRefData = getLatestLedData(dataVersionReference);

    
    setFilteredDataReference(latestRefData);

    // Filter data history
    const history = dataVersionHistory.filter(
      (item) => String(item.task?.led_item?.no) === no && String(item.task?.led_item?.sub) === sub
    );
    setFilteredDataHistory(history);
    setLedDataSelected(history.length > 1 ? "1" : "0");

    // Temukan LED item terkait
    const foundItem = allDataLedItem.find((item) => item.no === no && item.sub === sub);
    setFilteredDataLedItem(foundItem || null);

    // Jika data LED tidak ditemukan, buat default
    if (!latestLedData && allDataLedItem.length && allDataTasks.length && userData?.id){
      const matchedLedItem = allDataLedItem.find(item => item.no === no && item.sub === sub);
      const matchedTask = allDataTasks.find(task => task.no === no && task.sub === sub);
      console.log("MASUK SINI")
      if (matchedLedItem && matchedTask) {
        const detailsArray = (matchedLedItem.details || [])
          .filter(item => item.type === "K")
          .map(item => ({
            dataPendukung: [],
            isianAsesi: null,
            reference: item.reference || null,
            seq: item.seq || null,
          }));

        const defaultLedData = {
          commit: "",
          nilai: null,
          masukan: null,
          details: detailsArray,
          taskId: matchedTask.id,
          userId: userData.id,
        };

        setFilteredLedData(defaultLedData);
      }
    }
  }, [
    no, sub, allLedData, dataVersionReference, dataVersionHistory,
    allDataLedItem, allDataTasks, userData
  ]);

  
  useEffect(() => {
    const foundItem = allDataLedItem.find(
      (item) => item.no === no && item.sub === sub
    );

    if (foundItem && filteredLedData) {
      setIsDataReady(true);
      setIsLoading(false);
    }
  }, [filteredLedData, allDataLedItem]);

  useEffect(() => {
    if (ledDataSelected) {
      setIsVersion(true);
    }
  }, [ledDataSelected]);

  useEffect(() => {
    if (filteredDataReference && Object.keys(filteredDataReference).length > 0) {
      setIsReference(true);
    }
  }, [filteredDataReference]);

  useEffect(() => {
    const fetchReferenceData = async () => {
      if (!selectedProdi.id) return;

      try {
        const data = await fetchLedDataByProdi(selectedProdi.id);
        setDataVersionReference(data);
      } catch (error) {
        toast.error("Gagal fetch data version reference");
      }
    };

    fetchReferenceData();
  }, [selectedProdi]);

  const toastContainerStyle = {
    zIndex: 20000,
  }

  const updateColor = (data) => {
    setColors(data)
  }

  // const changeNoSub = (newNo, newSub, projectId) => {
  //   navigate(`projects/${projectId}/pengisian-matriks-led/${newNo}/${newSub}`)
  // }

  const updateUserTaskPlus = async(no, sub) => {
      try {
          const data = await updateUserTask(no, sub, userData.prodiId, userData.id)
          console.log("data user task setelah update :", data)
          setTasks(data);
          toast.success("Berhasil update Task");
      } catch (error) {
          throw new Error("Gagal update user task");
          toast.error("Gagal update Task");
      }
  }

  const updateDataIsian = (updateDataIsian) => {
    console.log("update data isian parent :", updateDataIsian)
    console.log("filtered data verison parent : ", filteredLedData)
    setFilteredLedData(updateDataIsian)
    // setDataIsian(updatedData);
  }

  const updateDataIsianReference = (updateDataIsian) => {
    console.log("update data isian parent :", updateDataIsian)
    console.log("filtered data verison parent : ", filteredLedData)
    // setDataIsian(updatedData);
  }

  const handleClickVersion = () => {
    const getAllLedDataByProdi = async () => {
      try {
        setDataVersionHistory(allLedData)
      } catch (error) {
        toast.error("gagal fetch semua data version history")
      }
    }

    getAllLedDataByProdi()
  }

  const handleShowToast = () => {
    toast(
      <FormToast
        closeToast={() => toast.dismiss()}
        dataIsian={filteredLedData}
        noSub={`${no}${sub}`}
        title="Versi Baru Dibuat"
        message="Tambahkan pesan untuk perubahan"
        onSubmit={storeLedData}
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
    setLedDataSelected(newIndex.toString())
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        <Spin tip="Loading data..." size="large" />
      </div>
    )
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
        <MySelectComponent
          name="prodi"
          options={prodi.map((prodi) => ({
            id: prodi.id,
            value: prodi.name,
            label: prodi.name,
          }))}
          placeholder= "Pilih Program Studi"
          width={200}
          height={50}
          onChange={(newValue) =>
            setSelectedProdi({ name: newValue?.value || "", id: newValue.id })
          }
        />

        <BarProgress
          progress={
            filteredLedData && !isNaN(parseFloat(filteredLedData.nilai))
              ? (parseFloat(filteredLedData.nilai) / 4) * 100
              : 0
          }
          width={200}
          height={50}
        />

        <SelectColor isLoading={false} dataColors={updateColor} width={200} height={50}/>
        {/* <ColorRangeDropdown isLoading={false} dataColors={updateColor} /> */}
      </div>
      
      {/*Untuk tab LedItem, referensi, pengisian matriks sekarang, version */}
      {isTaskAvailable ? (
        <>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "300px",
              }}
            >
              <Spin tip="Loading data..." size="large" />
            </div>
          ) : (
            <>
              <div className="mt-[30px] mx-[30px] mb-[0px]">
                <ScrollableTabs
                  no={no}
                  sub={sub}
                  tabsData={tasks}
                  allDataTasks={allDataTasks}
                  updateUserTask={updateUserTaskPlus}
                  onClick={changeNoSub}
                  dataColor={colors}
                  allLedData={allLedData}
                />

                {/*Header table, berisi guidance, indikator, deskripsi, dan Elemen*/}
                <HeaderPengisianLedTable headerData={filteredDataLedItem} />
              </div>

              {/*Referensi */}
              {isReference && (
                <div className="mt-5 mx-[30px] mb-[0px] bg-[pink] rounded-lg">
                  <PengisianLedTableNew
                    key={`${no}-${sub}`}
                    dataKriteriaIndikator={filteredDataLedItem}
                    dataIsian={filteredDataReference}
                    // handleClickButton={handleClickButton}
                    updateDataIsian={updateDataIsianReference}
                    type="readonly"
                    prodi={selectedProdi}
                  />
                </div>
              )}

              {/* Matriks Isian */}
              {/* {isDataReady && ( */}
                <div className="mt-5 mx-[30px] mb-[0px]">
                  <PengisianLedTableNew
                    key={`${no}-${sub}`}
                    dataKriteriaIndikator={filteredDataLedItem}
                    dataIsian={filteredLedData}
                    updateDataIsian={updateDataIsian}
                    type="editable"
                    noSub = {`${no}${sub}`}
                  />
                </div>
              {/* )} */}

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
                              {filteredDataHistory[parseInt(ledDataSelected)]
                                ?.commit || "Data commit tidak tersedia"}
                            </h1>
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
                        paramActiveStep={ledDataSelected}
                        onStepChange={handleVersionChange}
                      />
                    ) : (
                      <div className="mt-5 mx-[30px] mb-[0px]">
                        <PengisianLedTableNew
                          key={`${no}-${sub}`}
                          dataKriteriaIndikator={filteredDataLedItem}
                          dataIsian={
                            filteredDataHistory[parseInt(ledDataSelected)]
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
