import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Card,
  Tabs,
  Spin,
  Typography,
  Button,
  message,
  Space,
  Badge,
  Modal,
} from "antd"
import {
  ExclamationCircleOutlined,
  FileExcelOutlined,
  UploadOutlined,
  ToolOutlined,
} from "@ant-design/icons"

import registerPlugins from "../../plugins"

import { useUser } from "../../context/userContext"
import { useTable } from "../../hooks/useTable"
import { useTableConfig } from "../../hooks/useTableConfig"
import { useTableData } from "../../hooks/useTableData"
import { useTableOperations } from "../../hooks/useTableOperations"
import { useFileUpload } from "../../hooks/useFileUpload"
import { useSaveData } from "../../hooks/useSaveData"
import { useColumnsGenerator } from "../../hooks/useColumnsGenerator"

import TableHeader from "./TableHeader"
import TableComponent from "./TableComponent"
import ScoreDisplay from "./ScoreDisplay"
import TableFooter from "./TableFooter"
import TridharmaScoreDetails from "./TridharmaScoreDetails"
import DebugPanel from "./DebugPanel"
import ExportToExcel from "../../utils/ExportToExcel"
import ExcelTemplateUploader from "./ExcelTemplateUploader"

const { TabPane } = Tabs
const { Title, Paragraph, Text } = Typography
const { confirm } = Modal

const DynamicLkpsContainer = () => {
  const { tableCode } = useParams()
  const navigate = useNavigate()
  const { userData, isLoading: userLoading } = useUser()

  useEffect(() => {
    registerPlugins()
  }, [])

  const [debugMode, setDebugMode] = useState(false)
  const [activeTab, setActiveTab] = useState("template")
  const [dataFilter, setDataFilter] = useState("all")

  const {
    tableStructure,
    structureLoading,
    currentTable,
    savedTables,
    setSavedTables,
    prev,
    next,
    handlePrev,
    handleNext,
    handleTableChange,
  } = useTable(tableCode, navigate)

  const { config, setConfig, loading, error } = useTableConfig(
    tableCode,
    userData
  )

  const {
    tableData,
    setTableData,
    selectionData,
    setSelectionData,
    allExcelData,
    setAllExcelData,
    isUploaded,
    setIsUploaded,
    score,
    setScore,
    scoreDetail,
    setScoreDetail,
    lkpsId,
    setLkpsId,
    lkpsInfo,
    setLkpsInfo,
    showCreateModal,
    setShowCreateModal,
    editingKey,
    setEditingKey,
    showSelectionMode,
    setShowSelectionMode,
    configRef,
    prodiName,
    prodiId,
    fixAllExistingData,
    calculateScoreData,
    plugin,
  } = useTableData(tableCode, config, userData)

  const {
    handleToggleSelection,
    toggleSelectionMode,
    handleDataChange,
    debouncedHandleDataChange,
    handleAddRow,
  } = useTableOperations(
    tableCode,
    prodiName,
    configRef,
    tableData,
    setTableData,
    selectionData,
    setSelectionData,
    showSelectionMode,
    setShowSelectionMode,
    calculateScoreData,
    plugin,
    editingKey,
    setEditingKey
  )

  const { handleUpload } = useFileUpload(
    tableCode,
    prodiName,
    config,
    configRef,
    tableData,
    setTableData,
    setSelectionData,
    setIsUploaded,
    setShowSelectionMode,
    setAllExcelData,
    calculateScoreData,
    plugin
  )

  const {
    saving,
    handleSave: saveData,
    handleLkpsCreated,
  } = useSaveData(
    tableCode,
    userData,
    tableData,
    score,
    lkpsId,
    savedTables,
    setSavedTables,
    setScore,
    setScoreDetail,
    setShowCreateModal,
    plugin
  )

  const columnsGenerator = useColumnsGenerator(
    handleToggleSelection,
    debouncedHandleDataChange,
    editingKey,
    setEditingKey
  )

  useEffect(() => {
    console.log("Passing table structure to header:", tableStructure)
  }, [tableStructure])

  // Updated handleSave to bypass LKPS check
  const handleSave = () => {
    if (!config) return

    // Simply save the data without checking for LKPS ID
    setEditingKey(null)
    saveData(config)
  }

  const handleLkpsCreatedWrapper = (lkps) => {
    handleLkpsCreated(lkps, setLkpsId, setLkpsInfo)
  }

  const handleFilterChange = (e) => {
    setDataFilter(e.target.value)
  }

  if (loading || userLoading) {
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

  if (!userData) {
    return (
      <Card>
        <Title level={4} style={{ color: "#cf1322" }}>
          Access Denied
        </Title>
        <Paragraph>Please login to access this page.</Paragraph>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Title level={4} style={{ color: "#cf1322" }}>
          Error
        </Title>
        <Paragraph>{error}</Paragraph>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </Card>
    )
  }

  // Get the actual table code to use (might be the table code if they match)
  const getTableCode = (tableConfig) => {
    if (typeof tableConfig === "string") return tableConfig
    if (tableConfig && tableConfig.code) return tableConfig.code
    if (tableConfig && tableConfig.kode) return tableConfig.kode
    return tableCode // Fallback to table code
  }

  const ConfigDebugger = ({ config, tableCode }) => {
    if (!config) return null

    return (
      <Card
        style={{ marginBottom: 20, padding: 16, border: "1px dashed #f00" }}
      >
        <h3>Debug Information</h3>
        <p>Table Code: {tableCode}</p>
        <p>Config Title: {config.title}</p>
        <p>Tables Count: {config.tables?.length || 0}</p>

        {config.tables &&
          config.tables.map((table, index) => (
            <div key={index} style={{ marginTop: 10 }}>
              <h4>Table {index + 1}</h4>
              <p>Code: {getTableCode(table)}</p>
              <p>Title: {table.title || table.judul || "Unknown"}</p>
              <p>
                Columns:{" "}
                {table.columns?.length ||
                  0 ||
                  table.kolom?.length ||
                  0 ||
                  "Unknown"}
              </p>
              <button onClick={() => console.log("Table config:", table)}>
                Log Table Config
              </button>
            </div>
          ))}

        <button onClick={() => console.log("Full config:", config)}>
          Log Full Config
        </button>
      </Card>
    )
  }

  // In your DynamicLkpsContainer component, add this line before the main content
  {
    process.env.NODE_ENV === "development" && (
      <ConfigDebugger config={config} tableCode={tableCode} />
    )
  }

  return (
    <div className="lkps-page-container">
      <TableHeader
        tableCode={tableCode}
        currentTable={currentTable}
        savedTables={savedTables}
        tableStructure={tableStructure}
        onTableChange={handleTableChange}
        navigate={navigate}
      />

      <Card style={{ marginBottom: 16 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {userData?.role === "Admin" && (
            <TabPane
              tab={
                <span>
                  <UploadOutlined /> Manage Template
                </span>
              }
              key="template"
            >
              <Typography.Title level={5}>
                Manage LKPS Excel Template
              </Typography.Title>
              <ExcelTemplateUploader isAdmin={userData?.role === "Admin"} />
            </TabPane>
          )}
        </Tabs>
      </Card>

      <div className="lkps-table-container">
        <Card style={{ marginBottom: 16 }}>
          <Title level={3}>
            {(config && config.title) ||
              (currentTable && currentTable.title) ||
              ""}
          </Title>
          {((config && config.subtitle) ||
            (currentTable && currentTable.parentTitle)) && (
            <Title level={4} style={{ fontWeight: "normal" }}>
              {(config && config.subtitle) ||
                (currentTable && `Part of ${currentTable.parentTitle}`) ||
                ""}
            </Title>
          )}

          {lkpsInfo && (
            <Space direction="vertical" style={{ marginTop: 8 }}>
              <Badge
                status="processing"
                text={
                  <Text>
                    LKPS Period: {lkpsInfo.periode} - Academic Year:{" "}
                    {lkpsInfo.tahunAkademik}
                  </Text>
                }
              />
              <Text type="secondary">Status: {lkpsInfo.status}</Text>
              {userData && (
                <Text type="secondary">
                  Study Program: {userData.prodi || "Not available"}
                </Text>
              )}
            </Space>
          )}
        </Card>

        {score !== null && (
          <ScoreDisplay
            score={score}
            formula={config?.formula}
            scoreDetail={scoreDetail}
          />
        )}

        {scoreDetail && plugin?.getInfo().code.startsWith("1-") && (
          <TridharmaScoreDetails
            tableCode={tableCode}
            scoreDetail={scoreDetail}
            userData={userData}
            setScore={setScore}
            setScoreDetail={setScoreDetail}
          />
        )}

        {config && config.tables && config.tables.length > 1 ? (
          <Tabs
            defaultActiveKey={
              Array.isArray(config.tables) && config.tables.length > 0
                ? getTableCode(config.tables[0])
                : ""
            }
            type="card"
          >
            {config.tables.map((tableConfig, index) => {
              const tableCode = getTableCode(tableConfig)
              const tableTitle =
                typeof tableConfig === "string"
                  ? tableCode
                  : tableConfig.title || tableConfig.judul || tableCode

              return (
                <TabPane
                  tab={
                    <span>
                      {tableTitle}
                      {isUploaded[tableCode] && (
                        <Badge
                          count={
                            <svg
                              viewBox="64 64 896 896"
                              width="1em"
                              height="1em"
                              fill="#52c41a"
                            >
                              <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z" />
                            </svg>
                          }
                          offset={[5, -3]}
                        />
                      )}
                    </span>
                  }
                  key={tableCode}
                >
                  <TableComponent
                    tableConfig={tableConfig}
                    tableData={tableData[tableCode] || []}
                    selectionData={selectionData[tableCode] || []}
                    showSelectionMode={showSelectionMode[tableCode]}
                    toggleSelectionMode={() => toggleSelectionMode(tableCode)}
                    generateColumns={columnsGenerator}
                    handleUpload={(info) => handleUpload(info, tableCode)}
                    handleAddRow={() => handleAddRow(tableCode)}
                    isUploaded={isUploaded[tableCode]}
                    tableCode={tableCode}
                    editingKey={editingKey}
                    setEditingKey={setEditingKey}
                    debouncedHandleDataChange={debouncedHandleDataChange}
                    handleToggleSelection={handleToggleSelection}
                  />
                </TabPane>
              )
            })}
          </Tabs>
        ) : (
          config?.tables &&
          config.tables.length > 0 && (
            <TableComponent
              tableConfig={
                typeof config.tables[0] === "string"
                  ? { code: config.tables[0] }
                  : config.tables[0]
              }
              tableData={tableData[getTableCode(config.tables[0])] || []}
              selectionData={
                selectionData[getTableCode(config.tables[0])] || []
              }
              showSelectionMode={
                showSelectionMode[getTableCode(config.tables[0])]
              }
              toggleSelectionMode={() =>
                toggleSelectionMode(getTableCode(config.tables[0]))
              }
              generateColumns={columnsGenerator}
              handleUpload={(info) =>
                handleUpload(info, getTableCode(config.tables[0]))
              }
              handleAddRow={() => handleAddRow(getTableCode(config.tables[0]))}
              isUploaded={isUploaded[getTableCode(config.tables[0])]}
              tableCode={tableCode}
              editingKey={editingKey}
              setEditingKey={setEditingKey}
              debouncedHandleDataChange={debouncedHandleDataChange}
              handleToggleSelection={handleToggleSelection}
            />
          )
        )}

        <div
          className="table-footer"
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            {!!prev && (
              <Button onClick={handlePrev} style={{ marginRight: "10px" }}>
                Previous
              </Button>
            )}
            {!!next && <Button onClick={handleNext}>Next</Button>}
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ marginRight: "10px" }}>
              <ExportToExcel userData={userData} tableCode={tableCode} />
            </div>
            <Button type="primary" onClick={handleSave} loading={saving}>
              Save Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DynamicLkpsContainer
