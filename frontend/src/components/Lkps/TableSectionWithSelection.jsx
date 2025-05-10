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

// Table component with selection - Simplified version
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
  // Add logging for debugging
  useEffect(() => {
    if (sectionCode.startsWith("2a")) {
      console.log(`Rendering student table with section ${sectionCode}:`, {
        tableData: tableData?.length || 0,
        selectionData: selectionData?.length || 0,
        showSelectionMode,
        sectionCode,
      })
    }
  }, [tableData, selectionData, showSelectionMode, sectionCode])

  const hiddenAddRowCodes = [
    "2a1", "2a2", "2a3", "2a4",
    "3b2", "3b3", "3b4", "3b5", "3c",
    "4a", "5d", "9a", "9b",
    "8a", "8d1", "8d2", "8e1", "8e2", "8f1", "8f2",
  ]

  const hasData = tableData && tableData.length > 0
  const hasSelectionData = selectionData && selectionData.length > 0

  const tableCode =
    typeof tableConfig === "string" ? tableConfig : tableConfig?.code

  if (!tableCode) {
    return (
      <Card>
        <Typography.Title level={4}>Configuration Error</Typography.Title>
        <Typography.Paragraph>
          Table configuration is invalid or missing. Please check the console
          for details.
        </Typography.Paragraph>
      </Card>
    )
  }

  // Generate columns with full parameters
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

            {!hiddenAddRowCodes.includes(tableConfig.section_code) && (
              <Button
                icon={<PlusOutlined />}
                onClick={() => handleAddRow(tableCode)}
              >
                Tambah Baris
              </Button>
            )}

            {hasSelectionData && isSelectionAllowedForSection(sectionCode) && (
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
                count={tableData.length}
                overflowCount={9999}
                style={{ backgroundColor: "#52c41a" }}
              >
                <Text>Total Baris Data</Text>
              </Badge>
            )}

            {(tableConfig.excel_start_row !== undefined ||
              (typeof tableConfig === "object" &&
                tableConfig?.excel_start_row !== undefined)) && (
              <Tooltip title="Baris awal untuk membaca data dari Excel">
                <Text type="secondary">
                  <FileExcelOutlined /> Baris Excel:{" "}
                  {typeof tableConfig === "object"
                    ? tableConfig.excel_start_row
                    : 0}
                </Text>
              </Tooltip>
            )}
          </Space>
        </div>

        {/* Main data table */}
        <Table
          columns={mainTableColumns}
          dataSource={tableData}
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
          rowKey={(record) => record.key || record.id}
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
              Pilih data yang ingin disertakan dalam laporan program studi Anda.
            </Paragraph>
            <Table
              columns={selectionTableColumns}
              dataSource={selectionData.map((item, index) => ({
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
                  background: record.key === editingKey ? "#f0f7ff" : undefined,
                },
              })}
              rowKey={(record) => record.key || record.id}
            />
          </Card>
        )}
    </div>
  )
}

export default TableSectionWithSelection
