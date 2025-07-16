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

  // ✅ CHANGE: Track fetch status per table but reset when table changes
  const currentTableRef = useRef(null)
  const hasCurrentTableDataFetched = useRef(false)

  useEffect(() => {
    configRef.current = config
  }, [config])

  // Reset everything when tableCode changes
  useEffect(() => {
    console.log(`🔄 Table changed to: ${tableCode}`)

    // Reset scores for new table
    setScore(null)
    setScoreDetail(null)

    // Reset flags for new table
    hasBeenInitialized.current = false

    // ✅ CHANGE: Reset fetch status when table changes
    if (currentTableRef.current !== tableCode) {
      currentTableRef.current = tableCode
      hasCurrentTableDataFetched.current = false
      console.log(`📝 Reset fetch status for new table: ${tableCode}`)
    }
  }, [tableCode])

  const prodiName = userData?.prodi || ""
  const prodiId = userData?.prodiId

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

  // ✅ OPTIMIZED FETCH DATA FUNCTION
  const fetchTableData = useCallback(async () => {
    if (!config || !userData || !plugin || !projectId) {
      console.log("❌ Fetch skipped - missing dependencies")
      return
    }

    // Get the actual table code from config
    const actualTableCode =
      typeof config.tables[0] === "string"
        ? config.tables[0]
        : config.tables[0]?.code || tableCode

    // ✅ CHANGE: Check if we already fetched data for CURRENT table
    if (
      hasCurrentTableDataFetched.current &&
      currentTableRef.current === tableCode
    ) {
      console.log(
        `❌ Fetch skipped - already fetched current table: ${actualTableCode}`
      )
      return
    }

    try {
      console.log(`🔄 Fetching data for table: ${actualTableCode}`)

      const response = await axiosInstance.get(`/lkps/data`, {
        params: {
          projectId,
          tableCode: actualTableCode,
        },
      })

      if (response.data) {
        console.log("📦 Raw response data:", response.data)

        // Update table data with fetched data
        setTableData((prevData) => {
          const newData = { ...prevData }

          if (response.data.data && Array.isArray(response.data.data)) {
            const normalizedData = plugin.normalizeData(response.data.data)
            console.log("✅ Normalized saved data:", normalizedData)

            // Merge with existing data from plugin initialization
            const mergedData = plugin.initializeData(
              config,
              prodiName,
              actualTableCode,
              { [actualTableCode]: normalizedData }
            )

            // Update only the specific table
            Object.assign(newData, mergedData)
          } else {
            // No saved data, initialize with defaults
            const defaultData = plugin.initializeData(
              config,
              prodiName,
              actualTableCode,
              {}
            )
            Object.assign(newData, defaultData)
          }

          console.log("🏗️ Final table data:", newData)
          return newData
        })

        // Update selection data
        setSelectionData((prevSelection) => {
          const newSelection = { ...prevSelection }
          if (!newSelection[actualTableCode]) {
            newSelection[actualTableCode] = []
          }
          return newSelection
        })

        // Handle scores
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

        // ✅ CHANGE: Mark current table as fetched
        hasCurrentTableDataFetched.current = true

        console.log(`✅ Data fetched successfully for: ${actualTableCode}`)
      }
    } catch (err) {
      console.error("❌ Error fetching data:", err)

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
        setTableData((prevData) => {
          const defaultData = plugin.initializeData(
            config,
            prodiName,
            actualTableCode,
            {}
          )
          return { ...prevData, ...defaultData }
        })

        setSelectionData((prevSelection) => ({
          ...prevSelection,
          [actualTableCode]: [],
        }))

        // ✅ CHANGE: Mark as fetched even on 404 for current table
        hasCurrentTableDataFetched.current = true
        console.log(`📝 Default data initialized for: ${actualTableCode}`)
      }
    }
  }, [config, tableCode, projectId, prodiName, userData, plugin])

  // ✅ INITIALIZE DATA FIRST
  useEffect(() => {
    if (!config || !plugin) return

    if (hasBeenInitialized.current) return

    console.log(`🏗️ Initializing data for table: ${tableCode}`)

    // Initialize with empty data first
    const initialTableData = plugin.initializeData(
      config,
      prodiName,
      tableCode,
      {}
    )

    // Initialize other states
    const initialUploadState = {}
    const initialSelectionMode = {}
    const initialAllExcelData = {}
    const initialSelectionData = {}

    config.tables.forEach((table) => {
      const currentTableCode = typeof table === "object" ? table.code : table
      initialUploadState[currentTableCode] = false
      initialSelectionMode[currentTableCode] = false
      initialAllExcelData[currentTableCode] = []
      initialSelectionData[currentTableCode] = []
    })

    setTableData((prevData) => ({ ...prevData, ...initialTableData }))
    setIsUploaded((prevUploaded) => ({
      ...prevUploaded,
      ...initialUploadState,
    }))
    setShowSelectionMode((prevMode) => ({
      ...prevMode,
      ...initialSelectionMode,
    }))
    setAllExcelData((prevExcel) => ({ ...prevExcel, ...initialAllExcelData }))
    setSelectionData((prevSelection) => ({
      ...prevSelection,
      ...initialSelectionData,
    }))

    hasBeenInitialized.current = true
    console.log("✅ Initial data set:", initialTableData)
  }, [config, plugin, prodiName, tableCode])

  // ✅ FETCH DATA AFTER INITIALIZATION
  useEffect(() => {
    if (
      config &&
      !config.isLoading &&
      userData &&
      plugin &&
      !pluginLoading &&
      projectId &&
      hasBeenInitialized.current && // Wait for initialization first
      !hasCurrentTableDataFetched.current // Only fetch if current table hasn't been fetched
    ) {
      console.log("🚀 Triggering data fetch...")
      // Small delay to ensure all state is settled
      const timeoutId = setTimeout(() => {
        fetchTableData()
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [
    config?.isLoading,
    userData?.prodiId,
    plugin,
    pluginLoading,
    projectId,
    hasBeenInitialized.current,
    hasCurrentTableDataFetched.current,
    fetchTableData,
  ])

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
    calculateScoreData,
    prepareDataForSaving,
    plugin,
  }
}
