import React, { useState, useEffect } from "react"
import { Upload, Button, message, Space, Alert, Modal, Typography } from "antd"
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons"
import axiosInstance from "../../utils/axiosConfig"

const { Text } = Typography

const ExcelTemplateUploader = ({ isAdmin }) => {
  const [loading, setLoading] = useState(false)
  const [templateInfo, setTemplateInfo] = useState(null)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [fileToUpload, setFileToUpload] = useState(null)

  // Fetch template info when component mounts
  useEffect(() => {
    fetchTemplateInfo()
  }, [])

  // Fetch current template information
  const fetchTemplateInfo = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get("templates/info")
      setTemplateInfo(response.data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching template info:", error)
      setLoading(false)
    }
  }

  // Handle file before upload
  const beforeUpload = (file) => {
    const isExcel =
      file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if (!isExcel) {
      message.error("You can only upload XLSX files!")
      return false
    }

    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error("File must be smaller than 10MB!")
      return false
    }

    // Store the file but don't immediately upload
    setFileToUpload(file)
    setConfirmModalVisible(true)
    return false // Prevent automatic upload
  }

  // Handle template upload
  const handleUpload = async () => {
    if (!fileToUpload) {
      message.error("No file selected")
      return
    }

    setConfirmModalVisible(false)
    setLoading(true)
    message.loading({
      content: "Uploading template...",
      key: "template-upload",
      duration: 0,
    })

    const formData = new FormData()
    formData.append("template", fileToUpload)

    try {
      const response = await axiosInstance.post("templates/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      message.success({
        content: "Template uploaded successfully!",
        key: "template-upload",
      })

      setFileToUpload(null)
      fetchTemplateInfo() // Refresh template info
    } catch (error) {
      console.error("Error uploading template:", error)
      message.error({
        content:
          "Failed to upload template: " +
          (error.response?.data?.error || "Unknown error"),
        key: "template-upload",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle template download
  const handleDownload = () => {
    console.log("Download button clicked")
    window.open(
      "http://localhost:8000/api/templates/LKPS_template.xlsx",
      "_blank"
    )
  }

  // If not admin, show restricted message
  if (!isAdmin) {
    return (
      <Alert
        message="Restricted Access"
        description="You do not have permission to manage LKPS Excel templates."
        type="warning"
        showIcon
      />
    )
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {templateInfo && templateInfo.exists && (
        <Alert
          message="Current Template Info"
          description={
            <>
              <Text>Last updated: {templateInfo.lastUpdated}</Text>
              <br />
              <Text>File size: {templateInfo.fileSize}</Text>
            </>
          }
          type="info"
          showIcon
        />
      )}

      <Space>
        <Upload
          beforeUpload={beforeUpload}
          showUploadList={false}
          disabled={loading}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={loading}>
            Upload New Template
          </Button>
        </Upload>

        {templateInfo && templateInfo.exists && (
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            Download Current Template
          </Button>
        )}
      </Space>

      {!templateInfo?.exists && (
        <Alert
          message="No Template Available"
          description="Please upload an Excel template to enable export functionality."
          type="warning"
          showIcon
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        title="Upload Confirmation"
        visible={confirmModalVisible}
        onOk={handleUpload}
        onCancel={() => {
          setConfirmModalVisible(false)
          setFileToUpload(null)
        }}
        okText="Upload"
        cancelText="Cancel"
      >
        <p>
          Are you sure you want to upload this template? This will replace the
          current template used for all exports.
        </p>
        {fileToUpload && (
          <Alert
            message={`Selected file: ${fileToUpload.name}`}
            description={`Size: ${(fileToUpload.size / 1024 / 1024).toFixed(
              2
            )} MB`}
            type="info"
            showIcon
          />
        )}
      </Modal>
    </Space>
  )
}

export default ExcelTemplateUploader
