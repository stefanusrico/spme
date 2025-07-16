import { useState, useEffect, useMemo } from "react"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import axiosInstance from "../utils/axiosConfig"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InboxOutlined } from "@ant-design/icons"
import { message, Upload } from "antd"
import BobotTable from "../components/Elements/DataTable/BobotTable"
import PengisianLedP2mpp from "../components/Elements/DataTable/PengisianLedP2mpp"
import AddDataFromSpreadsheetModal from "../components/Elements/Modals/AddDataFromSpreadsheetModal"
import UploadTemplateLkpsModal from "../components/Elements/Modals/UploadTemplateLkpsModal"
import ImportLkpsFromSpreadsheetModal from "../components/Elements/Modals/ImportLkpsFromSpreadsheetModal"
import UploadedFileList from "../components/Elements/File/UploadedFileList"
import {
  handleDeleteFile,
  handleDownloadFile,
  fetchFilesFromStorage,
} from "../utils/fileHandlers"

import { Button } from "@/components/ui/button"
import SyaratPerluTerakreditasiTable from "../components/Elements/DataTable/SyaratPerluTerakreditasiTable"
import SyaratPerluPeringkatTable from "../components/Elements/DataTable/SyaratPerluPeringkatTable"
import { Spin } from "antd"
import { useUser } from "../context/userContext"
import LedItemTable from "../components/Elements/DataTable/LedItemTable"
import LkpsTable from "../components/Elements/DataTable/LkpsTable"

const { Dragger } = Upload

const ImportData = ({}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploadTemplateLkpsModalOpen, setIsUploadTemplateLkpsModalOpen] =
    useState(false)
  const [isImportLkpsModalOpen, setIsImportLkpsModalOpen] = useState(false) // New modal state
  const [importType, setImportType] = useState("importFile")
  const [fileList, setFileList] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const { userData } = useUser()

  useEffect(() => {
    if (!userData) return
    console.log("userData :", userData)
    fetchFilesFromStorage(setFileList)
  }, [userData])

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/octet-stream", // fallback untuk doc/docx/xlsx jika browser tidak mendeteksi
  ]

  const props = {
    name: "file",
    multiple: true,
    accept: ".png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx,.pdf",
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploadingCount((prev) => prev + 1)

      const fileTypeValid =
        allowedTypes.includes(file.type) ||
        /\.(docx?|xlsx?|pdf|png|jpe?g|webp)$/i.test(file.name)

      if (!fileTypeValid) {
        message.error(`${file.name} memiliki format yang tidak diizinkan.`)
        return onError("Tipe file tidak valid")
      }

      const formData = new FormData()
      formData.append("file[]", file)
      formData.append("folder", "Supporting File")

      try {
        await axiosInstance.post("/upload-to-drive-supporting-file", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        onSuccess("Ok")
        message.success(`${file.name} uploaded successfully`)
        fetchFilesFromStorage(setFileList)
      } catch (err) {
        console.error(err)
        onError(err)
        message.error(`${file.name} upload failed.`)
      } finally {
        setUploadingCount((prev) => prev - 1)
      }
    },
    showUploadList: false,
  }

  const handleTabChange = (value) => {
    setImportType(value)
    console.log("value :", value)
  }

  const handleUploadTemplateLkpsSuccess = (data) => {
    console.log("Template LKPS uploaded successfully:", data)
    // Refresh data jika diperlukan
    // fetchFilesFromStorage(setFileList)
  }

  const handleImportLkpsSuccess = (data) => {
    console.log("LKPS data imported successfully:", data)
    // Refresh LKPS table or perform other actions
  }

  useEffect(() => {
    console.log("userData :", userData)
    console.log("import type :", importType)
  }, [importType])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Komponen Penilaian</CardTitle>

          <CardDescription>
            Komponen penilaian untuk kebutuhan aplikasi, seperti file untuk
            kebutuhan penyusunan LED dan LKPS, Import data bobot Butir, dan
            Syarat Perlu
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="importFile" onValueChange={handleTabChange}>
            <div className="mt-2 flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="importFile">Supporting File</TabsTrigger>
                <TabsTrigger value="syaratPerluTerakreditasi">
                  Syarat Perlu Terakreditasi
                </TabsTrigger>
                <TabsTrigger value="syaratPerluPeringkat">
                  Syarat Perlu Peringkat
                </TabsTrigger>
                <TabsTrigger value="bobot">Bobot Butir</TabsTrigger>
                <TabsTrigger value="ledItem">LED Item</TabsTrigger>
                <TabsTrigger value="lkpsTemplate"> LKPS</TabsTrigger>
                {userData?.role === "Admin" && (
                  <TabsTrigger value="pengisianLed">Pengisian LED</TabsTrigger>
                )}
              </TabsList>

              {/* Button untuk tab selain importFile, pengisianLed, dan lkpsTemplate */}
              {importType !== "importFile" &&
                importType !== "pengisianLed" &&
                importType !== "lkpsTemplate" &&
                userData?.role === "Admin" && (
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    disabled={isLoading}
                    className="flex bg-primary items-center gap-2"
                  >
                    Import From Spreadsheet
                  </Button>
                )}

              {/* Tiga button khusus untuk LKPS */}
              {importType === "lkpsTemplate" && userData?.role === "Admin" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsImportLkpsModalOpen(true)}
                    disabled={isLoading}
                    className="flex bg-primary hover:bg-green-700 items-center gap-2"
                  >
                    Import Data LKPS
                  </Button>
                  <Button
                    onClick={() => setIsUploadTemplateLkpsModalOpen(true)}
                    disabled={isLoading}
                    className="flex bg-primary hover:bg-blue-700 items-center gap-2"
                  >
                    Upload Template
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="importFile" className="mt-4">
              <div className="mb-4 border p-4 rounded shadow-sm bg-white">
                <UploadedFileList
                  files={fileList}
                  onDelete={(file) => handleDeleteFile(file, setFileList)}
                  onDownload={handleDownloadFile}
                  userData={userData}
                />
              </div>
              {userData?.role === "Admin" && (
                <Dragger {...props}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag file to this area to upload
                  </p>
                  <p className="ant-upload-hint">
                    Format yang didukung: .png, .jpg, .jpeg, .webp, .pdf, .xls,
                    .xlsx, .doc, .docx
                  </p>
                </Dragger>
              )}
              {uploadingCount > 0 && (
                <div className="mt-4 flex justify-center items-center">
                  <Spin
                    tip={`Mengunggah ${uploadingCount} file...`}
                    size="small"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="syaratPerluTerakreditasi" className="mt-4">
              {!isModalOpen && (
                <SyaratPerluTerakreditasiTable userData={userData} />
              )}
            </TabsContent>

            <TabsContent value="syaratPerluPeringkat" className="mt-4">
              {!isModalOpen && (
                <SyaratPerluPeringkatTable userData={userData} />
              )}
            </TabsContent>

            <TabsContent value="bobot" className="mt-4">
              {!isModalOpen && <BobotTable userData={userData} />}
            </TabsContent>

            <TabsContent value="ledItem" className="mt-4">
              {!isModalOpen && <LedItemTable userData={userData} />}
            </TabsContent>

            <TabsContent value="lkpsTemplate" className="mt-4">
              {!isModalOpen && !isImportLkpsModalOpen && (
                <LkpsTable userData={userData} />
              )}
            </TabsContent>

            <TabsContent value="pengisianLed" className="mt-4">
              <PengisianLedP2mpp userData={userData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal untuk import template (existing) */}
      <AddDataFromSpreadsheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        importType={importType}
      />

      {/* Modal untuk upload template LKPS (existing) */}
      <UploadTemplateLkpsModal
        isOpen={isUploadTemplateLkpsModalOpen}
        onClose={() => setIsUploadTemplateLkpsModalOpen(false)}
        onSuccess={handleUploadTemplateLkpsSuccess}
      />

      {/* Modal baru untuk import data LKPS dari spreadsheet */}
      <ImportLkpsFromSpreadsheetModal
        isOpen={isImportLkpsModalOpen}
        onClose={() => setIsImportLkpsModalOpen(false)}
        onSuccess={handleImportLkpsSuccess}
      />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  )
}

export default ImportData
