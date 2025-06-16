import { useState, useEffect, useMemo } from "react"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import axiosInstance from "../utils/axiosConfig"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InboxOutlined } from '@ant-design/icons';
import { message, Upload } from 'antd';
import BobotTable from "../components/Elements/DataTable/BobotTable"
import AddDataFromSpreadsheetModal from "../components/Elements/Modals/AddDataFromSpreadsheetModal"
import UploadedFileList from "../components/Elements/File/UploadedFileList"
import { handleDeleteFile, handleDownloadFile, fetchFilesFromStorage } from "../utils/fileHandlers"

import { Button } from "@/components/ui/button"
import SyaratPerluTerakreditasiTable from "../components/Elements/DataTable/SyaratPerluTerakreditasiTable"
import SyaratPerluPeringkatTable from "../components/Elements/DataTable/SyaratPerluPeringkatTable"
import { Spin } from 'antd'

const { Dragger } = Upload;

const ImportData = ({}) => {
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [importType, setImportType] = useState("importFile")
    const [fileList, setFileList] = useState([])
    const [isUploading, setIsUploading] = useState(false)
    const [uploadingCount, setUploadingCount] = useState(0)

    useEffect(() => {
        fetchFilesFromStorage(setFileList)
    }, [])

    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.ms-excel", // .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/octet-stream" // fallback untuk doc/docx/xlsx jika browser tidak mendeteksi
    ]

    const props = {
        name: "file",
        multiple: true,
        accept: ".png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx,.pdf",
        customRequest: async ({ file, onSuccess, onError }) => {
            // setIsUploading(true)
            setUploadingCount(prev => prev + 1)

            const fileTypeValid =
                allowedTypes.includes(file.type) ||
                /\.(docx?|xlsx?|pdf|png|jpe?g|webp)$/i.test(file.name)

            if (!fileTypeValid) {
                message.error(`${file.name} memiliki format yang tidak diizinkan.`)
                return onError("Tipe file tidak valid")
            }

            const formData = new FormData()
            formData.append("file[]", file)
            formData.append("folder", "file Pendukung")

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
                // setIsUploading(false)
                setUploadingCount(prev => prev - 1)
            }
        },
        showUploadList: false, 
    }

    const handleTabChange = (value) => {
        setImportType(value)
        console.log("value :", value)
    }

    useEffect(() => {
        console.log("import type :", importType)
    }, [importType])

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Import Data</CardTitle>
    
                    <CardDescription>
                        Memasukan data untuk kebutuhan aplikasi, seperti file untuk kebutuhan penyusunan LED dan LKPS, Import data bobot Butir, dan Syarat Perlu
                    </CardDescription>
                </CardHeader>
    
                <CardContent>
                    <Tabs defaultValue="importFile" onValueChange={handleTabChange}>
                        <div className="mt-2 flex justify-between items-center">
                            <TabsList>
                                <TabsTrigger value="importFile">Upload File</TabsTrigger>
                                <TabsTrigger value="syaratPerluTerakreditasi">Syarat Perlu Terakreditasi</TabsTrigger>
                                <TabsTrigger value="syaratPerluPeringkat">Syarat Perlu Peringkat</TabsTrigger>
                                <TabsTrigger value="bobot">Bobot Butir</TabsTrigger>
                            </TabsList>

                            {
                                importType !== 'importFile' &&
                                <Button
                                    onClick={() => setIsModalOpen(true)} 
                                    disabled={isLoading}
                                    className="flex bg-primary items-center gap-2"
                                >
                                    Import From Spreadsheet
                                </Button>
                            }
                        </div>

                        <TabsContent value="importFile" className="mt-4">
                            <div className="mb-4 border p-4 rounded shadow-sm bg-white">
                                <UploadedFileList
                                    files={fileList}
                                    onDelete={(file) => handleDeleteFile(file, setFileList)}
                                    onDownload={handleDownloadFile}
                                />
                            </div>
                            <Dragger {...props}>
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                                <p className="ant-upload-hint">
                                    Format yang didukung: .png, .jpg, .jpeg, .webp, .pdf, .xls, .xlsx, .doc, .docx
                                </p>
                            </Dragger>
                            {uploadingCount > 0 && (
                                <div className="mt-4 flex justify-center items-center">
                                    <Spin tip={`Mengunggah ${uploadingCount} file...`} size="small" />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="syaratPerluTerakreditasi" className="mt-4">
                            {!isModalOpen && <SyaratPerluTerakreditasiTable />}
                        </TabsContent>

                        <TabsContent value="syaratPerluPeringkat" className="mt-4">
                            {!isModalOpen && <SyaratPerluPeringkatTable />}
                        </TabsContent>

                        <TabsContent value="bobot" className="mt-4">
                            {!isModalOpen && <BobotTable />}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AddDataFromSpreadsheetModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                importType={importType}
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