import React, { useState, useEffect } from "react"
import {
  Button,
  message,
  Progress,
  Modal,
  Spin,
  Checkbox,
  Space,
  Card,
  Typography,
  Alert,
  Radio,
} from "antd"
import { DownloadOutlined, FileExcelOutlined } from "@ant-design/icons"
import axiosInstance from "./axiosConfig"
import { fetchSectionStructure } from "../constants/sectionStructure" // Import the fetch function

const { Title, Text, Paragraph } = Typography

/**
 * Component untuk mengekspor data LKPS ke Excel
 */
const ExportToExcel = ({ userData, sectionCode }) => {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedSections, setSelectedSections] = useState([])
  const [selectAll, setSelectAll] = useState(true)
  const [exportMode, setExportMode] = useState("withData")
  const [sectionsData, setSectionsData] = useState([])
  const [fetchingData, setFetchingData] = useState(true)

  // Fetch sections from API or use provided sectionStructure
  useEffect(() => {
    const loadSections = async () => {
      try {
        setFetchingData(true)

        // Fetch sections from API
        const structure = await fetchSectionStructure()

        // Transform the structure into a flat list for the checkboxes
        const flattenedSections = []

        structure.forEach((mainSection) => {
          if (mainSection.subSections && mainSection.subSections.length > 0) {
            mainSection.subSections.forEach((subSection) => {
              flattenedSections.push({
                code: subSection.code,
                name: subSection.title,
              })
            })
          }
        })

        setSectionsData(flattenedSections)

        // Initialize selected sections with all available sections
        setSelectedSections(flattenedSections.map((section) => section.code))
      } catch (error) {
        console.error("Failed to load sections:", error)
        message.error("Failed to load sections. Please try again.")
      } finally {
        setFetchingData(false)
      }
    }

    loadSections()
  }, [])

  // Handle showing export dialog
  const showExportDialog = () => {
    setModalVisible(true)
  }

  // Handle closing modal
  const handleCancel = () => {
    setModalVisible(false)
  }

  // Handle section selection changes
  const handleSectionChange = (checkedValues) => {
    setSelectedSections(checkedValues)
    setSelectAll(checkedValues.length === sectionsData.length)
  }

  // Handle select all checkbox
  const handleSelectAllChange = (e) => {
    const checked = e.target.checked
    setSelectAll(checked)
    setSelectedSections(
      checked ? sectionsData.map((section) => section.code) : []
    )
  }

  // Handle export mode change
  const handleExportModeChange = (e) => {
    setExportMode(e.target.value)
  }

  // Fungsi untuk menampilkan progress download simulasi
  const simulateProgress = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 200)
    return () => clearInterval(interval)
  }

  // Download template kosong
  const downloadEmptyTemplate = async () => {
    try {
      setLoading(true)

      message.loading({
        content: "Mendownload template kosong...",
        key: "template-download",
        duration: 0,
      })

      // Redirect langsung untuk download template
      window.open(
        "http://localhost:8000/api/templates/LKPS_template.xlsx",
        "_blank"
      )

      setTimeout(() => {
        setLoading(false)
        message.success({
          content: "Template kosong berhasil didownload!",
          key: "template-download",
        })
      }, 2000)
    } catch (error) {
      console.error("Download error:", error)
      setLoading(false)
      message.error({
        content: "Download gagal: " + error.message,
        key: "template-download",
      })
    }
  }

  // Ekspor data ke Excel
  const exportDataToExcel = async () => {
    try {
      setLoading(true)
      setModalVisible(false)

      // Start progress simulation
      const clearProgressSimulation = simulateProgress()

      message.loading({
        content: "Sedang mengekspor data ke Excel...",
        key: "data-export",
        duration: 0,
      })

      console.log("Memulai ekspor data dengan section:", selectedSections)

      // Siapkan data untuk dikirim ke API
      const exportData = {
        prodiId: userData?.prodi.id,
        sections: selectedSections,
      }

      // Gunakan axiosInstance untuk mengekspor data
      // Dengan responseType blob untuk menerima file
      const response = await axiosInstance.post(
        "/lkps/export-data",
        exportData,
        {
          responseType: "blob",
        }
      )

      // Buat URL dan download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "LKPS_Data_Export.xlsx")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup
      clearProgressSimulation()
      setProgress(100)

      setTimeout(() => {
        setLoading(false)
        setProgress(0)
        message.success({
          content: "Data berhasil diekspor ke Excel!",
          key: "data-export",
        })
      }, 1000)
    } catch (error) {
      console.error("Export error:", error)
      setLoading(false)

      let errorMessage = "Gagal mengekspor data"
      if (error.response) {
        // Coba baca error response jika dalam format blob
        try {
          const reader = new FileReader()
          reader.onload = () => {
            const errorData = JSON.parse(reader.result)
            errorMessage = errorData.message || errorMessage
            message.error({
              content: errorMessage,
              key: "data-export",
            })
          }
          reader.readAsText(error.response.data)
        } catch (e) {
          // Fallback jika tidak bisa parse error
          errorMessage += `: ${error.response.status}`
          message.error({
            content: errorMessage,
            key: "data-export",
          })
        }
      } else {
        message.error({
          content: errorMessage + ": " + error.message,
          key: "data-export",
        })
      }
    }
  }

  // Main export function
  const handleExport = () => {
    if (exportMode === "emptyTemplate") {
      downloadEmptyTemplate()
    } else {
      exportDataToExcel()
    }
  }

  return (
    <>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={showExportDialog}
        style={{ marginBottom: 16 }}
        loading={loading}
      >
        Export to Excel
      </Button>

      {/* {loading && progress > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Progress
            percent={Math.round(progress)}
            status={progress < 100 ? "active" : "success"}
            format={(percent) => `${percent}%`}
          />
          <Text>
            {progress < 100
              ? "Sedang mengekspor data ke Excel..."
              : "Ekspor selesai!"}
          </Text>
        </Card>
      )} */}

      <Modal
        title="Export LKPS Data to Excel"
        visible={modalVisible}
        onOk={handleExport}
        onCancel={handleCancel}
        okText="Export"
        width={700}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Card>
            <Paragraph>Pilih jenis ekspor yang diinginkan:</Paragraph>
            <Radio.Group
              onChange={handleExportModeChange}
              value={exportMode}
              style={{ marginBottom: 16 }}
            >
              <Space direction="vertical">
                <Radio value="withData">
                  <Text strong>Ekspor dengan Data</Text> - Mengekspor template
                  Excel yang sudah terisi dengan data LKPS
                </Radio>
                <Radio value="emptyTemplate">
                  <Text strong>Template Kosong</Text> - Download template Excel
                  kosong untuk diisi secara manual
                </Radio>
              </Space>
            </Radio.Group>
          </Card>

          {exportMode === "withData" && (
            <>
              <Card>
                <Checkbox checked={selectAll} onChange={handleSelectAllChange}>
                  Select All Sections
                </Checkbox>
              </Card>

              <Card
                title="Select Sections to Export"
                style={{ maxHeight: "300px", overflow: "auto" }}
              >
                {fetchingData ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <Spin tip="Loading sections..." />
                  </div>
                ) : (
                  <Checkbox.Group
                    value={selectedSections}
                    onChange={handleSectionChange}
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    {sectionsData.map((section) => (
                      <div key={section.code} style={{ marginBottom: 8 }}>
                        <Checkbox value={section.code}>
                          {section.code} - {section.name}
                        </Checkbox>
                      </div>
                    ))}
                  </Checkbox.Group>
                )}
              </Card>

              <Alert
                message="Catatan Ekspor Data"
                description="Pastikan data yang akan diekspor sudah tersimpan di sistem. Proses ekspor akan mengambil data terbaru dari database."
                type="info"
                showIcon
              />
            </>
          )}

          {exportMode === "emptyTemplate" && (
            <Alert
              message="Template Kosong"
              description="Template Excel kosong akan didownload. Anda dapat mengisi data secara manual dan kemudian menguploadnya kembali ke sistem."
              type="info"
              showIcon
            />
          )}
        </Space>
      </Modal>
    </>
  )
}

export default ExportToExcel
