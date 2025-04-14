import { useState, useEffect, useCallback, useRef } from "react"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"
import { normalizeDataConsistency } from "../utils/tridharmaUtils"
import {
  shouldHaveDefaultAcademicYears,
  initializeStudentSectionData,
} from "../utils/studentUtils"

/**
 * Custom hook for managing LKPS section data
 * @param {string} sectionCode - Current section code
 * @param {object} config - Section configuration
 * @param {string} prodiId - Program study ID
 * @param {string} prodiName - Program study name
 * @param {object} userData - Current user data
 * @returns {object} Data state and management functions
 */
const useLkpsData = (sectionCode, config, prodiId, prodiName, userData) => {
  // State declarations
  const [tableData, setTableData] = useState({})
  const [prodiData, setProdiData] = useState({})
  const [polbanData, setPolbanData] = useState({})
  const [allExcelData, setAllExcelData] = useState({})
  const [isUploaded, setIsUploaded] = useState({})
  const [lkpsId, setLkpsId] = useState(null)
  const [lkpsInfo, setLkpsInfo] = useState(null)
  const [savedSections, setSavedSections] = useState([])
  const [saving, setSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [dataInitialized, setDataInitialized] = useState(false)

  // Keep track of whether data was fetched
  const dataFetchedRef = useRef(false)

  /**
   * Fix all existing data to ensure boolean flags match tingkat_* fields
   */
  const fixAllExistingData = useCallback(() => {
    // Fix tableData
    setTableData((prev) => {
      const updated = {}
      Object.keys(prev).forEach((code) => {
        updated[code] = normalizeDataConsistency(prev[code])
      })
      return updated
    })

    // Fix prodiData
    setProdiData((prev) => {
      const updated = {}
      Object.keys(prev).forEach((code) => {
        updated[code] = normalizeDataConsistency(prev[code])
      })
      return updated
    })

    // Fix polbanData
    setPolbanData((prev) => {
      const updated = {}
      Object.keys(prev).forEach((code) => {
        updated[code] = normalizeDataConsistency(prev[code])
      })
      return updated
    })

    message.success(
      "Boolean flags synced with tingkat fields. Save to update the database."
    )
  }, [])

  /**
   * Add a new row to a table
   */
  const handleAddRow = useCallback(
    (tableCode) => {
      if (!config) return

      const tableConfig = config.tables.find(
        (t) =>
          (typeof t === "string" && t === tableCode) ||
          (t && t.code === tableCode)
      )
      if (!tableConfig) return

      // Create new row with default values
      const newRow = {
        key: `new-${Date.now()}`,
        source: "prodi",
        prodi: prodiName,
        selected: true,
      }

      // Get all columns from the table config
      const allColumns = []

      const columns = tableConfig.columns
      if (Array.isArray(columns)) {
        columns.forEach((column) => {
          if (column.is_group && column.children) {
            if (Array.isArray(column.children)) {
              column.children.forEach((child) => allColumns.push(child))
            } else if (typeof column.children === "object") {
              Object.values(column.children).forEach((child) =>
                allColumns.push(child)
              )
            }
          } else if (!column.is_group) {
            allColumns.push(column)
          }
        })
      } else if (typeof columns === "object" && columns) {
        Object.values(columns).forEach((column) => {
          if (column.is_group && column.children) {
            if (Array.isArray(column.children)) {
              column.children.forEach((child) => allColumns.push(child))
            } else if (typeof column.children === "object") {
              Object.values(column.children).forEach((child) =>
                allColumns.push(child)
              )
            }
          } else if (!column.is_group) {
            allColumns.push(column)
          }
        })
      }

      // Set default values for each column
      allColumns.forEach((column) => {
        if (column.type === "boolean") {
          newRow[column.data_index] = false
        } else if (column.type === "number") {
          newRow[column.data_index] = 0
        } else {
          newRow[column.data_index] = ""
        }
      })

      // For Tridharma sections, ensure special fields exist
      if (sectionCode.startsWith("1-")) {
        newRow.internasional = false
        newRow.nasional = false
        newRow.lokal = false
        newRow.pendidikan = false
        newRow.penelitian = false
        newRow.pkm = false

        // Initialize empty tingkat_* fields
        newRow.tingkat_internasional = ""
        newRow.tingkat_nasional = ""
        newRow.tingkat_lokal = ""
      }

      // Add new row to prodiData and tableData
      setProdiData((prev) => ({
        ...prev,
        [tableCode]: [...(prev[tableCode] || []), newRow],
      }))

      setTableData((prev) => ({
        ...prev,
        [tableCode]: [...(prev[tableCode] || []), newRow],
      }))
    },
    [config, prodiName, sectionCode]
  )

  /**
   * Handle LKPS creation
   */
  const handleLkpsCreated = useCallback((lkps) => {
    console.log("LKPS creation result:", lkps)
    if (!lkps) {
      console.error("Invalid LKPS data received")
      return
    }

    // Handle different possible formats for lkpsId
    let newLkpsId = null
    if (lkps._id) {
      if (typeof lkps._id === "object" && lkps._id.$oid) {
        newLkpsId = lkps._id.$oid
      } else {
        newLkpsId = lkps._id
      }
    } else if (lkps.id) {
      newLkpsId = lkps.id
    } else if (lkps.lkpsId) {
      newLkpsId = lkps.lkpsId
    }

    console.log("Setting LKPS ID to:", newLkpsId)

    setLkpsId(newLkpsId)
    setLkpsInfo(lkps)
    setShowCreateModal(false)
    message.success("LKPS created successfully. Please fill in the data.")
  }, [])

  // Initialize tables when config changes
  useEffect(() => {
    if (!config) {
      console.log("Config not available yet, skipping initialization")
      return
    }

    console.log("Initializing tables with config:", config)

    // Initialize data structures
    const initialTableData = {}
    const initialUploadState = {}
    const initialAllExcelData = {}
    const initialProdiData = {}
    const initialPolbanData = {}

    if (
      !config.tables ||
      !Array.isArray(config.tables) ||
      config.tables.length === 0
    ) {
      console.error("Config tables missing or invalid:", config.tables)
      return
    }

    config.tables.forEach((table) => {
      const tableCode = typeof table === "object" ? table.code : table
      initialTableData[tableCode] = []
      initialUploadState[tableCode] = false
      initialAllExcelData[tableCode] = []
      initialProdiData[tableCode] = []
      initialPolbanData[tableCode] = []

      console.log(`Initialized empty table data for ${tableCode}`)
    })

    setTableData(initialTableData)
    setIsUploaded(initialUploadState)
    setAllExcelData(initialAllExcelData)
    setProdiData(initialProdiData)
    setPolbanData(initialPolbanData)
    setDataInitialized(true)

    console.log("Table initialization complete")
  }, [config])

  // Fetch section data after config is loaded and data structures initialized
  useEffect(() => {
    // Prevent multiple fetches
    if (dataFetchedRef.current) {
      console.log("Data already fetched, skipping")
      return
    }

    if (!config) {
      console.log("Config not available yet")
      return
    }

    if (!dataInitialized) {
      console.log("Data not initialized yet")
      return
    }

    if (!prodiId) {
      console.log("ProdiId not available yet")
      return
    }

    if (!userData) {
      console.log("UserData not available yet")
      return
    }

    console.log("All dependencies ready, starting data fetch")
    console.log("Config:", config)
    console.log("ProdiId:", prodiId)
    console.log("SectionCode:", sectionCode)

    const fetchSectionData = async () => {
      try {
        console.log("Fetching existing section data for prodiId:", prodiId)
        const response = await axiosInstance.get(
          `/lkps/sections/${sectionCode}/data`,
          {
            params: { prodiId },
          }
        )

        console.log("API responded with data:", response.data ? "yes" : "no")

        if (response.data) {
          console.log("Received section data:", response.data)

          // Process LKPS info - with special handling for different formats
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

          console.log("Processed LKPS ID:", processedLkpsId)

          setLkpsId(processedLkpsId)
          setLkpsInfo(response.data.lkpsInfo || null)

          // Process table data
          const savedData = {}
          const savedProdiData = {}

          if (response.data.tables) {
            Object.keys(response.data.tables).forEach((tableCode) => {
              if (Array.isArray(response.data.tables[tableCode])) {
                // Normalize data to ensure boolean flags match tingkat_* fields
                const normalizedData = normalizeDataConsistency(
                  response.data.tables[tableCode],
                  sectionCode
                )

                const dataWithSelection = normalizedData.map((item) => ({
                  ...item,
                  selected: true, // All existing data is considered selected/included
                  source: item.source || "prodi", // Default source is prodi if not specified
                }))

                savedData[tableCode] = dataWithSelection
                savedProdiData[tableCode] = dataWithSelection.filter(
                  (item) => item.source === "prodi"
                )

                console.log(
                  `Loaded ${response.data.tables[tableCode].length} rows for table ${tableCode}`
                )
              }
            })
          }

          // For student sections, merge with default academic years if needed
          if (shouldHaveDefaultAcademicYears(sectionCode)) {
            console.log(
              "Initializing student section with default academic years"
            )
            const initializedData = initializeStudentSectionData(
              sectionCode,
              config,
              savedData,
              prodiName
            )
            setTableData(initializedData)

            // Also update prodiData to include defaults
            const initializedProdiData = {}
            Object.keys(initializedData).forEach((tableCode) => {
              initializedProdiData[tableCode] = initializedData[
                tableCode
              ].filter(
                (item) => item.source === "prodi" || item.source === "default"
              )
            })
            setProdiData(initializedProdiData)
          } else {
            // For other sections, just use the saved data
            setTableData(savedData)
            setProdiData(savedProdiData)
          }

          console.log("Data loading complete")
          dataFetchedRef.current = true
        }
      } catch (err) {
        console.error("Error fetching section data:", err)
        console.error("Error details:", {
          status: err.response?.status,
          message: err.response?.data?.message,
          stack: err.stack,
        })

        // If 404 error or no data returned, initialize with defaults for student sections
        if (err.response?.status === 404) {
          if (err.response?.data?.create_new) {
            setShowCreateModal(true)
          }

          // Initialize with defaults for student sections
          if (shouldHaveDefaultAcademicYears(sectionCode) && config) {
            console.log("No data found. Creating defaults for student section")
            const initializedData = initializeStudentSectionData(
              sectionCode,
              config,
              {}, // No existing data
              prodiName
            )
            setTableData(initializedData)

            // Also update prodiData to include defaults
            const initializedProdiData = {}
            Object.keys(initializedData).forEach((tableCode) => {
              initializedProdiData[tableCode] = initializedData[
                tableCode
              ].filter(
                (item) => item.source === "prodi" || item.source === "default"
              )
            })
            setProdiData(initializedProdiData)
          }
        }

        // Mark as fetched even if there was an error to prevent endless retries
        dataFetchedRef.current = true
      }
    }

    fetchSectionData()
  }, [config, dataInitialized, sectionCode, prodiId, userData, prodiName])

  return {
    tableData,
    setTableData,
    prodiData,
    setProdiData,
    polbanData,
    setPolbanData,
    allExcelData,
    setAllExcelData,
    isUploaded,
    setIsUploaded,
    lkpsId,
    setLkpsId,
    lkpsInfo,
    setLkpsInfo,
    savedSections,
    setSavedSections,
    saving,
    setSaving,
    showCreateModal,
    setShowCreateModal,
    handleAddRow,
    handleLkpsCreated,
    fixAllExistingData,
  }
}

export default useLkpsData
