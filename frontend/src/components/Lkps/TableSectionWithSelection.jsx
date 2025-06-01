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
import { isSelectionAllowedForSection } from "../../constants/sectionStructure"

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
  // Get table code correctly for MongoDB model structure
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

              {hasSelectionData &&
                isSelectionAllowedForSection(sectionCode) && (
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

              {(tableConfig.barisAwalExcel !== undefined ||
                (typeof tableConfig === "object" &&
                  tableConfig?.barisAwalExcel !== undefined)) && (
                <Tooltip title="Baris awal untuk membaca data dari Excel">
                  <Text type="secondary">
                    <FileExcelOutlined /> Baris Excel:{" "}
                    {typeof tableConfig === "object"
                      ? tableConfig.barisAwalExcel
                      : 0}
                  </Text>
                </Tooltip>
              )}
            </Space>
          </div>

          {/* Main data table */}
          <Table
            columns={mainTableColumns}
            dataSource={processedTableData}
            pagination={
              typeof tableConfig === "object" && tableConfig.pagination
                ? tableConfig.pagination
                : { pageSize: 10, position: ["bottomCenter"] }
            }
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
                // If not a checkbox click, set editing key
                if (e.target.type !== "checkbox") {
                  setEditingKey(record.key)
                }
              },
              // Highlight row being edited
              style: {
                background: record.key === editingKey ? "#f0f7ff" : undefined,
              },
            })}
            rowKey={(record) => record.key || record._id || record.id}
          />
        </Card>

        {showSelectionMode &&
          hasSelectionData &&
          isSelectionAllowedForSection(sectionCode) && (
            <Card
              title="Data Tersedia untuk Dipilih"
              style={{ marginBottom: 16 }}
            >
              <Paragraph>
                Pilih data yang ingin disertakan dalam laporan program studi
                Anda.
              </Paragraph>
              <Table
                columns={selectionTableColumns}
                dataSource={processedSelectionData.map((item, index) => ({
                  ...item,
                  rowIndex: index + 1,
                }))}
                pagination={
                  typeof tableConfig === "object" && tableConfig.pagination
                    ? tableConfig.pagination
                    : { pageSize: 10, position: ["bottomCenter"] }
                }
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
                    // If not a checkbox click, set editing key
                    if (e.target.type !== "checkbox") {
                      setEditingKey(record.key)
                    }
                  },
                  // Highlight row being edited
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
