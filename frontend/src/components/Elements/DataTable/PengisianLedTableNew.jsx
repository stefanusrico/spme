import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Editor } from "react-draft-wysiwyg";
import { ContentState } from "draft-js";
import { EditorState, convertToRaw, convertFromRaw } from "draft-js";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Label } from "@/components/ui/label";
import { fetchMasukanAndScoreFromGPT } from "../../../pages/PengisianLed";
import Button from "../Button";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddFileModal from "../Modals/AddFileModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function PengisianLedTableNew({ dataKriteriaIndikator, dataIsian, handleClickButton, updateDataIsian, type, prodi }) {
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataToUpload, setDataToUpload] = useState([]);
    const [globalDetails, setGlobalDetails] = useState({});
    const [initialized, setInitialized] = useState(false);
    const [selectedDetails, setSelectedDetails] = useState([]);
    const [ isOpenModalUploadFile, setIsOpenModalUploadFile] = useState(false)

    const itemsPerPage = 1;

    useEffect(() => {
        if (dataKriteriaIndikator && dataKriteriaIndikator.details) {
            console.log("data indikator :", dataKriteriaIndikator)
            console.log("data isian : ", dataIsian)
            setIsLoading(false);
        }
    }, [dataKriteriaIndikator]);

    useEffect(() => {
        console.log("update detail : ",selectedDetails)
    }, [selectedDetails])

    // useEffect(() => {
    //     console.log("data isian :", dataIsian)
    //     if (!dataKriteriaIndikator) return;

    //     const filteredDetails = dataKriteriaIndikator.details?.filter(detail => detail.Type === "K") || [];
    //     const updatedDetails = filteredDetails
    //         .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    //         .map(detail => {
    //             const dataIsianItem = dataIsian?.details?.find(item => item.seq === detail.Seq);
    //             return {
    //                 ...detail,
    //                 "Isian Asesi": dataIsianItem ? dataIsianItem.isian_asesi : "",
    //                 Nilai: dataIsianItem ? dataIsianItem.nilai : "-",
    //                 Masukan: dataIsianItem ? dataIsianItem.masukan : "",
    //                 "Data Pendukung": dataIsianItem ? dataIsianItem.data_pendukung : ""
    //             };
    //         });

    //     setSelectedDetails(updatedDetails);
    // }, [dataKriteriaIndikator, dataIsian, currentPage]);
    
    useEffect(() => {
        console.log("data isian :", dataIsian)
        if (!dataKriteriaIndikator) return;
        if (initialized) return;

        const filteredDetails = dataKriteriaIndikator.details?.filter(detail => detail.Type === "K") || [];
        const updatedDetails = filteredDetails
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map(detail => {
                const dataIsianItem = dataIsian?.details?.find(item => item.seq === detail.Seq);
                const rawContent = dataIsianItem?.isian_asesi;

                console.log("raw content : ", rawContent)
                let editorState = EditorState.createEmpty();
                if (rawContent) {
                    try {
                        const parsed = JSON.parse(rawContent);
                        console.log("parsed content : ", parsed)

                        // Validasi apakah ini raw Draft.js format
                        if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
                            const contentState = convertFromRaw(parsed);
                            editorState = EditorState.createWithContent(contentState);
                        } else {
                            console.warn("Not Draft.js raw format");
                        }
                    } catch (e) {
                        console.warn("Invalid raw content, using plain text fallback");
                
                        // Fallback ke plain text (dari string biasa)
                        const contentState = ContentState.createFromText(rawContent);
                        editorState = EditorState.createWithContent(contentState);
                    }
                }
            
                return {
                    ...detail,
                    editorState,
                    Nilai: dataIsianItem ? dataIsianItem.nilai : "-",
                    Masukan: dataIsianItem ? dataIsianItem.masukan : "",
                    "Data Pendukung": dataIsianItem ? dataIsianItem.data_pendukung : ""
                };
            });            

        setSelectedDetails(updatedDetails);
        setInitialized(true);
    }, [dataKriteriaIndikator, dataIsian, currentPage]);

    useEffect(() => {
        setInitialized(false);
    }, [currentPage]);

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
    };

    const handleButtonCheck = async(seq, index) => {
        try {
            const toInt = parseInt(seq, 10) - 1;
            const data = await fetchMasukanAndScoreFromGPT(dataKriteriaIndikator, dataIsian.details[toInt])
            
            if (!data || !data.nilai || !data.masukan) {
                throw new Error("Data dari GPT tidak lengkap!");
            }
            
            const updatedDetails = [...selectedDetails];
            updatedDetails[index]["Nilai"] = data.nilai;
            updatedDetails[index]["Masukan"] = data.masukan;
            setSelectedDetails(updatedDetails);
            console.log("data respon gpt : ", data)
            toast.success("Berhasil prompting gpt", data)
        } catch (error) {
            toast.error("Gagal prompting gpt")
        }
    };

    const handleEditorChange = (index, newEditorState) => {
        setSelectedDetails((prevDetails) => {
            const updated = [...prevDetails];
            const seq = updated[index].Seq;
    
            // Langsung simpan ke state duluan
            updated[index] = {
                ...updated[index],
                editorState: newEditorState,
            };
    
            // Setelah state update, baru update dataIsian
            const plainText = newEditorState.getCurrentContent().getPlainText();

            const updatedDataIsian = {
                ...dataIsian,
                details: dataIsian.details.map((item) =>
                    item.seq === seq ? { ...item, isian_asesi: plainText } : item
                ),
            };
    
            updateDataIsian(updatedDataIsian);
            return updated;
        });
    };
    
    const uploadImageCallBack = (file) => {
        return new Promise((resolve, reject) => {
          // Upload logic here, bisa pakai fetch/axios ke server kamu
          const reader = new FileReader();
          reader.onload = () => {
            resolve({ data: { link: reader.result } }); // base64 fallback
          };
          reader.readAsDataURL(file);
        });
      };

    const handleInputChange = (seq, key, value, index) => {
        const updatedDetails = [...selectedDetails];
        updatedDetails[index]["Isian Asesi"] = value;
        setSelectedDetails(updatedDetails);

        const updatedDataIsian = {
            ...dataIsian,
            details: dataIsian.details.map((item) =>
                item.seq === seq ? { ...item, [key]: value } : item
            ),
        };
        updateDataIsian(updatedDataIsian);
        // Update dataIsian agar sinkron dengan perubahan
        // if (updateDataIsian) {
        //     updateDataIsian(updatedDetails[index].Seq, value);
        // }
    };

    if (isLoading) {
        return <div className="text-center py-4">Loading...</div>;
    }

    const totalPages = Math.ceil((dataKriteriaIndikator?.details?.filter(detail => detail.Type === "K") || []).length / itemsPerPage);

    const toastContainerStyle = { zIndex: 20000 }  

    return (
        <div className="border p-4 rounded">
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

            <AddFileModal
                isOpen={isOpenModalUploadFile}
                onClose={() => setIsOpenModalUploadFile(false)}
                onAdd={handleButtonCheck}
                availableRoles={selectedDetails || []}
                selectedDetails={selectedDetails}
                dataIsian={dataIsian}
                updateDataIsian={updateDataIsian}
                // canAddAdmin={canManageAdmins}
            />

            {type === "readonly" && (
                <h1 className="text-xl font-bold">Program Studi Referensi : {prodi.name}</h1>
            )}


            <Stack spacing={2} className="mb-4 center-stack">
                <Pagination
                    count={totalPages || 1}
                    page={currentPage}
                    onChange={handlePageChange}
                    renderItem={(item) => (
                        <PaginationItem
                            className="pagination-items"
                            slots={{ previous: ArrowBackIcon, next: ArrowForwardIcon }}
                            {...item}
                        />
                    )}
                />
            </Stack>

            {selectedDetails.map((detail, index) => (
                <div key={index} className="mb-6">
                    <div className="pb-4 flex">
                        <div className="font-semibold h-10 mr-4 flex items-center justify-center">
                            {detail.Seq}. Kriteria Indikator: {detail.Reference || ""}
                        </div>
                        <Button className="bg-primary w-auto text-sm py-0" disabled={true}>
                            Score: {detail.Nilai || "-"}
                        </Button>
                    </div>

                    {/* <div className="w-full items-center gap-1.5">
                        <Label htmlFor={`isian_asesi_${index}`}>Isian Asesi</Label>
                        <textarea
                            id={`isian_asesi_${index}`}
                            placeholder="Isian Asesi"
                            className="w-full p-2 border rounded-md min-h-[40px] resize-none"
                            value={detail["Isian Asesi"] || ""}
                            readOnly={type === "readonly" || type === "readonlyVersion"}
                            onChange={(e) => handleInputChange(detail.Seq, 'isian_asesi' ,e.target.value, index)}
                            onInput={(e) => {
                                e.target.style.height = "40px";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                        ></textarea>
                    </div> */}

                    <div className="w-full items-center gap-1.5">
                        <Label htmlFor={`isian_asesi_${index}`}>Isian Asesi</Label>
                        <div className={`border ${type === 'readonly' || type === 'readonlyVersion' ? 'pointer-events-none opacity-80' : ''}`}>
                            <Editor
                                key={detail.Seq}
                                editorState={detail.editorState}
                                onEditorStateChange={(editorState) => handleEditorChange(index, editorState)}
                                toolbarHidden={type === 'readonly' || type === 'readonlyVersion'}
                                readOnly={type === 'readonly' || type === 'readonlyVersion'}
                                wrapperClassName="demo-wrapper"
                                editorClassName="demo-editor p-2 min-h-[100px]"
                                spellCheck={false}
                                toolbar={{
                                    image: {
                                      urlEnabled: true,
                                      uploadEnabled: false, // karena kita pakai URL
                                      alignmentEnabled: true,
                                      previewImage: true,
                                      inputAccept: 'image/gif,image/jpeg,image/jpg,image/png,image/svg',
                                      defaultSize: {
                                        height: 'auto',
                                        width: '100%',
                                      },
                                    }
                                  }}
                            />
                        </div>
                    </div>


                    <div className="mt-4 flex justify-end">
                        <Button
                            className="bg-black w-80 hover:bg-white hover:text-primary mr-2"
                            aria-label="Update"
                            onClick={() => setIsOpenModalUploadFile(true)}
                            disabled={type === "readonly" || type === "readonlyVersion"}
                        >
                            Upload file Data Pendukung
                        </Button>
                        <Button
                            className="bg-primary w-40 hover:bg-white hover:text-black"
                            aria-label="Check"
                            onClick={() => handleButtonCheck(detail.Seq, index)}
                            disabled={type === "readonly" || type === "readonlyVersion"}
                        >
                            Check
                        </Button>
                    </div>

                    <div className="w-full items-center gap-1.5 mt-4">
                        <Label htmlFor={`masukan_${index}`}>Masukan dan Saran</Label>
                        <textarea
                            id={`masukan_${index}`}
                            placeholder="Masukan dari GPT"
                            className="w-full p-2 border rounded-md min-h-[40px] resize-none"
                            value={detail.Masukan || ""}
                            readOnly
                            onInput={(e) => {
                                e.target.style.height = "40px";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                        ></textarea>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PengisianLedTableNew;
