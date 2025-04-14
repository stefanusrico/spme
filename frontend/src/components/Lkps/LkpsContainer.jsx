import React, { useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, Spin, Typography, Button } from "antd"

// Custom hooks
import useConfig from "../../hooks/useConfig"
import useSectionData from "../../hooks/useSectionData"
import useScoreCalculation from "../../hooks/useScoreCalculation"
import useFileUpload from "../../hooks/useFileUpload"
import useTableData from "../../hooks/useTableData"

// Utils and helpers
import {
  findSectionByCode,
  getAdjacentSections,
} from "../../utils/sectionUtils"

// Components
import LkpsHeader from "./LkpsHeader"
import LkpsScore from "./LkpsScore"
import LkpsTabPanel from "./LkpsTabPanel"
import LkpsTable from "./LkpsTable"
import LkpsFooter from "./LkpsFooter"
import LkpsDebugPanel from "./LkpsDebugPanel"
import LkpsCreateModal from "./LkpsCreateModal"

const { Title, Paragraph } = Typography

/**
 * Main LKPS container component
 */
const LkpsContainer = ({ userData, userLoading }) => {
  const { sectionCode } = useParams()
  const navigate = useNavigate()
  const configRef = useRef(null)

  // Get current section info
  const currentSection = findSectionByCode(sectionCode)

  // Get adjacent sections for navigation
  const { prev, next } = getAdjacentSections(sectionCode)

  // User data
  const prodiId = userData?.prodiId
  const prodiName = userData?.prodi || ""
  const NDTPS = userData?.NDTPS || 20

  // Get section configuration
  const { config, loading, error, setConfig } = useConfig(
    sectionCode,
    userLoading,
    userData
  )

  // Update config ref when config changes
  if (config !== configRef.current) {
    configRef.current = config
  }

  // Initialize score calculation
  const { score, setScore, calculateScoreData, manualCalculateScore } =
    useScoreCalculation(sectionCode, config, NDTPS)

  // Initialize table data management
  const {
    tableData,
    setTableData,
    prodiData,
    setProdiData,
    polbanData,
    setPolbanData,
    editingKey,
    setEditingKey,
    dataFilter,
    handleToggleSelection,
    handleDataChange,
    debouncedHandleDataChange,
    handleAddRow,
    handleFilterChange,
  } = useTableData(sectionCode, config, prodiName, calculateScoreData)

  // Initialize section data management
  const {
    lkpsId,
    lkpsInfo,
    saving,
    showCreateModal,
    setShowCreateModal,
    savedSections,
    handleSave,
    handleLkpsCreated,
  } = useSectionData(sectionCode, config, userData, calculateScoreData)

  // Initialize file upload handling
  const {
    isUploaded,
    setIsUploaded,
    showSelectionMode,
    handleUpload: fileUploadHandler,
    toggleSelectionMode,
  } = useFileUpload(sectionCode, config, prodiName, calculateScoreData)

  // Wrap handleUpload to pass in the required states
  const handleUpload = (info, tableCode) => {
    fileUploadHandler(
      info,
      tableCode,
      tableData,
      prodiData,
      polbanData,
      setTableData,
      setProdiData,
      setPolbanData
    )
  }

  // Handle navigation to previous section
  const handlePrev = () => {
    if (prev) navigate(`/lkps/${prev}`)
  }

  // Handle navigation to next section
  const handleNext = () => {
    if (next) navigate(`/lkps/${next}`)
  }

  // Handle section change
  const handleSectionChange = (newSection) => {
    navigate(`/lkps/${newSection}`)
  }

  // Showing loading indicator
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
        <Spin tip="Memuat data..." size="large" />
      </div>
    )
  }

  // Show error if user is not logged in
  if (!userData) {
    return (
      <Card>
        <Title level={4} style={{ color: "#cf1322" }}>
          Akses Ditolak
        </Title>
        <Paragraph>Silakan login untuk mengakses halaman ini.</Paragraph>
      </Card>
    )
  }

  // Show error if there was an error loading data
  if (error) {
    return (
      <Card>
        <Title level={4} style={{ color: "#cf1322" }}>
          Error
        </Title>
        <Paragraph>{error}</Paragraph>
        <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
      </Card>
    )
  }

  return (
    <div className="lkps-page-container">
      {/* Navigation header */}
      <LkpsHeader
        sectionCode={sectionCode}
        currentSection={currentSection}
        savedSections={savedSections}
        onSectionChange={handleSectionChange}
        navigate={navigate}
        config={config}
        lkpsInfo={lkpsInfo}
        userData={userData}
      />

      {/* Debug Panel - Only in development */}
      {process.env.NODE_ENV === "development" && (
        <LkpsDebugPanel
          sectionCode={sectionCode}
          config={config}
          tableData={tableData}
          score={score}
          setScore={setScore}
          manualCalculateScore={() => manualCalculateScore(tableData)}
        />
      )}

      {/* Score Display */}
      {score !== null && config?.formula && (
        <LkpsScore score={score} formula={config.formula} />
      )}

      {/* Table Section */}
      {config && config.tables && config.tables.length > 1 ? (
        <LkpsTabPanel
          config={config}
          tableData={tableData}
          polbanData={polbanData}
          showSelectionMode={showSelectionMode}
          toggleSelectionMode={toggleSelectionMode}
          handleUpload={handleUpload}
          handleAddRow={handleAddRow}
          isUploaded={isUploaded}
          sectionCode={sectionCode}
          editingKey={editingKey}
          setEditingKey={setEditingKey}
          handleToggleSelection={handleToggleSelection}
          debouncedHandleDataChange={debouncedHandleDataChange}
        />
      ) : (
        config?.tables &&
        config.tables.length > 0 && (
          <LkpsTable
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
            polbanData={
              polbanData[
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
            toggleSelectionMode={toggleSelectionMode}
            handleUpload={handleUpload}
            handleAddRow={handleAddRow}
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
            handleToggleSelection={handleToggleSelection}
            debouncedHandleDataChange={debouncedHandleDataChange}
          />
        )
      )}

      {/* Footer with navigation and save button */}
      <LkpsFooter
        saving={saving}
        onSave={handleSave}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={!!prev}
        hasNext={!!next}
      />

      {/* Create LKPS Modal */}
      <LkpsCreateModal
        visible={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        onSuccess={handleLkpsCreated}
        prodiId={prodiId}
      />
    </div>
  )
}

export default LkpsContainer
