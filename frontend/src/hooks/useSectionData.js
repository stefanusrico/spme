import { useState, useEffect, useCallback, useRef } from "react"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"
import { useSectionPlugin } from "./useSectionPlugin"
import {
  createDefaultAcademicYears,
  shouldHaveDefaultAcademicYears,
  initializeStudentSectionData,
} from "../utils/studentUtils"

export const useSectionData = (sectionCode, config, userData) => {
  const { plugin, loading: pluginLoading } = useSectionPlugin(sectionCode)

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
  }, [sectionCode])

  const prodiName = userData?.prodi || ""
  const prodiId = userData?.prodiId

  const ensureStudentSectionDefaults = useCallback(() => {
    if (
      !sectionCode ||
      !shouldHaveDefaultAcademicYears(sectionCode) ||
      !config ||
      !config.tables
    ) {
      return false
    }

    const defaultData = initializeStudentSectionData(
      sectionCode,
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
  }, [sectionCode, config, tableData, prodiName])

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
          const response = await axiosInstance.post("/lkps/sections/fix-data", {
            sectionCode,
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
  }, [plugin, tableData, userData, sectionCode])

  useEffect(() => {
    if (!config || !plugin) return

    if (hasBeenInitialized.current && Object.keys(tableData).length > 0) {
      return
    }

    const initialTableData = plugin.initializeData(
      config,
      prodiName,
      sectionCode
    )

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

    if (shouldHaveDefaultAcademicYears(sectionCode)) {
      let needsUpdate = false
      const updatedInitialData = { ...initialTableData }

      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (
          !updatedInitialData[tableCode] ||
          updatedInitialData[tableCode].length === 0
        ) {
          updatedInitialData[tableCode] = createDefaultAcademicYears(
            sectionCode,
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
  }, [config, plugin, prodiName, sectionCode, tableData])

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
          sectionCode,
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
    [plugin, tableData, userData, sectionCode]
  )

  const fetchSectionData = useCallback(async () => {
    if (!config || !userData || !plugin) return

    try {
      const response = await axiosInstance.get(
        `/lkps/sections/${sectionCode}/data`,
        { params: { prodiId } }
      )

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

        const savedData = {}

        if (response.data.tables) {
          Object.keys(response.data.tables).forEach((tableCode) => {
            if (Array.isArray(response.data.tables[tableCode])) {
              const normalizedData = plugin.normalizeData(
                response.data.tables[tableCode]
              )

              const dataWithSelection = normalizedData.map((item) => ({
                ...item,
                selected: true,
              }))

              savedData[tableCode] = dataWithSelection
            }
          })
        }

        const initializedData = plugin.initializeData(
          config,
          prodiName,
          sectionCode,
          savedData
        )

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

        if (shouldHaveDefaultAcademicYears(sectionCode)) {
          const defaultData = initializeStudentSectionData(
            sectionCode,
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

        const initialSelectionData = {}
        Object.keys(initializedData).forEach((tableCode) => {
          initialSelectionData[tableCode] = []
        })
        setSelectionData(initialSelectionData)

        if (response.data.score !== null && response.data.score !== undefined) {
          setScore(response.data.score)
        }
      }
    } catch (err) {
      console.error("Error fetching section data:", err)

      if (err.response?.status === 404) {
        if (err.response?.data?.create_new) {
          setShowCreateModal(true)
        }

        const initializedData = plugin.initializeData(
          config,
          prodiName,
          sectionCode,
          {}
        )

        if (shouldHaveDefaultAcademicYears(sectionCode)) {
          const defaultData = initializeStudentSectionData(
            sectionCode,
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
  }, [config, sectionCode, prodiId, prodiName, userData, plugin])

  useEffect(() => {
    if (config && userData && plugin && !config.isLoading && !pluginLoading) {
      fetchSectionData()
    }
  }, [config, fetchSectionData, userData, plugin, pluginLoading])

  useEffect(() => {
    if (shouldHaveDefaultAcademicYears(sectionCode) && plugin && config) {
      const timer = setTimeout(() => {
        ensureStudentSectionDefaults()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [sectionCode, plugin, config, ensureStudentSectionDefaults])

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
    ensureStudentSectionDefaults,
  }
}
