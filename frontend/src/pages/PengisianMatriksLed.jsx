import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import Button from '../components/Elements/Button';
// import Navbar from '../components/Elements/Menu/Navbar';
// import Sidebar from '../components/Elements/Menu/SidebarExpanded';
// import { sidebarAdmin } from '../components/Elements/Menu/sidebar'; 
import { ToastContainer, toast } from 'react-toastify';
import { FormToast } from '../components/Elements/FormToast';
import ScrollableTabs from '../components/Elements/Tabs';
import PengisianLedTable from '../components/Elements/DataTable/PengisianLedTable';
import Dropdown from '../components/Elements/Dropdown';
import ColorRangeDropdown from '../components/Elements/Dropdown/ColorRangeDropdown';
import DropdownWithSearch from '../components/Elements/Dropdown/WithSearch';
import VerticalLinearStepper from '../components/Elements/Stepper';
import ProgressBar from "../components/Elements/Chart/ProgressBar"

const PengisianMatrikLed = () => {
    const navigate = useNavigate()
    const { no = "", sub = "" } = useParams()
    const [json, setJson] = useState([])
    const [task, setTask] = useState([])
    const [prodi, setProdi] = useState([])
    const [score, setScore] = useState(null)
    const [colors, setColors] = useState([])
    const [userId, setUserId] = useState("")
    const [userProdi, setUserProdi] = useState({name: "", id: ""})
    const [showMasukan, setShowMasukan] = useState(true);
    const [showNilai, setShowNilai] = useState(true);
    const [numDesc, setNumDesc] = useState(true)
    const [version, setVersion] = useState([])
    const [versionSelected, setVersionSelected] = useState("")
    const [viewAllVersion, setViewAllVersion] = useState(false)
    const [openVersion, setOpenVersion] = useState(false)
    const [openReference, setOpenReference] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingVersion, setIsLoadingVersion] = useState(false)
    const [selectedProdi, setSelectedProdi] = useState({ name : ""})
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [dataPendukung, setDataPendukung] = useState([])
    const [selectedData, setSelectedData] = useState({
        C: "",
        "No." : "",
        Sub: "",
        Details: []
    });
    const [selectedDataReference, setSelectedDataReference] = useState({
        C: "",
        "No." : "",
        Sub: "",
        Details: []
    });
    const [selectedDataVersion, setSelectedDataVersion] = useState({
        C: "",
        "No." : "",
        Sub: "",
        Details: []
    });
    const [selectedDataVersionLatest, setSelectedDataVersionLatest] = useState({
        C: "",
        "No." : "",
        Sub: "",
        Details: []
    });
    const [dataMatriksPenilaian, setDataMatriksPenilaian] = useState({
        C: "",
        "No." : "",
        Sub: "",
        Details: []
    });

    const fetchUserTasks = async () => {
        try {
            const responseTask = await axiosInstance.get(`/tasks`)
            console.log("user task :", responseTask.data.data)
            // console.log(no, sub)
            setTask(responseTask.data.data)
            const dataRespon = responseTask.data.data
            console.log("respon :", dataRespon.length);
            console.log("no sub :", no, sub)
            if ((no && sub) || dataRespon.length > 0) {
                console.log("checking...", responseTask.data.data);
                checkAndRedirect(responseTask.data.data)
            } else {
                console.log("tidak ada no dan sub")
                setNumDesc(false)
            }
        } catch (error) {
            console.error("Gagal fetch task", error);
        }
    }

    const updateUserTask = async (newNo, newSub) => {
        try {
            // const responseTask = await axiosInstance.patch(`tasks/updateOwner/${projectId}/${taskId}`, {
            //     owners: [userId]
            // })
            const responseTask = await axiosInstance.patch(`tasks/updateOwner/${newNo}/${newSub}`, {
                owners: [userId]
            })
            console.log(responseTask.data.data);
        } catch (error) {
            console.error("Error updating task:", error.response?.data || error.message);
        }
    }

    const fetchProdi = async () => {
        try {
            const prodiResponse = await axiosInstance.get(`/prodi`)
            setProdi(prodiResponse.data)
        } catch (error) {
            
        }
    }

    const checkAndRedirect = (userTasks) => {
        if(no && sub){
            navigate(`/pengisian-matriks-led/${no}/${sub}`, {
                replace: true, // Supaya tidak menambah entry baru di history browser
            });
        }else if (userTasks.length > 0) {
            const firstTask = userTasks[0];
            navigate(`/pengisian-matriks-led/${firstTask.no}/${firstTask.sub}`, {
                replace: true, // Supaya tidak menambah entry baru di history browser
            });
        } else {
            setNumDesc(false)
        }
    }

    const fetchJson = async (param = "") => {
        try {
            setIsLoading(true)
            let file = ""
            if(param === ""){
                const storedUser = localStorage.getItem('user');
                const userData = JSON.parse(storedUser);

                file = `WD1-${userData.prodi.name}`
            }else{
                file = `WD1-${param}`
            }

            const response = await axiosInstance.get(`/read-json/${file}`);
            const data = response.data.data
            setJson(data);
            console.log("data : ", data)
            
            const matchingData = data.find((item) => item["No."] === no && item.Sub === sub);
            if (param === "") {
                setSelectedData(matchingData);
            }else{
                setSelectedDataReference(matchingData)
            }
            countScore(matchingData)
            console.log("selected data :",matchingData);
        } catch (error) {
            console.error("Error reading JSON file:", error);
            if (param === "") {
                setSelectedData({
                    C: "",
                    "No.": "",
                    Sub: "",
                    Details: [],
                });
            }else{
                setSelectedDataReference({
                    C: "",
                    "No.": "",
                    Sub: "",
                    Details: [],
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            const userDataId = userData.prodi
            setUserId(userData.id)
            setUserProdi({
                name: userData.prodi.name, 
                id: userData.prodi.id
            })
            setSelectedProdi(userData.prodi.name)
            console.log("user data id :", userDataId);
        }
        console.log("no dan sub :", no, sub);
        // getAllDataVersion()
        setVersion([])
        setOpenVersion(false)
        
        if (no && sub) {
            console.log("fetch json....");
            fetchJson(); 
            fetchUserTasks();
            fetchProdi();
            fetchMatriks()
            // handleClickVersion()
        } else {
            console.log("fetch user task....");            
            fetchUserTasks()
        }
    }, [no, sub]);

    useEffect(() => {
        getVersionLatest()
    },[userProdi.id])

    useEffect(() => {
        console.log("dataMatriksPenilaian : ", dataMatriksPenilaian)
    },[dataMatriksPenilaian])

    useEffect(() => {
        if (selectedProdi.name) {
            fetchJson(selectedProdi.name);
            setColors(colors)
        }
        console.log("hehehh", colors);
    }, [selectedProdi.name]);

    useEffect(() => {
        if (versionSelected) {
            setSelectedDataVersionFunction(versionSelected)
        }
    }, [versionSelected]);

    // useEffect(() => {
    //     if (version.length > 0) {
    //         setSelectedDataVersionFunction(version.length > 1 ? "1" : "0");
    //     }
    // }, [version]);

    const getVersionLatest = async () => {
        setIsLoadingVersion(true); // Set loading state ke true sebelum request dimulai
    
        try {
            const data = {
                No: no,
                Sub: sub,
                Prodi: userProdi.id,
                Type: "latest",
            };
    
            console.log("Mengirim request ke API dengan data:", data);
    
            const response = await axiosInstance.post(`/versions/getVersion`, data);
    
            console.log("Response dari API:", response.data);
    
            if (!response.data || !response.data.data) {
                console.warn("No version data found");
                setIsLoadingVersion(false);
                return;
            }
    
            const versionLatest = response.data.data || {};
    
            const formattedVersion = {
                C: versionLatest.c || "",  
                "No.": no,  
                Sub: sub,  
                Details: (versionLatest.details || []).map(detail => ({
                    "Seq": detail.seq || "",
                    "Reference": detail.reference || "",
                    "Isian Asesi": detail.isian_asesi || "",
                    "Data Pendukung": detail.data_pendukung || [],
                    "Nilai": detail.nilai || "",
                    "Masukan": detail.masukan || "",
                    "Type": "K"
                }))  
            };
    
            console.log("DATA VERSION TERBARU NIIH :", formattedVersion);
            console.log("DATA JSON TERBARU NIIH :", selectedData);
    
            setSelectedDataVersionLatest(formattedVersion);
        } catch (error) {
            console.error("Terjadi kesalahan saat mengambil versi terbaru:", error);
        } finally {
            setIsLoadingVersion(false); // Pastikan loading state diubah kembali setelah request selesai
        }
    };

    const fetchMatriks = async() => {
        try{
            const responseMatriks = await axiosInstance.get(`/matriks/${no}/${sub}`)
            const dataMatriks = responseMatriks.data.data
            setDataMatriksPenilaian({
                C: dataMatriks.c,
                "No.": dataMatriks.no,
                Sub: dataMatriks.sub,
                Details: dataMatriks.details,

            })
            console.log("MATRIKS NIH BOSF", responseMatriks.data.data)
            console.log("selected data dibawha", selectedData)
        }catch{
            console.error("Terjadi kesalahan saat mengambil matriks:", error);
        }
    }
    
    
    const handleInputChange = (index, type, field, value) => {
        console.log("handle input change..", index, type, field, value);
        
        setSelectedData((prev) => {
            console.log(index);
            const updatedIndex = index
            
            const updatedDetails = [...prev.Details];
            console.log("update detail :", updatedDetails);
            
    
            const targetIndex = updatedDetails.findIndex((detail) => detail.Type === type && detail.Seq === updatedIndex);
            console.log(targetIndex)
            
            if (targetIndex !== -1) {
                updatedDetails[targetIndex][field] = value;
            } else {
                console.log("Elemen tidak ditemukan dengan Type:", type, "dan Seq:", updatedIndex);
            }
            console.log("tes input : ",selectedData);
            
            return { ...prev, Details: updatedDetails };
        });
    };

    const callGPT = async (prompt) => {
        const API_URL = "https://api.openai.com/v1/chat/completions"; 
        const API_KEY = apiKey;

        const payload = {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: prompt }
            ],
            max_tokens: 600,
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`,
                },
                body: JSON.stringify(payload),
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
    
            const data = await response.json();
            return data.choices[0].message.content
        } catch (error) {
            console.error("Ping failed:", error);
        }
    };


    const handleClickButton = async (index) => {
        console.log("index", index)
        const updatedIndex = index;
        const updatedDetails = [...selectedData.Details];
        const findDetailIndex = (type, seq = null) =>
            updatedDetails.findIndex((detail) => detail.Type === type && (seq ? detail.Seq === seq : true));

        const targetIndexes = {
            isianAsesiAndReferensiKriteria: findDetailIndex("K", updatedIndex),
            guidance: findDetailIndex("G"),
            element: findDetailIndex("E"),
            indikator: findDetailIndex("I"),
            score0: findDetailIndex("S", "0"),
            score1: findDetailIndex("S", "1"),
            score2: findDetailIndex("S", "2"),
            score3: findDetailIndex("S", "3"),
            score4: findDetailIndex("S", "4"),
        };

        if (targetIndexes.isianAsesiAndReferensiKriteria !== -1) {
            const isianAsesi = updatedDetails[targetIndexes.isianAsesiAndReferensiKriteria]?.["Isian Asesi"];
            
            if (!isianAsesi || isianAsesi.trim() === "") {
                console.log("Isian Asesi kosong, tidak memanggil GPT.");
                return; 
            }
            const analysisPrompt = `
                Saya memiliki beberapa matriks penilaian kualitatif untuk akreditasi suatu perguruan tinggi, matriks tersebut memiliki nilai 0, 1, 2, 3, 4, dengan penjelasan untuk masing-masing nilai. Tolong bantu saya menganalisis suatu isian berdasarkan matriks berikut :

                Elemen: ${updatedDetails[targetIndexes.element]?.["Reference"]}
                
                Penilaian:
                - 0: ${updatedDetails[targetIndexes.score0]?.["Reference"]}
                - 1: ${updatedDetails[targetIndexes.score1]?.["Reference"]}
                - 2: ${updatedDetails[targetIndexes.score2]?.["Reference"]}
                - 3: ${updatedDetails[targetIndexes.score3]?.["Reference"]}
                - 4: ${updatedDetails[targetIndexes.score4]?.["Reference"]}

                Isian:
                "${updatedDetails[targetIndexes.isianAsesiAndReferensiKriteria]["Isian Asesi"]}"
                
                Pertanyaan:
                Apakah isiian di atas memenuhi poin penilaian kriteria indikator "${updatedDetails[targetIndexes.isianAsesiAndReferensiKriteria]["Reference"]}"? Jika isian tidak relevan atau tidak memberikan informasi yang sesuai dengan kriteria penilaian, langsung berikan nilai 0 dan beri masukan 'Informasi tidak mencukupi untuk evaluasi.'

                Jawaban harus berupa objek JSON:
                {
                    "nilai": "<skor yang sesuai>",
                    "masukan": "<penjelasan ringkas>"
                }
            `;

            console.log(analysisPrompt);
            
            const response = await callGPT(analysisPrompt);
            console.log("Response from GPT:", response);
            const parsedResponse = JSON.parse(response);
            console.log("0 :",parsedResponse);
            console.log("1 :",String(parsedResponse.nilai));
            console.log("2 :",parsedResponse["masukan/penjelasan"]);
            
            setSelectedData((prev) => {
                const updatedDetails = [...prev.Details];

                const detailIndex = targetIndexes.isianAsesiAndReferensiKriteria;
                if (detailIndex !== -1) {
                    updatedDetails[detailIndex] = {
                        ...updatedDetails[detailIndex],
                        Nilai: String(parsedResponse.nilai),
                        Masukan: parsedResponse.masukan, 
                    };
                }
                const updatedSelectedData = { ...prev, Details: updatedDetails };
                console.log("Updated Details:", updatedSelectedData);

                setJson((prevJson) => {
                    const updatedJson = prevJson.map((item) =>
                        item["No."] === updatedSelectedData["No."] && 
                        item["Sub"] === updatedSelectedData["Sub"]
                            ? { ...updatedSelectedData }  
                            : item
                    );
                    console.log("Updated JSON inside setJson:", updatedJson);
                    return updatedJson;
                });
                
                console.log("jalan");
                countScore(updatedSelectedData)
                return updatedSelectedData; 
                
            });
        }else{
            console.log("gagal membuat submit GPT");
        }
        
        setIsLoading(false)
    };

    const handleShowToast = () => {
        toast(
            <FormToast
                closeToast={() => toast.dismiss()}
                title="Versi Baru Dibuat" 
                message="Tambahkan pesan untuk perubahan"
                onSubmit={saveToFile} 
            />, 
            {
                position: "bottom-right", // Posisi toast
                autoClose: false, // Tidak menutup otomatis
                closeOnClick: false, // Klik di luar tidak menutup
                draggable: false, // Tidak bisa diseret
            }
        );
    };

    const saveToFile = async (commit) => {
        console.log("data file : ", selectedFiles)
        await handleUpload({ fileList: selectedFiles });

        const flattenData = json.map((item) => {
            const { ["Data Pendukung"]: _, ...cleanedItem } = item; // Hapus "Data Pendukung"
            
            const details = item.Details.map((detail) => ({
                ...cleanedItem,  // Sekarang item sudah tanpa "Data Pendukung"
                ...detail,
                Details: undefined 
            }));
            return details;
        }).flat();
        console.log("flatten data :", flattenData)

        try {
            const response = await axiosInstance.post("/save-json", { data : flattenData }); 
            console.log("response post json :", response)
        } catch (error) {
            console.error("Error saving file:", error);
        }

        const dataToStore = {
            ...selectedData,
            userId: userId,
            No: selectedData['No.'],
            commit: commit,
            Prodi: userProdi.id
        }
        console.log("data to store :", dataToStore);
        
        const response = await axiosInstance.post(`/versions`, dataToStore)
        console.log("response post version :", response);
    };

    const updateColor = (data) => {
        console.log("tes masuk data color :", data)
        setColors(data)
    }

    const changeNoSub = (newNo, newSub) => {
        navigate(`/pengisian-matriks-led/${newNo}/${newSub}`)
    }

    const toggleMasukanVisibility = () => {
        setShowMasukan(!showMasukan);
    };
    
    const toggleNilaiVisibility = () => {
        setShowNilai(!showNilai);
    };

    const countScore = (selectedDataReference) => {
        let score = 0
        for (let i = 0; i < selectedDataReference.Details.length; i++) {
            if (selectedDataReference.Details[i].Type === "K") {
                const intScore = parseInt(selectedDataReference.Details[i].Nilai) || 0; // Pastikan angka atau default 0
                score += intScore;
            }
        }
        
        const pembagi = selectedDataReference.Details.filter(detail => detail.Type === "K").length;
        console.log("score sebelum dibagi", score)
        console.log("pembagi  ", pembagi)
        const finalScore = (score/pembagi).toFixed(2) || 0
        console.log("score :", finalScore)
        setScore(finalScore)
    };

    const handleSelectedFilesChange = (files, currentData) => {
        console.log("Updated selected files:", files);
        console.log("current data length parent:", currentData[0].Seq)

        const updatedDetails = [...selectedData.Details];
        const findDetailIndex = (type, seq = null) =>
            updatedDetails.findIndex((detail) => detail.Type === type && (seq ? detail.Seq === seq : true));

        const targetIndexes = {
            index: findDetailIndex("K", currentData[0].Seq),
        };

        setSelectedData((prev) => {
            const updatedDetails = [...prev.Details];

            const detailIndex = targetIndexes.index;
            if (detailIndex !== -1) {
                updatedDetails[detailIndex] = {
                    ...updatedDetails[detailIndex],
                    ["Data Pendukung"]: (() => {
                        const existingFiles = new Set((updatedDetails[detailIndex]["Data Pendukung"] || []).map(file => file));
                        const newFiles = Array.isArray(files) ? files.map(f => f.name) : [files.name];
                        const uniqueFiles = newFiles.filter(file => !existingFiles.has(file)); // Hindari duplikasi
                        return [...existingFiles, ...uniqueFiles]; // Gabungkan dengan yang sudah ada
                    })(),
                };
            }
            
            const updatedSelectedData = { ...prev, Details: updatedDetails };
            console.log("Updated Details:", updatedSelectedData);

            setJson((prevJson) => {
                const updatedJson = prevJson.map((item) =>
                    item["No."] === updatedSelectedData["No."] && 
                    item["Sub"] === updatedSelectedData["Sub"]
                        ? { ...updatedSelectedData }  
                        : item
                );
                console.log("Updated JSON inside setJson:", updatedJson);
                return updatedJson;
            });
            
            console.log("jalan");
            return updatedSelectedData; 
            
        });
        setSelectedFiles((prevFiles = []) => {
            console.log("Masuk sini selected");
        
            // Buat set dari nama file yang sudah ada
            const existingFiles = new Set(prevFiles.map(file => file.name));
        
            // Pastikan `files` adalah array, lalu filter hanya yang belum ada
            const newFiles = Array.isArray(files) ? files : [files];
            const uniqueFiles = newFiles.filter(file => !existingFiles.has(file.name));
        
            // Gabungkan file lama dengan file baru yang unik
            return [...prevFiles, ...uniqueFiles];
        }); 
    };
    

    const handleUpload = async ({ fileList }) => {
        console.log("File yang diunggah:", fileList);
        
        if (fileList.length === 0) return;

        const formData = new FormData();
        fileList.forEach((file) => {
          formData.append("files[]", file.originFileObj);
        });

        formData.append("subFolder", userProdi.name);
        formData.append("noSub", `${no}${sub}`);
    
        try {
            const response = await axiosInstance.post("/upload-to-drive", 
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            console.log("Upload sukses:", response.data);

            const uploadedFiles = response.data.map(file => ({
                name: file.file_name,
                url: file.file_url
            }));
            console.log("nama file : ", uploadedFiles)
            selectedData["Data Pendukung"] = uploadedFiles;

            // setIsUploaded(true);
        } catch (error) {
            console.error("Upload gagal:", error);
        }
    };

    // const getAllDataVersion = async() => {
    //     try {
    //         setIsLoadingVersion(true);
    //         const data = {
    //             No: no,
    //             Sub: sub,
    //             Type: "list",
    //         };
    //         const response = await axiosInstance.post(`/versions/getVersion`, data);
    //         console.log("version : ", response.data.data);

    //         if (!response.data.data || response.data.data.length === 0) {
    //             console.warn("No version data found");
    //             setIsLoadingVersion(false);
    //             return;
    //         }
    //         setVersion(response.data.data);
    //     } catch (error) {
    //         console.error("Gagal fetch version", error);
    //     } finally {
    //         setIsLoadingVersion(false);
    //     }
    // }

    const handleClickVersion = async () => {
        try {
            setIsLoadingVersion(true);
            const data = {
                No: no,
                Sub: sub,
                Prodi: userProdi.id,
                Type: "list",
            };
            const response = await axiosInstance.post(`/versions/getVersion`, data);
    
            console.log("version : ", response.data.data);
    
            if (!response.data.data || response.data.data.length === 0) {
                console.warn("No version data found");
                setIsLoadingVersion(false);
                return;
            }
            const versions = response.data.data || []; 
            if(versions.length > 1) {
                setVersionSelected("1")
            } else{
                setVersionSelected("0")
            }
            setVersion(response.data.data);

            
            
        } catch (error) {
            console.error("Gagal fetch version", error);
        } finally {
            setIsLoadingVersion(false);
            setOpenVersion(!openVersion)
        }
    };

    const setSelectedDataVersionFunction = (index) => {
        const newIndex = parseInt(index, 10) || 0
        const selectedIndexVersion = version[newIndex]
        console.log("data version seleted", version)
        console.log("index set: ",newIndex)
        const formattedVersion = {
            C: selectedIndexVersion.c,  
            "No.": selectedIndexVersion.no,  // Ubah 'no' menjadi 'No.'
            Sub: selectedIndexVersion.sub,  // Ubah 'sub' menjadi 'Sub'
            Details: selectedIndexVersion.details.map(detail => ({
                "Seq": detail.seq,
                "Reference": detail.reference,
                "Isian Asesi": detail.isian_asesi,
                "Data Pendukung": detail.data_pendukung,
                "Nilai": detail.nilai,
                "Masukan": detail.masukan,
                "Type": "K" 
            }))  
        };

        if(newIndex === 0){
            setSelectedDataVersion(formattedVersion);
        }else{
            setSelectedDataVersion(formattedVersion);
        }
    }

    const handleViewAllVersion = () => {
        setViewAllVersion(!viewAllVersion)
        console.log(viewAllVersion);
    }

    const handleVersionChange = (newIndex) => {
        setVersionSelected(newIndex.toString())
    }
    
    const hideReference = () => {
        setOpenReference(!openReference)
    }

    const closeReference = () => {
        setSelectedProdi("")
    }

    return(
        <div className="h-[80vh] w-full pb-4 overflow-y-auto bg-white shadow-lg radius rounded-lg">
            {/* <Sidebar items={sidebarAdmin} />
            <Navbar /> */}
            {/* <div className="fixed justify w-[75%] ml-72 pt-20"> */}
                <h2 className="text-3xl font-semibold mt-5 ml-2 text-center">{userProdi.name.toUpperCase()}</h2>
                <div className='flex justify-center space-x-4 mt-4'>
                    <DropdownWithSearch
                        name="prodi"
                        options={prodi.map((prodi) => ({
                            id: prodi.id,
                            value: prodi.name,
                            label: prodi.name,
                        }))}
                        value={selectedProdi.name}
                        onChange={(newValue) => {setSelectedProdi({ name: newValue?.value || "" })}}
                        disabled={isLoading}
                        sizeSelect='w-60 h-18'
                        placeholder={selectedProdi.name? selectedProdi.name : "Pilih Program Studi"}
                        // error={error.prodi}
                    ></DropdownWithSearch>
                    <div className='w-60 h-18 bg-gray-800 rounded-md bg-gray relative flex items-center justify-center text-white font-bold'>
                        <div
                            className="bg-blue h-full rounded-md absolute left-0 top-0"
                            style={{ width: `${(score/4)*100}%` }}
                        ></div>
                        <span 
                            className="relative z-10"
                            style={{
                                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)", // Outline hitam dengan blur
                            }}
                        >{(score/4)*100}</span>
                    </div>
                    <ColorRangeDropdown isLoading={isLoading} dataColors={updateColor} />
                    
                </div>
                {numDesc ? (
                    <div className="h-[80vh] my-10 pb-20 overflow-y-auto bg-white shadow-lg radius rounded-lg">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-normal font-semibold">Loading...</p>
                            </div>
                        ) : (
                            <>
                                <div className='mt-[30px] mx-[30px] mb-[0px]'>
                                    <ScrollableTabs
                                        no={no}
                                        sub={sub}
                                        tabsData={task} 
                                        allDataNoSub={json}
                                        updateUserTask={updateUserTask}
                                        onClick={changeNoSub}   
                                        selectedProdi={selectedProdi.name}
                                        dataColor={colors}
                                        // dataScore={score}
                                        allDataMatriks={json}
                                    />
                                    <table className='text-center w-full text-sm'>
                                        <tbody>
                                            <tr className='border border-black black-600 text-center w-full'>
                                                <td className="align-middle text-center w-full" colSpan="3">
                                                    <h4>Guidance</h4>
                                                    <div>
                                                        {selectedData?.Details?.filter(detail => detail.Type === "G").map((detail, index) => (
                                                            <div key={index}>
                                                                <p>{detail.Reference ? detail.Reference : "-"}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className='border border-black black-600 w-[33%]'>
                                                    <h4>Indikator</h4>
                                                    <div>
                                                        {selectedData?.Details?.filter(detail => detail.Type === "I").map((detail, index) => (
                                                            <div key={index}>
                                                                <p>{detail.Reference ? detail.Reference : "-"}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className='border border-black black-600 w-[33%]'>
                                                    <h4>Deskripsi</h4>
                                                    <div>
                                                        {selectedData?.Details?.some(detail => detail.Type === "D") ? (
                                                            selectedData.Details.filter(detail => detail.Type === "D").map((detail, index) => (
                                                                <div key={index}>
                                                                    <p>{detail.Reference ? detail.Reference : "-"}</p>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p>-</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className='border border-black black-600'>
                                                    <h4>Elemen</h4>
                                                    <div>
                                                        {selectedData?.Details?.filter(detail => detail.Type === "E").map((detail, index) => (
                                                            <div key={index}>
                                                                <p>{detail.Reference ? detail.Reference : "-"}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <br />
                                {selectedProdi.name && (
                                    selectedDataReference.Details.length > 0 ? (
                                        <div className='mt-[0px] mx-[30px] mb-[0px] bg-gray p-3 rounded-md'>
                                            <div className='flex justify-between mt-4'>
                                                <h1>Referensi : {selectedProdi.name}</h1>
                                                <div>
                                                    <Button
                                                        className="bg-primary w-10 mr-2 hover:bg-white hover:text-primary "
                                                        aria-label="Update"
                                                        onClick={() => hideReference()}
                                                        disabled={isLoading}
                                                    >
                                                        {openReference ? "-" : "+"}
                                                    </Button>
                                                    <Button
                                                        className="bg-red w-10 hover:bg-white hover:text-primary "
                                                        aria-label="Update"
                                                        onClick={() => closeReference()}
                                                        disabled={isLoading}
                                                    >
                                                        x
                                                    </Button>
                                                </div>
                                                
                                            </div>
                                            {openReference ? (
                                                <PengisianLedTable
                                                    selectedData={dataMatriksPenilaian}
                                                    dataIsian={selectedDataReference}
                                                    showNilai={showNilai}
                                                    showMasukan={showMasukan}
                                                    prodi={selectedProdi.name}
                                                    toggleNilaiVisibility={toggleNilaiVisibility}
                                                    toggleMasukanVisibility={toggleMasukanVisibility}
                                                    handleInputChange={handleInputChange}
                                                    handleClickButton={handleClickButton}
                                                    type="readOnly"
                                                />
                                            ) : (
                                                <div className='mt-[0px] mx-[30px] mb-[0px] bg-gray p-3 rounded-md'>
                                                    Tabel reference disembunyikan
                                                </div>
                                            )}
                                            
                                        </div>
                                        
                                    ) : (
                                        <div className='mt-[0px] mx-[30px] mb-[0px] bg-gray p-3 rounded-md flex justify-center items-center text-center'>
                                            tidak ada data
                                        </div>
                                    )
                                )}
                                <br />
                                <div className='mt-[0px] mx-[30px] mb-[0px]'>
                                    <PengisianLedTable
                                        selectedData={dataMatriksPenilaian}
                                        dataIsian={selectedDataVersionLatest}
                                        showNilai={showNilai}
                                        showMasukan={showMasukan}
                                        prodi={userProdi.name}
                                        handleSelectedFilesChange={handleSelectedFilesChange} 
                                        toggleNilaiVisibility={toggleNilaiVisibility}
                                        toggleMasukanVisibility={toggleMasukanVisibility}
                                        handleInputChange={handleInputChange}
                                        handleClickButton={handleClickButton}
                                        type="editable"
                                    />
                                </div>
                                {openVersion ? (
                                    version.length > 0 ? 
                                        ( isLoadingVersion ? (
                                            <div>loading ...</div>
                                        ) : (
                                            <div>
                                                <div className='flex justify-between mx-[30px] mt-[30px]'>
                                                    <div>
                                                        {viewAllVersion ? (
                                                            <><h1 className="text-xl font-bold">Daftar Pembaruan</h1></>
                                                        ) : (
                                                            <>
                                                                <h1 className="text-xl font-bold">Commit : {version[parseInt(versionSelected)].commit}</h1>
                                                                <h3>Diperbarui pada {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric"}).format(new Date(version[parseInt(versionSelected)].created_at))}, oleh {version[parseInt(versionSelected)].user_name}</h3>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <button
                                                            className={`h-10 px-1 text-sm rounded-md bg-primary text-white opacity-50 `}
                                                            onClick={() => handleViewAllVersion()}
                                                            disabled={isLoadingVersion}
                                                        >
                                                            Tampilkan {viewAllVersion ? "Tabel Isian" : "Daftar Pembaruan"}
                                                        </button>
                                                    </div>
                                                </div>
                                                {viewAllVersion ? (
                                                    <VerticalLinearStepper
                                                        dataSteps={version}
                                                        paramActiveStep={versionSelected}
                                                        onStepChange={handleVersionChange}
                                                    />
                                                ) : (
                                                    <div className='mt-[0px] mx-[30px] mb-[0px] bg-gray p-3 rounded-md'>
                                                        <PengisianLedTable
                                                            selectedData={dataMatriksPenilaian}
                                                            dataIsian={selectedDataVersion}
                                                            showNilai={showNilai}
                                                            showMasukan={showMasukan}
                                                            prodi={userProdi.name}
                                                            toggleNilaiVisibility={toggleNilaiVisibility}
                                                            toggleMasukanVisibility={toggleMasukanVisibility}
                                                            handleInputChange={handleInputChange}
                                                            handleClickButton={handleClickButton}
                                                            type="readOnly"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <div>Tidak ada perubahan sebelumnya</div>
                                    )
                                ) : (
                                    <div></div>
                                )}
                            </>
                        )}
                        
                        <div className='m-[30px] flex justify-between items-center'>
                            <Button
                                className="bg-primary w-40 hover:bg-white hover:text-primary"
                                aria-label="Update"
                                // onClick={() =>navigate(`/versi/${no}/${selectedData.Sub}`)}
                                onClick={() => handleClickVersion()}
                                disabled={isLoading || isLoadingVersion}
                            >
                            {isLoadingVersion ? " ..." : "Version"}
                            </Button>
                            <ToastContainer/>
                            <div className=' rounded-md'>
                                <Button
                                    className="bg-primary w-40 mr-2"
                                    aria-label="Update"
                                    disabled={true}
                                >
                                Score : { isLoading ? "..." : score  } 
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
                            
                        </div>
                        
                    </div>
                ) : (
                    <div className="h-[80vh] my-10 pb-20 overflow-y-auto bg-white shadow-lg radius rounded-lg flex justify-center items-center text-center">
                        Tidak ada task untuk anda😊
                    </div>
                )}
                
            {/* </div> */}
        </div>
    )
}

export default PengisianMatrikLed