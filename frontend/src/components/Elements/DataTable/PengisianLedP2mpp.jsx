import { message, Spin, Modal } from "antd"
import ScrollableTabs from "../Tabs"
import { toast } from "react-toastify"
import { useEffect, useState } from "react"
import { Editor } from "react-draft-wysiwyg"
import axiosInstance from "../../../utils/axiosConfig"
import PengisianLedTableNew from "./PengisianLedTableNew"
import HeaderPengisianLedTable from "./HeaderPengisianLedTable"
import { EditorState, convertToRaw, convertFromRaw, ContentState } from "draft-js"
import { fetchLedDataByProdi, fetchLedItemByProdi } from "../../../pages/PengisianLed"

const PengisianLedP2mpp = ({ userData }) => {
    const [no, setNo] = useState("1")
    const [sub, setSub] = useState("A")
    const [tasks, setTasks] = useState([])
    const [dataIsian, setDataIsian] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [allDataTasks, setAllDataTasks] = useState([])
    const [dataLedItem, setDataLedItem] = useState(null)
    const [allLedData, setAllLedData] = useState([])
    const [allDataLedItem, setAllDataLedItem] = useState([])
    const [filteredLedData, setFilteredLedData] = useState(null)
    const [filteredDataLedItem, setFilteredDataLedItem] = useState(null)
    const [editorState, setEditorState] = useState(EditorState.createEmpty())
    const [dataFetched, setDataFetched] = useState(false) // Add this state

    // const tasks = [
    //     {
    //         no: "1",
    //         sub: "A"
    //     },
    //     {
    //         no: "2", 
    //         sub: "A"
    //     }
    // ]

    const changeNoSub = (newNo, newSub) => {
        setNo(newNo)
        setSub(newSub)
    }

    const getLedItem = async () => {
        try {
            setIsLoading(true)
            const responseLedItem = await axiosInstance.get(`/getLedItemByProdi/${userData.prodiId}`)
            if (responseLedItem && responseLedItem.data) {
                setAllDataLedItem(responseLedItem.data.data || responseLedItem.data)
                toast.success("Berhasil mengambil data LED item")
            } else {
                throw new Error("Data LED item tidak ditemukan")
            }
        } catch (error) {
            console.error("Error fetching LED item:", error)
            Modal.error({
                title: "Gagal",
                content: "Terjadi kesalahan mengambil data LED item.",
            })
            toast.error("Gagal mengambil data LED item")
        }
    }

    const getDataIsian = async () => {
        try {
            const responseDataIsian = await axiosInstance.get(`/led-data-by-prodi/${userData.prodiId}`)
            if (responseDataIsian && responseDataIsian.data) {
                setAllLedData(responseDataIsian.data.data || responseDataIsian.data)
                toast.success("Berhasil mengambil data isian")
            } else {
                console.warn("Belum ada data LED data")
                setAllLedData([])
            }
        } catch (error) {
            console.error("Error fetching data isian:", error)
            // Tidak perlu modal error karena bisa jadi memang belum ada data
            setAllLedData([])
        }
    }

    const getUserTask = async () => {
        try {
            const responseTask = await axiosInstance.get(`/tasks/get/p2mpp/`)
            if (responseTask && responseTask.data) {
                setTasks(responseTask.data.data || responseTask.data)
                toast.success("Berhasil mengambil data task")
            } else {
                console.warn("Belum ada data task yang dipilih")
                setTasks([])
            }
        } catch (error) {
            toast.error("Gagal mengambil data task")
        }
    }

    const getAllTaskByProdi = async () => {
        try {
            const responseAllTasks = await axiosInstance.get(`/all-tasks-by-prodi/${userData.prodiId}`)
            if (responseAllTasks && responseAllTasks.data) {
                setAllDataTasks(responseAllTasks.data.data.tasks || responseAllTasks.data)
                toast.success("Berhasil mengambil data seluruh task")
            } else {
                console.warn("Belum ada data task yang dipilih")
                setAllDataTasks([])
            }
        } catch (error) {
            toast.error("Gagal mengambil data seluruh task")
        }
    }

    const getLatestLedData = (dataArray) => {
        if (!Array.isArray(dataArray)) return null

        const filtered = dataArray.filter(
            (item) =>
                item.task?.led_item?.no === no &&
                item.task?.led_item?.sub === sub
        )

        return filtered.reduce((latest, current) => {
            if (!latest || new Date(current.created_at) > new Date(latest.created_at)) {
                return current
            }
            return latest
        }, null)
    }

    const updateUserTaskPlus = async(no, sub) => {
        try {
            const responseTask = await axiosInstance.patch(`tasks/updateOwner/${no}/${sub}/${userData.prodiId}`,
                {
                    owners: [userData.id]
                }
            )
            getUserTask()
        } catch (error) {
            throw new Error("Gagal update user task");
            toast.error("Gagal update Task");
        }
    }

    const handleEditorChange = (newEditorState) => {
        setEditorState(newEditorState)
        
        // Update dataIsian jika diperlukan
        if (filteredLedData) {
            const rawContent = convertToRaw(newEditorState.getCurrentContent())
            
            const updatedDataIsian = {
                ...filteredLedData,
                details: (filteredLedData.details || []).map((item, index) => 
                    index === 0 ? { ...item, isianAsesi: JSON.stringify(rawContent) } : item
                )
            }
            
            setFilteredLedData(updatedDataIsian)
        }
    }

    const uploadImageCallBack = async (file) => {
        const userLocalhost = localStorage.getItem("user")
        const jsonUserLocalhost = JSON.parse(userLocalhost)
        const currentProdiName = jsonUserLocalhost.prodi.name

        const formData = new FormData()
        formData.append("file[]", file)
        formData.append("noKriteria[]", "1") // Default kriteria
        formData.append("subFolder", currentProdiName)
        formData.append("noSub", `${no}${sub}`)

        try {
            const response = await axiosInstance.post("/upload-to-drive", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })

            const uploaded = response.data.files?.[0]
            if (!uploaded) throw new Error("Upload gagal")

            return {
                data: {
                    link: uploaded.local_url,
                },
            }
        } catch (error) {
            console.error("Upload gambar gagal:", error)
            toast.error("Upload gambar gagal")
            return Promise.reject(error)
        }
    }

    useEffect(() => {
        if (!userData || !userData.prodiId) return

        const fetchData = async () => {
            try {
                await Promise.all([
                    getDataIsian(),
                    getLedItem(),
                    getUserTask(),
                    getAllTaskByProdi()
                ])
                setDataFetched(true) // Mark data as fetched
            } catch (error) {
                console.error("Error fetching data:", error)
                setDataFetched(true) // Still mark as fetched even if error
            }
        }

        fetchData()
    }, [userData])

    useEffect(() => {
        // Only process when data has been fetched
        if (!dataFetched) return

        // Process data regardless of whether arrays are empty or not
        const latestLedData = getLatestLedData(allLedData)
        setFilteredLedData(latestLedData)

        const foundItem = allDataLedItem.find((item) => item.no === no && item.sub === sub)
        setFilteredDataLedItem(foundItem || null)

        console.log("found item :", foundItem)
        
        // Jika tidak ada data LED, buat default
        if (!latestLedData && foundItem && userData?.id) {
            const detailsArray = (foundItem.details || [])
                .filter(item => item.type === "K")
                .map(item => ({
                    dataPendukung: [],
                    isianAsesi: null,
                    reference: item.reference || null,
                    seq: item.seq || null,
                }))

            const defaultLedData = {
                commit: "",
                nilai: null,
                masukan: null,
                details: detailsArray,
                userId: userData.id,
            }

            setFilteredLedData(defaultLedData)
        }

        // Set editor state jika ada data
        if (latestLedData && latestLedData.details && latestLedData.details[0]) {
            const rawContent = latestLedData.details[0].isianAsesi
            if (rawContent) {
                try {
                    const parsed = JSON.parse(rawContent)
                    if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
                        const contentState = convertFromRaw(parsed)
                        setEditorState(EditorState.createWithContent(contentState))
                    }
                } catch (e) {
                    // Fallback ke plain text
                    const contentState = ContentState.createFromText(rawContent)
                    setEditorState(EditorState.createWithContent(contentState))
                }
            }
        }

        // Always stop loading after processing
        setIsLoading(false)
    }, [no, sub, allLedData, allDataLedItem, userData, dataFetched])

    const updateDataIsian = (updatedData) => {
        setFilteredLedData(updatedData)
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
                <Spin tip="Loading data..." size="small" />
            </div>
        )
    }

    return (
        <div className="h-[80vh] w-auto mt-4 mr-4 pb-4 overflow-y-auto bg-white shadow-lg rounded-lg p-4">
            <ScrollableTabs
                no={no}
                sub={sub}
                tabsData={tasks}
                allDataTasks={allDataTasks}
                updateUserTask={updateUserTaskPlus}
                onClick={changeNoSub}
            />
            
            {filteredDataLedItem && (
                <HeaderPengisianLedTable headerData={filteredDataLedItem} />
            )}
            
            {filteredLedData && filteredDataLedItem ? (
                <PengisianLedTableNew
                    key={`${no}-${sub}`}
                    dataKriteriaIndikator={filteredDataLedItem}
                    dataIsian={filteredLedData}
                    updateDataIsian={updateDataIsian}
                    type="editable"
                    noSub={`${no}${sub}`}
                />
            ) : (
                <div className="flex justify-center items-center h-40">
                    <p className="text-gray-500">Data tidak tersedia untuk {no}{sub}</p>
                </div>
            )}
        </div>
    )
}

export default PengisianLedP2mpp