import React, { useState } from "react"
import { Modal, Upload, Button, message } from "antd"
import { InboxOutlined } from "@ant-design/icons"
import axiosInstance from "../../../utils/axiosConfig"

const { Dragger } = Upload

const UploadTemplateLkpsModal = ({ isOpen, onClose, onSuccess }) => {
  const [fileList, setFileList] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error("Pilih file terlebih dahulu")
      return
    }

    setIsUploading(true)
    const formData = new FormData()

    formData.append("file", fileList[0])
    formData.append("template", fileList[0])
    formData.append("template_file", fileList[0])

    // Log untuk debugging
    console.log("File yang akan diupload:", fileList[0])
    console.log("FormData entries:")
    for (let [key, value] of formData.entries()) {
      console.log(key, value)
    }

    try {
      const response = await axiosInstance.post("/templates/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      message.success("Template LKPS berhasil diupload")
      setFileList([])
      onClose()
      if (onSuccess) onSuccess(response.data)
    } catch (error) {
      console.error("Upload error:", error)
      console.error("Error response:", error.response?.data)
      message.error(
        error.response?.data?.message || "Gagal mengupload template LKPS"
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setFileList([])
    onClose()
  }

  const uploadProps = {
    name: "file",
    multiple: false,
    accept: ".xls,.xlsx",
    beforeUpload: (file) => {
      const isExcel =
        file.type === "application/vnd.ms-excel" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        /\.(xls|xlsx)$/i.test(file.name)

      if (!isExcel) {
        message.error("Hanya file Excel (.xls, .xlsx) yang diperbolehkan")
        return false
      }

      // Batasi ukuran file maksimal 10MB
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        message.error("Ukuran file tidak boleh lebih dari 10MB")
        return false
      }

      setFileList([file])
      return false // Prevent auto upload
    },
    onRemove: () => {
      setFileList([])
    },
    fileList: fileList,
    showUploadList: {
      showPreviewIcon: false,
      showDownloadIcon: false,
    },
  }

  return (
    <Modal
      title="Upload Template LKPS"
      open={isOpen}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Batal
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={isUploading}
          onClick={handleUpload}
          disabled={fileList.length === 0}
        >
          Upload
        </Button>,
      ]}
      width={600}
    >
      <div className="mb-4">
        <p className="text-gray-600 mb-4">
          Upload template LKPS dalam format Excel (.xls atau .xlsx)
        </p>

        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Klik atau drag file Excel ke area ini untuk upload
          </p>
          <p className="ant-upload-hint">
            Hanya mendukung file Excel (.xls, .xlsx) dengan ukuran maksimal 10MB
          </p>
        </Dragger>
      </div>
    </Modal>
  )
}

export default UploadTemplateLkpsModal
