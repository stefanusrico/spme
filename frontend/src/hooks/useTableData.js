import { useState, useEffect, useCallback, useRef } from "react"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"
import { useTablePlugin } from "./useTablePlugin"

export const useTableData = (tableCode, config, userData, projectId) => {
  const { plugin, loading: pluginLoading } = useTablePlugin(tableCode)

  const [tableData, setTableData] = useState({})
  const [selectionData, setSelectionData] = useState({})
  const [allExcelData, setAllExcelData] = useState({})
  const [isUploaded, setIsUploaded] = useState({})
  const [score, setScore] = useState(null)
  const [scoreDetail, setScoreDetail] = useState(null)
  const [calculationLog, setCalculationLog] = useState(null)
  const [lkpsId, setLkpsId] = useState(null)
  const [lkpsInfo, setLkpsInfo] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [showSelectionMode, setShowSelectionMode] = useState({})

  const configRef = useRef(null)
  const hasBeenInitialized = useRef(false)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    setScore(null)
    setScoreDetail(null)
  }, [tableCode])

  const prodiName = userData?.prodi || ""
  const prodiId = userData?.prodiId

  const fixAllExistingData = useCallback(async () => {
    if (!plugin || !userData) return

    try {
      message.loading({
        content: "Normalizing data format...",
        key: "fixData",
      })

      const updatedTableData = {}
      Object.keys(tableData).forEach((code) => {
        updatedTableData[code] = plugin.normalizeData(tableData[code])
      })
      setTableData(updatedTableData)

      if (userData.role === "admin") {
        try {
          const response = await axiosInstance.post("/lkps/data/fix-format", {
            tableCode: tableCode,
            prodiId: userData.prodiId,
          })

          message.success({
            content:
              response.data?.message || "Data format fixed successfully!",
            key: "fixData",
          })
        } catch (error) {
          console.error("Server-side data fix failed:", error)
          message.warning({
            content: "Server-side fix failed. Local data normalized.",
            key: "fixData",
          })
        }
      } else {
        message.success({
          content:
            "Data format has been normalized. Save to update the database.",
          key: "fixData",
        })
      }
    } catch (error) {
      console.error("Error fixing data:", error)
      message.error({
        content: "Failed to normalize data format.",
        key: "fixData",
      })
    }
  }, [plugin, tableData, userData, tableCode])

  useEffect(() => {
    if (!config || !plugin) return

    if (hasBeenInitialized.current && Object.keys(tableData).length > 0) {
      return
    }

    // Simple - plugin handles everything!
    const initialTableData = plugin.initializeData(config, prodiName, tableCode)

    // Initialize other states
    const initialUploadState = {}
    const initialSelectionMode = {}
    const initialAllExcelData = {}
    const initialSelectionData = {}

    config.tables.forEach((table) => {
      const tableCode = typeof table === "object" ? table.code : table
      initialUploadState[tableCode] = false
      initialSelectionMode[tableCode] = false
      initialAllExcelData[tableCode] = []
      initialSelectionData[tableCode] = []
    })

    setTableData(initialTableData)
    setIsUploaded(initialUploadState)
    setShowSelectionMode(initialSelectionMode)
    setAllExcelData(initialAllExcelData)
    setSelectionData(initialSelectionData)

    hasBeenInitialized.current = true
  }, [config, plugin, prodiName, tableCode])

  const calculateScoreData = useCallback(
    async (specificData = null, forcedCalculation = false) => {
      if (!forcedCalculation) {
        return {
          skipped: true,
          message: "Calculations only performed on save",
        }
      }

      if (!plugin || !configRef.current?.formula) {
        return null
      }

      try {
        const tableCode =
          typeof configRef.current.tables[0] === "string"
            ? configRef.current.tables[0]
            : configRef.current.tables[0]?.code

        const data = specificData || tableData[tableCode] || []

        if (data.length === 0) {
          return null
        }

        const additionalData = {
          userData,
          currentConfig: configRef.current,
          tableCode,
          forcedCalculation: true,
        }

        const result = await plugin.calculateScore(
          data,
          configRef.current,
          additionalData
        )

        if (result) {
          if (typeof result === "object") {
            if (result.score !== undefined && result.score !== null) {
              setScore(result.score)
            }

            if (result.scoreDetail) {
              setScoreDetail(result.scoreDetail)
            }

            if (result.log) {
              setCalculationLog(result.log)
            }

            return result
          } else {
            setScore(result)
            return { score: result }
          }
        }

        return null
      } catch (error) {
        console.error("Error in score calculation:", error)
        message.error("Failed to calculate score: " + error.message)
        return null
      }
    },
    [plugin, tableData, userData, tableCode]
  )

  // ✅ SIMPLIFIED FETCH DATA
  const fetchTableData = useCallback(async () => {
    if (!config || !userData || !plugin) return

    try {
      const response = await axiosInstance.get(`lkps/data`, {
        params: {
          projectId,
          tableCode,
        },
      })

      if (response.data) {
        const savedData = {}
        if (response.data.data && Array.isArray(response.data.data)) {
          savedData[tableCode] = plugin.normalizeData(response.data.data)
        }

        // Plugin handles merging with defaults automatically!
        const initializedData = plugin.initializeData(
          config,
          prodiName,
          tableCode,
          savedData
        )

        // ❌ HAPUS semua logic shouldHaveDefaultAcademicYears

        setTableData(initializedData)

        const initialSelectionData = {}
        Object.keys(initializedData).forEach((tableCode) => {
          initialSelectionData[tableCode] = []
        })
        setSelectionData(initialSelectionData)

        if (response.data.nilai && Array.isArray(response.data.nilai)) {
          setScore(response.data.nilai)
        } else if (
          response.data.nilai !== null &&
          response.data.nilai !== undefined
        ) {
          setScore([{ butir: null, nilai: response.data.nilai }])
        } else {
          setScore(null)
        }

        if (response.data.detailNilai) {
          setScoreDetail(response.data.detailNilai)
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err)

      if (err.response?.status === 404) {
        const errorMessage = err.response?.data?.message || ""

        if (errorMessage.includes("No task found")) {
          message.warning("No task found for this table in the current project")
        } else if (errorMessage.includes("Project not found")) {
          message.error("Project not found")
          return
        } else if (errorMessage.includes("Table not found")) {
          message.error("Table configuration not found")
          return
        } else {
          if (err.response?.data?.create_new) {
            setShowCreateModal(true)
          }
        }

        // Initialize with defaults on 404
        const initializedData = plugin.initializeData(
          config,
          prodiName,
          tableCode,
          {}
        )

        // ❌ HAPUS semua logic shouldHaveDefaultAcademicYears

        setTableData(initializedData)

        const initialSelectionData = {}
        Object.keys(initializedData).forEach((tableCode) => {
          initialSelectionData[tableCode] = []
        })
        setSelectionData(initialSelectionData)
      }
    }
  }, [config, tableCode, projectId, prodiName, userData, plugin])

  useEffect(() => {
    if (
      config &&
      userData &&
      plugin &&
      !config.isLoading &&
      !pluginLoading &&
      projectId
    ) {
      fetchTableData()
    }
  }, [config, fetchTableData, userData, plugin, pluginLoading, projectId])

  const prepareDataForSaving = useCallback(
    (tableCode) => {
      if (!plugin) return null

      try {
        const dataToSave = tableData[tableCode] || []
        const preparedData = plugin.prepareDataForSaving(dataToSave, userData)
        const validation = plugin.validateData(preparedData)

        if (!validation.valid) {
          message.error(
            `Data validation failed: ${validation.errors.join(", ")}`
          )
          return null
        }

        return preparedData
      } catch (error) {
        console.error("Error preparing data for saving:", error)
        message.error("Failed to prepare data for saving")
        return null
      }
    },
    [plugin, tableData, userData]
  )

  return {
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
    calculationLog,
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
    prepareDataForSaving,
    plugin,
  }
}
