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
import { useSection } from "../../hooks/useSection"
import { useSectionConfig } from "../../hooks/useSectionConfig"
import { useSectionData } from "../../hooks/useSectionData"
import { useTableOperations } from "../../hooks/useTableOperations"
import { useFileUpload } from "../../hooks/useFileUpload"
import { useSaveData } from "../../hooks/useSaveData"
import { useColumnsGenerator } from "../../hooks/useColumnsGenerator"

import SectionHeader from "./SectionHeader"
import TableSectionWithSelection from "./TableSectionWithSelection"
import ScoreDisplay from "./ScoreDisplay"
import CreateLkpsModal from "./CreateLkpsModal"
import SectionFooter from "./SectionFooter"
import TridharmaScoreDetails from "./TridharmaScoreDetails"
import DebugPanel from "./DebugPanel"
import ExportToExcel from "../../utils/ExportToExcel"
import ExcelTemplateUploader from "./ExcelTemplateUploader"

const { TabPane } = Tabs
const { Title, Paragraph, Text } = Typography
const { confirm } = Modal

const DynamicLkpsContainer = () => {
  const { sectionCode } = useParams()
  const navigate = useNavigate()
  const { userData, isLoading: userLoading } = useUser()

  useEffect(() => {
    registerPlugins()
  }, [])

  const [debugMode, setDebugMode] = useState(false)
  const [activeTab, setActiveTab] = useState("template")
  const [dataFilter, setDataFilter] = useState("all")

  const {
    sectionStructure,
    structureLoading,
    currentSection,
    savedSections,
    setSavedSections,
    prev,
    next,
    handlePrev,
    handleNext,
    handleSectionChange,
  } = useSection(sectionCode, navigate)

  const { config, setConfig, loading, error, fetchFormulaForSection } =
    useSectionConfig(sectionCode, userData)

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
  } = useSectionData(sectionCode, config, userData)

  const {
    handleToggleSelection,
    toggleSelectionMode,
    handleDataChange,
    debouncedHandleDataChange,
    handleAddRow,
  } = useTableOperations(
    sectionCode,
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
    sectionCode,
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
    sectionCode,
    userData,
    tableData,
    score,
    lkpsId,
    savedSections,
    setSavedSections,
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

  const handleSave = () => {
    if (!config) return

    if (!lkpsId) {
      confirm({
        title: "LKPS not created yet",
        icon: React.createElement(ExclamationCircleOutlined),
        content:
          "LKPS for this study program hasn't been created. Create a new LKPS?",
        onOk() {
          setShowCreateModal(true)
        },
      })
      return
    }

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

  return (
    <div className="lkps-page-container">
      <SectionHeader
        sectionCode={sectionCode}
        currentSection={currentSection}
        savedSections={savedSections}
        sectionStructure={sectionStructure}
        onSectionChange={handleSectionChange}
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

      {/* {process.env.NODE_ENV === "development" && (
        <DebugPanel
          sectionCode={sectionCode}
          config={config}
          score={score}
          setScore={setScore}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
          calculateScoreData={calculateScoreData}
          tableData={tableData}
          fetchFormulaForSection={fetchFormulaForSection}
          setConfig={setConfig}
          fixAllExistingData={fixAllExistingData}
          plugin={plugin}
        />
      )} */}

      <div className="lkps-section-container">
        <Card style={{ marginBottom: 16 }}>
          <Title level={3}>
            {(config && config.title) ||
              (currentSection && currentSection.title) ||
              ""}
          </Title>
          {((config && config.subtitle) ||
            (currentSection && currentSection.parentTitle)) && (
            <Title level={4} style={{ fontWeight: "normal" }}>
              {(config && config.subtitle) ||
                (currentSection && `Part of ${currentSection.parentTitle}`) ||
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
                  Study Program: {userData.prodiId || "Not available"}
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
            sectionCode={sectionCode}
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
                ? typeof config.tables[0] === "string"
                  ? config.tables[0]
                  : config.tables[0].code
                : ""
            }
            type="card"
          >
            {config.tables.map((tableConfig, index) => {
              const tableCode =
                typeof tableConfig === "string" ? tableConfig : tableConfig.code
              const tableTitle =
                typeof tableConfig === "string"
                  ? tableCode
                  : tableConfig.title || tableCode

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
                  <TableSectionWithSelection
                    tableConfig={tableConfig}
                    tableData={tableData[tableCode] || []}
                    selectionData={selectionData[tableCode] || []}
                    showSelectionMode={showSelectionMode[tableCode]}
                    toggleSelectionMode={() => toggleSelectionMode(tableCode)}
                    generateColumns={columnsGenerator}
                    handleUpload={(info) => handleUpload(info, tableCode)}
                    handleAddRow={() => handleAddRow(tableCode)}
                    isUploaded={isUploaded[tableCode]}
                    sectionCode={sectionCode}
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
            <TableSectionWithSelection
              tableConfig={
                typeof config.tables[0] === "string"
                  ? { code: config.tables[0] }
                  : config.tables[0]
              }
              tableData={
                tableData[
                  typeof config.tables[0] === "string"
                    ? config.tables[0]
                    : config.tables[0]?.code
                ] || []
              }
              selectionData={
                selectionData[
                  typeof config.tables[0] === "string"
                    ? config.tables[0]
                    : config.tables[0]?.code
                ] || []
              }
              showSelectionMode={
                showSelectionMode[
                  typeof config.tables[0] === "string"
                    ? config.tables[0]
                    : config.tables[0]?.code
                ]
              }
              toggleSelectionMode={() =>
                toggleSelectionMode(
                  typeof config.tables[0] === "string"
                    ? config.tables[0]
                    : config.tables[0]?.code
                )
              }
              generateColumns={columnsGenerator}
              handleUpload={(info) =>
                handleUpload(
                  info,
                  typeof config.tables[0] === "string"
                    ? config.tables[0]
                    : config.tables[0]?.code
                )
              }
              handleAddRow={() =>
                handleAddRow(
                  typeof config.tables[0] === "string"
                    ? config.tables[0]
                    : config.tables[0]?.code
                )
              }
              isUploaded={
                isUploaded[
                  typeof config.tables[0] === "string"
                    ? config.tables[0]
                    : config.tables[0]?.code
                ]
              }
              sectionCode={sectionCode}
              editingKey={editingKey}
              setEditingKey={setEditingKey}
              debouncedHandleDataChange={debouncedHandleDataChange}
              handleToggleSelection={handleToggleSelection}
            />
          )
        )}

        {/* Section Footer with Navigation and Export Button */}
        <div
          className="section-footer"
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
              <ExportToExcel userData={userData} sectionCode={sectionCode} />
            </div>
            <Button type="primary" onClick={handleSave} loading={saving}>
              Save Data
            </Button>
          </div>
        </div>

        <CreateLkpsModal
          visible={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={handleLkpsCreatedWrapper}
          prodiId={userData?.prodiId}
        />
      </div>
    </div>
  )
}

export default DynamicLkpsContainer
