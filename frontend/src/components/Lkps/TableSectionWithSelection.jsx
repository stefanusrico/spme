import React, { useEffect } from "react"
import {
  Card,
  Space,
  Button,
  Upload,
  Table,
  Typography,
  Badge,
  Tooltip,
  Alert,
} from "antd"
import {
  UploadOutlined,
  PlusOutlined,
  FilterOutlined,
  FileExcelOutlined,
} from "@ant-design/icons"
import { isSelectionAllowedForTable } from "../../constants/tableStructure"

const { Text, Title, Paragraph } = Typography

// Table component with selection - Updated for MongoDB
const TableSectionWithSelection = ({
  tableConfig,
  tableData,
  selectionData,
  showSelectionMode,
  toggleSelectionMode,
  generateColumns,
  handleUpload,
  handleAddRow,
  isUploaded,
  sectionCode,
  editingKey,
  setEditingKey,
  debouncedHandleDataChange,
  handleToggleSelection,
}) => {
  const getTableCode = () => {
    if (typeof tableConfig === "string") return tableConfig
    if (tableConfig && tableConfig.code) return tableConfig.code
    if (tableConfig && tableConfig.kode) return tableConfig.kode
    return sectionCode // Default to section code
  }

  const tableCode = getTableCode()

  // Debug logs
  useEffect(() => {
    console.log("TableSectionWithSelection - tableConfig:", tableConfig)
    console.log("TableSectionWithSelection - extracted tableCode:", tableCode)

    if (sectionCode.startsWith("1-")) {
      console.log(`Rendering section ${sectionCode} table:`, {
        tableData: tableData?.length || 0,
        selectionData: selectionData?.length || 0,
        showSelectionMode,
        sectionCode,
        tableCode,
      })
    }
  }, [
    tableConfig,
    tableData,
    selectionData,
    showSelectionMode,
    sectionCode,
    tableCode,
  ])

  const hasData = tableData && tableData.length > 0
  const hasSelectionData = selectionData && selectionData.length > 0

  useEffect(() => {
    console.log(`Section ${sectionCode} selection data:`, {
      hasSelectionData,
      selectionDataLength: selectionData?.length || 0,
      showSelectionMode,
      isSelectionAllowed: isSelectionAllowedForTable(sectionCode),
    })
  }, [selectionData, showSelectionMode, sectionCode])

  if (!tableCode) {
    return (
      <Card>
        <Typography.Title level={4}>Configuration Error</Typography.Title>
        <Typography.Paragraph>
          Table configuration is invalid or missing. Please check the console
          for details.
        </Typography.Paragraph>
        <pre>{JSON.stringify(tableConfig, null, 2)}</pre>
      </Card>
    )
  }

  // Function to process data before displaying
  const processDataForDisplay = (data) => {
    if (!data || !Array.isArray(data)) return []

    return data.map((item) => {
      // Handle MongoDB ObjectId if present
      const processedItem = { ...item }
      if (item._id && typeof item._id === "object" && item._id.$oid) {
        processedItem._id = item._id.$oid
      }

      // Ensure each item has a key for React
      if (!processedItem.key) {
        processedItem.key =
          processedItem._id ||
          `row-${Math.random().toString(36).substring(2, 15)}`
      }

      return processedItem
    })
  }

  try {
    // Generate columns with MongoDB compatibility
    const mainTableColumns = generateColumns(
      tableConfig,
      false,
      handleToggleSelection,
      debouncedHandleDataChange,
      editingKey,
      setEditingKey
    )

    const selectionTableColumns = generateColumns(
      tableConfig,
      true,
      handleToggleSelection,
      debouncedHandleDataChange,
      editingKey,
      setEditingKey
    )

    const processedTableData = processDataForDisplay(tableData)
    const processedSelectionData = processDataForDisplay(selectionData)

    return (
      <div>
        <Card style={{ marginBottom: 16 }}>
          <div
            className="table-actions"
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Space>
              <Upload
                beforeUpload={() => false}
                onChange={(info) => handleUpload(info, tableCode)}
                showUploadList={false}
                accept=".xlsx,.xls"
              >
                <Button
                  icon={<UploadOutlined />}
                  type={isUploaded ? "default" : "primary"}
                >
                  {isUploaded ? "Upload Ulang Excel" : "Upload Excel"}
                </Button>
              </Upload>

              <Button
                icon={<PlusOutlined />}
                onClick={() => handleAddRow(tableCode)}
              >
                Tambah Baris
              </Button>

              {/* PENTING: Pastikan kondisi ini benar untuk menampilkan tombol seleksi */}
              {(hasSelectionData || isUploaded) &&
                isSelectionAllowedForTable(sectionCode) && (
                  <Button
                    icon={<FilterOutlined />}
                    type={showSelectionMode ? "primary" : "default"}
                    onClick={() => toggleSelectionMode(tableCode)}
                  >
                    {showSelectionMode
                      ? "Sembunyikan Data Seleksi"
                      : "Pilih Data Dari Excel"}
                  </Button>
                )}

              {/* Tambahkan tombol untuk select all / unselect all */}
              {showSelectionMode && hasSelectionData && (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      // Select all items in selection data
                      selectionData.forEach((item) => {
                        if (!item.selected) {
                          handleToggleSelection(item.key || item._id, true)
                        }
                      })
                    }}
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      // Unselect all items
                      selectionData.forEach((item) => {
                        if (item.selected) {
                          handleToggleSelection(item.key || item._id, false)
                        }
                      })
                    }}
                  >
                    Batal Pilih Semua
                  </Button>
                </Space>
              )}
            </Space>

            <Space>
              {hasData && (
                <Badge
                  count={processedTableData.length}
                  overflowCount={9999}
                  style={{ backgroundColor: "#52c41a" }}
                >
                  <Text>Total Baris Data</Text>
                </Badge>
              )}

              {/* Tampilkan jumlah data yang dipilih */}
              {hasData && (
                <Badge
                  count={
                    processedTableData.filter((item) => item.selected).length
                  }
                  overflowCount={9999}
                  style={{ backgroundColor: "#1890ff" }}
                >
                  <Text>Data Terpilih</Text>
                </Badge>
              )}
            </Space>
          </div>

          {/* Main data table */}
          <Table
            columns={mainTableColumns}
            dataSource={processedTableData}
            pagination={{ pageSize: 10, position: ["bottomCenter"] }}
            bordered
            size="middle"
            scroll={{ x: "max-content" }}
            locale={{
              emptyText: (
                <div style={{ padding: "20px 0" }}>
                  <Title level={5}>Belum Ada Data</Title>
                  <Paragraph>
                    Upload file Excel atau tambahkan baris manual
                  </Paragraph>
                </div>
              ),
            }}
            onRow={(record) => ({
              onClick: (e) => {
                if (e.target.type !== "checkbox") {
                  setEditingKey(record.key)
                }
              },
              style: {
                background: record.key === editingKey ? "#f0f7ff" : undefined,
              },
            })}
            rowKey={(record) => record.key || record._id || record.id}
          />
        </Card>

        {/* Selection table - tampilkan jika mode seleksi aktif */}
        {showSelectionMode &&
          hasSelectionData &&
          isSelectionAllowedForTable(sectionCode) && (
            <Card
              title="Data Tersedia untuk Dipilih"
              style={{ marginBottom: 16 }}
            >
              <Paragraph>
                Pilih data kerjasama yang ingin disertakan dalam laporan program
                studi Anda. Data yang dipilih akan digunakan untuk perhitungan
                score section {sectionCode}.
              </Paragraph>

              {/* Filter untuk section tertentu jika data mengandung multiple section */}
              {sectionCode && (
                <Alert
                  message={`Menampilkan data untuk section ${sectionCode}`}
                  description={
                    sectionCode === "1-1"
                      ? "Kerjasama Pendidikan"
                      : sectionCode === "1-2"
                      ? "Kerjasama Penelitian"
                      : sectionCode === "1-3"
                      ? "Kerjasama Pengabdian kepada Masyarakat"
                      : ""
                  }
                  type="info"
                  style={{ marginBottom: 16 }}
                />
              )}

              <Table
                columns={selectionTableColumns}
                dataSource={processedSelectionData.map((item, index) => ({
                  ...item,
                  rowIndex: index + 1,
                }))}
                pagination={{ pageSize: 10, position: ["bottomCenter"] }}
                bordered
                size="middle"
                scroll={{ x: "max-content" }}
                locale={{
                  emptyText: (
                    <div style={{ padding: "20px 0" }}>
                      <Title level={5}>Tidak Ada Data untuk Dipilih</Title>
                      <Paragraph>
                        Upload file Excel untuk melihat data yang dapat dipilih
                      </Paragraph>
                    </div>
                  ),
                }}
                onRow={(record) => ({
                  onClick: (e) => {
                    if (e.target.type !== "checkbox") {
                      setEditingKey(record.key)
                    }
                  },
                  style: {
                    background:
                      record.key === editingKey ? "#f0f7ff" : undefined,
                  },
                })}
                rowKey={(record) => record.key || record._id || record.id}
              />
            </Card>
          )}
      </div>
    )
  } catch (error) {
    console.error("Error rendering TableSectionWithSelection:", error)
    return (
      <Card>
        <Typography.Title level={4}>Rendering Error</Typography.Title>
        <Typography.Paragraph>
          An error occurred while rendering the table. Please check the console
          for details.
        </Typography.Paragraph>
        <Typography.Paragraph type="danger">
          {error.message}
        </Typography.Paragraph>
      </Card>
    )
  }
}

export default TableSectionWithSelection
