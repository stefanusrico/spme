import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Editor } from "react-draft-wysiwyg"
import { ContentState } from "draft-js"
import { EditorState, convertToRaw, convertFromRaw } from "draft-js"
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css"
import { Label } from "@/components/ui/label"
import { fetchMasukanAndScoreFromAI } from "../../../pages/PengisianLed"
import Button from "../Button"
import Pagination from "@mui/material/Pagination"
import PaginationItem from "@mui/material/PaginationItem"
import Stack from "@mui/material/Stack"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import AddFileModal from "../Modals/AddFileModal"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Spin } from "antd"
import { Loader2 } from "lucide-react"
import axiosInstance from "../../../utils/axiosConfig"

function PengisianLedTableNew({
  dataKriteriaIndikator,
  dataIsian,
  handleClickButton,
  updateDataIsian,
  type,
  prodi,
  noSub
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCheck, setIsLoadingCheck] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [dataToUpload, setDataToUpload] = useState([])
  const [globalDetails, setGlobalDetails] = useState({})
  const [initialized, setInitialized] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState([])
  const [isOpenModalUploadFile, setIsOpenModalUploadFile] = useState(false)

  const itemsPerPage = 1

  useEffect(() => {
    if (dataKriteriaIndikator && dataKriteriaIndikator.details) {
      console.log("data indikator :", dataKriteriaIndikator)
      console.log("data isian : ", dataIsian)
      setIsLoading(false)
    }
  }, [dataKriteriaIndikator])

  useEffect(() => {
    console.log("update detail : ", selectedDetails)
  }, [selectedDetails])

  useEffect(() => {
    console.log("data isian :", dataIsian)
    if (!dataKriteriaIndikator) return
    if (initialized) return

    const filteredDetails =
      dataKriteriaIndikator.details?.filter((detail) => detail.type === "K") ||
      []
    const updatedDetails = filteredDetails
      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      .map((detail) => {
        const dataIsianItem = dataIsian?.details?.find(
          (item) => item.seq === detail.seq
        )
        const rawContent = dataIsianItem?.isianAsesi || ""

        console.log("raw content : ", rawContent)
        let editorState = EditorState.createEmpty()
        if (rawContent) {
          try {
            const parsed = JSON.parse(rawContent)
            console.log("parsed content : ", parsed)

            // Validasi apakah ini raw Draft.js format
            if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
              const contentState = convertFromRaw(parsed)
              editorState = EditorState.createWithContent(contentState)
            } else {
              console.warn("Not Draft.js raw format")
            }
          } catch (e) {
            console.warn("Invalid raw content, using plain text fallback")

            // Fallback ke plain text (dari string biasa)
            const contentState = ContentState.createFromText(rawContent)
            editorState = EditorState.createWithContent(contentState)
          }
        }

        return {
          ...detail,
          editorState,
          "Data Pendukung": dataIsianItem ? dataIsianItem.data_pendukung : "",
        }
      })

    setSelectedDetails(updatedDetails)
    setInitialized(true)
  }, [dataKriteriaIndikator, dataIsian, currentPage])

  useEffect(() => {
    setInitialized(false)
  }, [currentPage])

  const handlePageChange = (event, page) => {
    setCurrentPage(page)
  }

  const handleButtonCheck = async (seq, index) => {
    setIsLoadingCheck(true)
    try {
      const toInt = parseInt(seq, 10) - 1

      if (!dataIsian?.details || !dataIsian?.details[toInt]) {
        toast.error("DataIsian belum lengkap atau indeks tidak ditemukan")
        return
      }

      const data = await fetchMasukanAndScoreFromAI(
        dataKriteriaIndikator,
        dataIsian?.details
      )

      // updateDataIsian(updatedDetails)
      const updatedDataIsian = {
        ...dataIsian,
        nilai: data.nilai,
        masukan: data.masukan,
      };

      updateDataIsian(updatedDataIsian);
      toast.success("Berhasil prompting ", )
    } catch (error) {
      toast.info("skor prompting",)
      toast.error("Gagal prompting ")
    } finally{
      setIsLoadingCheck(false)
    }
  }

  const handleEditorChange = (index, newEditorState) => {
    setSelectedDetails((prevDetails) => {
      const updated = [...prevDetails]
      const seq = updated[index].seq

      // Langsung simpan ke state duluan
      updated[index] = {
        ...updated[index],
        editorState: newEditorState,
      }

      // Setelah state update, baru update dataIsian
      // const plainText = newEditorState.getCurrentContent().getPlainText()
      const rawContent = convertToRaw(newEditorState.getCurrentContent());

      if (!dataIsian || !dataIsian?.details) {
        toast.error("Data belum siap!");
        return;
      }

      const updatedDataIsian = {
        ...dataIsian,
        details: (dataIsian?.details || []).map((item) =>
          // item.seq === seq ? { ...item, isianAsesi: plainText } : item
          item.seq === seq ? { ...item, isianAsesi: JSON.stringify(rawContent) } : item
        ),
      }

      updateDataIsian(updatedDataIsian)
      return updated
    })
  }

  const uploadImageCallBack = async (file, seq) => {
    const userLocalhost = localStorage.getItem("user");
    const jsonUserLocalhost = JSON.parse(userLocalhost);
    const currentProdiName = jsonUserLocalhost.prodi.name;

    const formData = new FormData();
    formData.append("file[]", file);
    formData.append("noKriteria[]", seq);
    formData.append("subFolder", currentProdiName);
    formData.append("noSub", noSub);

    try {
      const response = await axiosInstance.post("/upload-to-drive", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploaded = response.data.files?.[0];
      if (!uploaded) throw new Error("Upload gagal");

      //update dataisian
      const relatedEditor = selectedDetails.find((item) => item.seq === seq);
      if (relatedEditor && relatedEditor.editorState) {
        const rawContent = convertToRaw(relatedEditor.editorState.getCurrentContent());

        const updatedDataIsian = {
          ...dataIsian,
          details: (dataIsian.details || []).map((item) =>
            item.seq === seq ? { 
              ...item, 
              isianAsesi: JSON.stringify(rawContent),
              dataPendukung: [...(item.dataPendukung || []), uploaded],
            } : item,
              
          ),
        };

        updateDataIsian(updatedDataIsian);
      }

      console.log(uploaded.local_url)
      return {
        data: {
          link: uploaded.local_url,
        },
      };
    } catch (error) {
      console.error("Upload gambar gagal:", error);
      return Promise.reject(error);
    }
  };

  const toastContainerStyle = {
    zIndex: 20000,
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

  const totalPages = Math.ceil(
    (
      dataKriteriaIndikator?.details?.filter((detail) => detail.type === "K") ||
      []
    ).length / itemsPerPage
  )

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
        <h1 className="text-xl font-bold">
          Program Studi Referensi : {prodi.name}
        </h1>
      )}
      
      <Stack spacing={2} className="mb-4 center-stack flex center">
        <Pagination
          className="flex justify-center"
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
              {detail.seq}. Kriteria Indikator: {detail.reference || ""}
            </div>
            <Button className="bg-primary w-auto text-sm py-0" disabled={true}>
              Score: {dataIsian?.nilai || "-"}
            </Button>
          </div>

          <div className="w-full items-center gap-1.5">
            <Label htmlFor={`isian_asesi_${index}`}>Isian Asesi</Label>
            <div
              className={`border ${
                type === "readonly" || type === "readonlyVersion"
                  ? "pointer-events-none opacity-80"
                  : ""
              }`}
            >
              <Editor
                key={detail.seq}
                editorState={detail.editorState}
                onEditorStateChange={(editorState) =>
                  handleEditorChange(index, editorState)
                }
                toolbarHidden={
                  type === "readonly" || type === "readonlyVersion"
                }
                readOnly={type === "readonly" || type === "readonlyVersion"}
                wrapperClassName="demo-wrapper"
                editorClassName="demo-editor p-2 min-h-[100px]"
                spellCheck={false}
                toolbar={{
                  image: {
                    urlEnabled: true,
                    uploadEnabled: true, // karena kita pakai URL
                    uploadCallback: (file) => uploadImageCallBack(file, detail.seq),
                    alt: { present: true, mandatory: false },
                    alignmentEnabled: true,
                    previewImage: true,
                    inputAccept:
                      "image/gif,image/jpeg,image/jpg,image/png,image/svg",
                    defaultSize: {
                      height: "auto",
                      width: "100%",
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            {type !== "readonly" && type !== "readonlyVersion" ? (
              <Button
                className={`bg-primary flex items-center gap-2 hover:bg-white hover:text-black ${isLoadingCheck ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Check"
                onClick={() => handleButtonCheck(detail.seq, index)}
                disabled={isLoadingCheck}
              >
                {isLoadingCheck ? (
                  <>
                    <span>Check...</span>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    <span>Check</span>
                  </>
                )}
              </Button>
            ) : null}
          </div>

          <div className="w-full items-center gap-1.5 mt-4">
            <Label htmlFor={`masukan_${index}`}>Masukan dan Saran</Label>
            <textarea
              id={`masukan_${index}`}
              placeholder="Masukan dari GPT"
              className="w-full p-2 border rounded-md min-h-[80px] resize-none"
              value={dataIsian?.masukan || ""}
              readOnly
              onInput={(e) => {
                e.target.style.height = "80px"
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
            ></textarea>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PengisianLedTableNew
