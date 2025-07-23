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
import { Loader2, Upload, FileText, Trash2 } from "lucide-react"
import axiosInstance from "../../../utils/axiosConfig"

function PengisianLedTableNew({
  dataKriteriaIndikator,
  dataIsian,
  handleClickButton,
  updateDataIsian,
  type,
  prodi,
  noSub,
  userData,
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCheck, setIsLoadingCheck] = useState(false)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
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
      console.log("userData xixi : ", userData)
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
          pdfFiles: dataIsianItem?.pdfFiles || [],
        }
      })

    setSelectedDetails(updatedDetails)
    setInitialized(true)
  }, [dataKriteriaIndikator, dataIsian, currentPage])

  useEffect(() => {
    setInitialized(false)
  }, [currentPage])

  const handleEditorChange = (index, editorState) => {
    // Update selectedDetails dengan editorState baru
    setSelectedDetails((prevDetails) =>
      prevDetails.map((detail, i) =>
        i === index ? { ...detail, editorState } : detail
      )
    )

    // Update dataIsian dengan konten editor terbaru
    const rawContent = convertToRaw(editorState.getCurrentContent())
    const currentDetail = selectedDetails[index]

    if (currentDetail) {
      const updatedDataIsian = {
        ...dataIsian,
        details: (dataIsian.details || []).map((item) =>
          item.seq === currentDetail.seq
            ? {
                ...item,
                isianAsesi: JSON.stringify(rawContent),
              }
            : item
        ),
      }

      updateDataIsian(updatedDataIsian)
    }
  }

  const handlePageChange = (event, page) => {
    setCurrentPage(page)
  }

  // Fungsi untuk upload PDF
  const handlePdfUpload = async (event, seq) => {
    const file = event.target.files[0]
    if (!file) return

    // Validasi file PDF
    if (file.type !== "application/pdf") {
      toast.error("Hanya file PDF yang diizinkan!", {
        toastId: `pdf-error-${seq}`, // Berikan ID unik
      })
      return
    }

    // Validasi ukuran file (maksimal 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB!", {
        toastId: `size-error-${seq}`, // Berikan ID unik
      })
      return
    }

    setIsUploadingPdf(true)

    try {
      // Menggunakan userData dari context seperti di prompting
      const prodiName =
        userData?.prodi?.name || userData?.prodi_name || "Default Prodi"

      console.log("Prodi name yang akan digunakan untuk upload PDF:", prodiName)

      const formData = new FormData()
      // Sanitize nama file agar tidak ada karakter bermasalah seperti +, , dan spasi
      const originalName = file.name
      const cleanName = originalName
        .replace(/\s+/g, "_") // spasi → underscore
        .replace(/\+/g, "_") // plus → underscore
        .replace(/,/g, "_") // koma → underscore
        .replace(/[^a-zA-Z0-9._-]/g, "") // hapus karakter aneh lainnya

      // Buat File baru dengan nama bersih (opsional)
      const cleanedFile = new File([file], cleanName, { type: file.type })

      formData.append("file[]", cleanedFile)
      formData.append("noKriteria[]", seq)
      formData.append("subFolder", prodiName)
      formData.append("noSub", noSub)
      formData.append("fileType", "pdf")

      const response = await axiosInstance.post("/upload-to-drive", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const uploaded = response.data.files?.[0]
      if (!uploaded) throw new Error("Upload PDF gagal")

      // Update dataIsian dengan file PDF
      const updatedDataIsian = {
        ...dataIsian,
        details: (dataIsian.details || []).map((item) =>
          item.seq === seq
            ? {
                ...item,
                pdfFiles: [
                  ...(item.pdfFiles || []),
                  {
                    file_name: uploaded.file_name,
                    local_url: uploaded.local_url,
                    file_id: uploaded.file_id,
                    drive_url: uploaded.file_url,
                  },
                ],
              }
            : item
        ),
      }

      updateDataIsian(updatedDataIsian)

      // Update selectedDetails juga
      setSelectedDetails((prevDetails) =>
        prevDetails.map((detail) =>
          detail.seq === seq
            ? {
                ...detail,
                pdfFiles: [
                  ...(detail.pdfFiles || []),
                  {
                    file_name: uploaded.file_name,
                    local_url: uploaded.local_url,
                    file_id: uploaded.file_id,
                    drive_url: uploaded.file_url,
                  },
                ],
              }
            : detail
        )
      )

      toast.success(`File PDF "${file.name}" berhasil diupload!`, {
        toastId: `upload-success-${seq}-${Date.now()}`, // ID unik dengan timestamp
      })

      // Reset input file
      event.target.value = ""
    } catch (error) {
      console.error("Upload PDF gagal:", error)
      toast.error("Gagal mengupload file PDF")
    } finally {
      setIsUploadingPdf(false)
    }
  }

  const handleButtonCheck = async (seq, index) => {
    setIsLoadingCheck(true)
    try {
      console.log("Starting API call...")
      console.log("seq:", seq, "index:", index)
      console.log("userData:", userData)
      console.log("dataKriteriaIndikator:", dataKriteriaIndikator)
      console.log("dataIsian details:", dataIsian?.details)

      // Kembali ke pattern yang berfungsi
      const prodiName =
        userData?.prodi?.name || userData?.prodi_name || "Default Prodi"

      console.log("Prodi name yang akan digunakan:", prodiName)

      if (!dataIsian?.details || dataIsian.details.length === 0) {
        toast.error("Data isian belum lengkap")
        return
      }

      if (!dataKriteriaIndikator) {
        toast.error("Data kriteria indikator tidak ditemukan")
        return
      }

      const data = await fetchMasukanAndScoreFromAI(
        prodiName,
        dataKriteriaIndikator,
        dataIsian.details
      )

      console.log("API response:", data)

      const updatedDataIsian = {
        ...dataIsian,
        nilai: data.nilai,
        masukan: data.masukan,
      }

      updateDataIsian(updatedDataIsian)
      toast.success("Berhasil mendapatkan scoring dan masukan", {
        toastId: `scoring-success-${seq}`, // ID unik
      })
    } catch (error) {
      console.error("Error calling scoring API:", error)
      toast.error(`Gagal mendapatkan scoring: ${error.message}`, {
        toastId: `scoring-error-${seq}`, // ID unik
      })
    } finally {
      setIsLoadingCheck(false)
    }
  }

  // Fungsi untuk menghapus PDF
  const handleDeletePdf = async (seq, pdfIndex) => {
    try {
      const updatedDataIsian = {
        ...dataIsian,
        details: (dataIsian.details || []).map((item) =>
          item.seq === seq
            ? {
                ...item,
                pdfFiles: (item.pdfFiles || []).filter(
                  (_, index) => index !== pdfIndex
                ),
              }
            : item
        ),
      }

      updateDataIsian(updatedDataIsian)

      // Update selectedDetails juga
      setSelectedDetails((prevDetails) =>
        prevDetails.map((detail) =>
          detail.seq === seq
            ? {
                ...detail,
                pdfFiles: (detail.pdfFiles || []).filter(
                  (_, index) => index !== pdfIndex
                ),
              }
            : detail
        )
      )

      toast.success("File PDF berhasil dihapus!")
    } catch (error) {
      console.error("Hapus PDF gagal:", error)
      toast.error("Gagal menghapus file PDF")
    }
  }

  const uploadImageCallBack = async (file, seq) => {
    // Menggunakan userData dari context seperti di prompting
    const prodiName =
      userData?.prodi?.name || userData?.prodi_name || "Default Prodi"

    console.log("Prodi name yang akan digunakan untuk upload image:", prodiName)

    const formData = new FormData()
    formData.append("file[]", file)
    formData.append("noKriteria[]", seq)
    formData.append("subFolder", prodiName)
    formData.append("noSub", noSub)

    try {
      const response = await axiosInstance.post("/upload-to-drive", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const uploaded = response.data.files?.[0]
      if (!uploaded) throw new Error("Upload gagal")

      //update dataisian
      const relatedEditor = selectedDetails.find((item) => item.seq === seq)
      if (relatedEditor && relatedEditor.editorState) {
        const rawContent = convertToRaw(
          relatedEditor.editorState.getCurrentContent()
        )

        const updatedDataIsian = {
          ...dataIsian,
          details: (dataIsian.details || []).map((item) =>
            item.seq === seq
              ? {
                  ...item,
                  isianAsesi: JSON.stringify(rawContent),
                  dataPendukung: [...(item.dataPendukung || []), uploaded],
                }
              : item
          ),
        }

        updateDataIsian(updatedDataIsian)
      }

      console.log(uploaded.local_url)
      return {
        data: {
          link: uploaded.local_url,
        },
      }
    } catch (error) {
      console.error("Upload gambar gagal:", error)
      return Promise.reject(error)
    }
  }

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
      {/* Hapus ToastContainer dari sini karena sudah ada di parent component */}
      {/* <ToastContainer .../> - HAPUS INI */}

      <AddFileModal
        isOpen={isOpenModalUploadFile}
        onClose={() => setIsOpenModalUploadFile(false)}
        onAdd={handleButtonCheck}
        availableRoles={selectedDetails || []}
        selectedDetails={selectedDetails}
        dataIsian={dataIsian}
        updateDataIsian={updateDataIsian}
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
                    uploadEnabled: true,
                    uploadCallback: (file) =>
                      uploadImageCallBack(file, detail.seq),
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

          {/* Section untuk Upload PDF */}
          {type !== "readonly" && type !== "readonlyVersion" && (
            <div className="w-full items-center gap-1.5 mt-4">
              <Label htmlFor={`pdf_upload_${index}`}>
                Bukti Pendukung (PDF)
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <label
                    htmlFor={`pdf_upload_${detail.seq}`}
                    className={`flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors ${
                      isUploadingPdf ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 text-center">
                      {isUploadingPdf
                        ? "Mengupload..."
                        : "Klik untuk upload file PDF"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Maksimal 10MB</p>
                  </label>
                  <input
                    id={`pdf_upload_${detail.seq}`}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handlePdfUpload(e, detail.seq)}
                    className="hidden"
                    disabled={isUploadingPdf}
                  />
                </div>

                {/* Display uploaded PDFs */}
                {detail.pdfFiles && detail.pdfFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      File PDF yang diupload:
                    </h4>
                    {detail.pdfFiles.map((pdf, pdfIndex) => (
                      <div
                        key={pdfIndex}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded border"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-gray-700 truncate max-w-xs">
                            {pdf.file_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={encodeURI(pdf.local_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Lihat
                          </a>
                          <button
                            onClick={() =>
                              handleDeletePdf(detail.seq, pdfIndex)
                            }
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Hapus file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Display PDF files in readonly mode */}
          {(type === "readonly" || type === "readonlyVersion") &&
            detail.pdfFiles &&
            detail.pdfFiles.length > 0 && (
              <div className="w-full items-center gap-1.5 mt-4">
                <Label>Bukti Pendukung (PDF)</Label>
                <div className="space-y-2 mt-2">
                  {detail.pdfFiles.map((pdf, pdfIndex) => (
                    <div
                      key={pdfIndex}
                      className="flex items-center space-x-2 bg-gray-50 p-2 rounded border"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {pdf.file_name}
                      </span>
                      <a
                        href={pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Lihat
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <div className="mt-4 flex justify-end">
            {type !== "readonly" && type !== "readonlyVersion" ? (
              <Button
                className={`bg-primary flex items-center gap-2 hover:bg-white hover:text-black ${
                  isLoadingCheck ? "opacity-50 cursor-not-allowed" : ""
                }`}
                aria-label="Check"
                onClick={() => {
                  console.log("Button Check diklik!")
                  console.log("seq:", detail.seq)
                  console.log("index:", index)
                  handleButtonCheck(detail.seq, index)
                }}
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
