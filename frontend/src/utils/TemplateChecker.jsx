import React, { useState, useEffect } from "react"
import { Alert, Button, Spin, Space, Typography } from "antd"
import axiosInstance from "./axiosConfig"

const { Text } = Typography

/**
 * Component to check if LKPS template exists before attempting download
 */
const TemplateChecker = ({ onValidTemplate, onTemplateMissing }) => {
  const [checking, setChecking] = useState(true)
  const [templateExists, setTemplateExists] = useState(false)
  const [templateInfo, setTemplateInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkTemplate()
  }, [])

  const checkTemplate = async () => {
    try {
      setChecking(true)
      setError(null)

      console.log("Checking template availability...")
      const response = await axiosInstance.get("/templates/info")
      console.log("Template check response:", response.data)

      setTemplateInfo(response.data)

      if (response.data && response.data.exists) {
        setTemplateExists(true)
        if (onValidTemplate) onValidTemplate(response.data)
      } else {
        setTemplateExists(false)
        if (onTemplateMissing) onTemplateMissing()
      }
    } catch (err) {
      console.error("Error checking template:", err)
      setError(err.message || "Failed to check template availability")
      setTemplateExists(false)
    } finally {
      setChecking(false)
    }
  }

  if (checking) {
    return (
      <Space>
        <Spin size="small" />
        <Text>Memeriksa ketersediaan template...</Text>
      </Space>
    )
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={`Gagal memeriksa template: ${error}`}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={checkTemplate}>
            Coba Lagi
          </Button>
        }
      />
    )
  }

  if (!templateExists) {
    return (
      <Alert
        message="Template Tidak Tersedia"
        description="Template LKPS belum diunggah. Silakan hubungi administrator untuk mengunggah template."
        type="warning"
        showIcon
      />
    )
  }

  return (
    <Alert
      message="Template Siap"
      description={
        <>
          <Text>Template LKPS tersedia dan siap digunakan.</Text>
          {templateInfo && (
            <>
              <br />
              <Text>Terakhir diperbarui: {templateInfo.lastUpdated}</Text>
              <br />
              <Text>Ukuran file: {templateInfo.fileSize}</Text>
            </>
          )}
        </>
      }
      type="success"
      showIcon
    />
  )
}

export default TemplateChecker
