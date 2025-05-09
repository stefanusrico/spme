import { useState, useEffect, useCallback, useRef } from "react"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"
import { useTablePlugin } from "./useTablePlugin"
import {
  createDefaultAcademicYears,
  shouldHaveDefaultAcademicYears,
} from "../utils/studentUtils"

export const useTableData = (tableCode, config, userData) => {
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

  const ensureStudentTableDefaults = useCallback(() => {
    if (
      !tableCode ||
      !shouldHaveDefaultAcademicYears(tableCode) ||
      !config ||
      !config.tables
    ) {
      return false
    }

    const defaultData = initializeStudentTableData(
      tableCode,
      config,
      {},
      prodiName
    )

    let needsUpdate = false
    const updatedTableData = { ...tableData }

    config.tables.forEach((table) => {
      const tableCode = typeof table === "object" ? table.code : table

      if (
        !updatedTableData[tableCode] ||
        updatedTableData[tableCode].length === 0
      ) {
        updatedTableData[tableCode] = defaultData[tableCode] || []
        needsUpdate = true
      } else if (defaultData[tableCode] && defaultData[tableCode].length > 0) {
        const existingYears = updatedTableData[tableCode].map(
          (row) => row.tahun_akademik
        )

        const missingRows = defaultData[tableCode].filter(
          (defaultRow) => !existingYears.includes(defaultRow.tahun_akademik)
        )

        if (missingRows.length > 0) {
          updatedTableData[tableCode] = [
            ...updatedTableData[tableCode],
            ...missingRows,
          ]
          needsUpdate = true
        }
      }
    })

    if (needsUpdate) {
      setTableData(updatedTableData)
      return true
    }

    return false
  }, [tableCode, config, tableData, prodiName])

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
          // Update this endpoint to match your new API structure
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

    const initialTableData = plugin.initializeData(config, prodiName, tableCode)

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

    if (shouldHaveDefaultAcademicYears(tableCode)) {
      let needsUpdate = false
      const updatedInitialData = { ...initialTableData }

      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (
          !updatedInitialData[tableCode] ||
          updatedInitialData[tableCode].length === 0
        ) {
          updatedInitialData[tableCode] = createDefaultAcademicYears(
            tableCode,
            prodiName
          )

          if (
            updatedInitialData[tableCode] &&
            updatedInitialData[tableCode].length > 0
          ) {
            needsUpdate = true
          }
        }
      })

      if (needsUpdate) {
        setTableData(updatedInitialData)
      } else {
        setTableData(initialTableData)
      }
    } else {
      setTableData(initialTableData)
    }

    setIsUploaded(initialUploadState)
    setShowSelectionMode(initialSelectionMode)
    setAllExcelData(initialAllExcelData)
    setSelectionData(initialSelectionData)

    hasBeenInitialized.current = true
  }, [config, plugin, prodiName, tableCode, tableData])

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

  const fetchTableData = useCallback(async () => {
    if (!config || !userData || !plugin) return

    try {
      // Update this to use the new data endpoint
      const response = await axiosInstance.get(`/lkps/data/${tableCode}`, {
        params: { prodiId },
      })

      if (response.data) {
        let processedLkpsId = null
        if (response.data.lkpsId) {
          if (
            typeof response.data.lkpsId === "object" &&
            response.data.lkpsId.$oid
          ) {
            processedLkpsId = response.data.lkpsId.$oid
          } else {
            processedLkpsId = response.data.lkpsId
          }
        }

        setLkpsId(processedLkpsId)
        setLkpsInfo(response.data.lkpsInfo || null)

        // Process data from response
        const savedData = {}
        if (response.data.data) {
          // Assuming data is already in the right format
          savedData[tableCode] = plugin.normalizeData(response.data.data)
        }

        const initializedData = plugin.initializeData(
          config,
          prodiName,
          tableCode,
          savedData
        )

        // Merge saved data with initialized data
        Object.keys(savedData).forEach((tableCode) => {
          if (
            savedData[tableCode] &&
            savedData[tableCode].length > 0 &&
            (!initializedData[tableCode] ||
              initializedData[tableCode].length === 0)
          ) {
            initializedData[tableCode] = savedData[tableCode]
          }
        })

        // Handle student table defaults
        if (shouldHaveDefaultAcademicYears(tableCode)) {
          const defaultData = initializeStudentTableData(
            tableCode,
            config,
            {},
            prodiName
          )

          config.tables.forEach((table) => {
            const tableCode = typeof table === "object" ? table.code : table

            if (
              !initializedData[tableCode] ||
              initializedData[tableCode].length === 0
            ) {
              initializedData[tableCode] = defaultData[tableCode] || []
            } else if (
              defaultData[tableCode] &&
              defaultData[tableCode].length > 0
            ) {
              const existingYears = initializedData[tableCode].map(
                (row) => row.tahun_akademik
              )

              const missingRows = defaultData[tableCode].filter(
                (defaultRow) =>
                  !existingYears.includes(defaultRow.tahun_akademik)
              )

              if (missingRows.length > 0) {
                initializedData[tableCode] = [
                  ...initializedData[tableCode],
                  ...missingRows,
                ]
              }
            }
          })
        }

        setTableData(initializedData)

        // Initialize selection data
        const initialSelectionData = {}
        Object.keys(initializedData).forEach((tableCode) => {
          initialSelectionData[tableCode] = []
        })
        setSelectionData(initialSelectionData)

        // Set score if available
        if (response.data.nilai !== null && response.data.nilai !== undefined) {
          setScore(response.data.nilai)
        }

        // Set score details if available
        if (response.data.detailNilai) {
          setScoreDetail(response.data.detailNilai)
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err)

      if (err.response?.status === 404) {
        // Create new data if needed
        if (err.response?.data?.create_new) {
          setShowCreateModal(true)
        }

        // Initialize empty data
        const initializedData = plugin.initializeData(
          config,
          prodiName,
          tableCode,
          {}
        )

        if (shouldHaveDefaultAcademicYears(tableCode)) {
          const defaultData = initializeStudentTableData(
            tableCode,
            config,
            {},
            prodiName
          )

          config.tables.forEach((table) => {
            const tableCode = typeof table === "object" ? table.code : table

            if (
              !initializedData[tableCode] ||
              initializedData[tableCode].length === 0
            ) {
              initializedData[tableCode] = defaultData[tableCode] || []
            }
          })
        }

        setTableData(initializedData)

        const initialSelectionData = {}
        Object.keys(initializedData).forEach((tableCode) => {
          initialSelectionData[tableCode] = []
        })
        setSelectionData(initialSelectionData)
      }
    }
  }, [config, tableCode, prodiId, prodiName, userData, plugin])

  useEffect(() => {
    if (config && userData && plugin && !config.isLoading && !pluginLoading) {
      fetchTableData()
    }
  }, [config, fetchTableData, userData, plugin, pluginLoading])

  useEffect(() => {
    if (shouldHaveDefaultAcademicYears(tableCode) && plugin && config) {
      const timer = setTimeout(() => {
        ensureStudentTableDefaults()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [tableCode, plugin, config, ensureStudentTableDefaults])

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
    ensureStudentTableDefaults,
  }
}
