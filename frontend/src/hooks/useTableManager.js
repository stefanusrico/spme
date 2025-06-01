import { useState, useCallback } from "react"
import { message } from "antd"
import { isSelectionAllowedForSection } from "../constants/sectionStructure"
import { isTridharmaSection } from "../utils/tridharmaUtils"

/**
 * Custom hook to manage table data and operations
 */
const useTableManager = (config, sectionCode, prodiName) => {
  const [tableData, setTableData] = useState({})
  const [prodiData, setProdiData] = useState({})
  const [polbanData, setPolbanData] = useState({})
  const [isUploaded, setIsUploaded] = useState({})
  const [showSelectionMode, setShowSelectionMode] = useState({})
  const [editingKey, setEditingKey] = useState(null)

  /**
   * Initialize table data structures based on configuration
   */
  const initializeTableData = useCallback(() => {
    if (!config || !config.tables) return

    const initialTableData = {}
    const initialUploadState = {}
    const initialSelectionMode = {}
    const initialProdiData = {}
    const initialPolbanData = {}

    config.tables.forEach((table) => {
      const tableCode = typeof table === "object" ? table.code : table
      initialTableData[tableCode] = []
      initialUploadState[tableCode] = false
      initialSelectionMode[tableCode] = false
      initialProdiData[tableCode] = []
      initialPolbanData[tableCode] = []
    })

    setTableData(initialTableData)
    setIsUploaded(initialUploadState)
    setShowSelectionMode(initialSelectionMode)
    setProdiData(initialProdiData)
    setPolbanData(initialPolbanData)
  }, [config])

  /**
   * Update table data with data fetched from the API
   */
  const updateTableData = useCallback(
    (fetchedData) => {
      if (!fetchedData || !fetchedData.tables) return

      const savedData = {}
      const savedProdiData = {}

      Object.keys(fetchedData.tables).forEach((tableCode) => {
        if (Array.isArray(fetchedData.tables[tableCode])) {
          // Normalize data
          const normalizedData = normalizeDataConsistency(
            fetchedData.tables[tableCode],
            sectionCode
          )

          const dataWithSelection = normalizedData.map((item) => ({
            ...item,
            selected: true, // All existing data is considered selected
            source: item.source || "prodi", // Default source is prodi if not specified
          }))

          savedData[tableCode] = dataWithSelection
          savedProdiData[tableCode] = dataWithSelection.filter(
            (item) => item.source === "prodi"
          )
        }
      })

      setTableData(savedData)
      setProdiData(savedProdiData)

      return savedData
    },
    [sectionCode]
  )

  /**
   * Handle data change in tables
   */
  const handleDataChange = useCallback(
    (tableCode, key, field, value) => {
      // Check if the data is from prodi or polban
      const isProdiData = prodiData[tableCode]?.some((row) => row.key === key)
      const isPolbanData = polbanData[tableCode]?.some((row) => row.key === key)

      // Sync related fields for Tridharma sections
      const syncRelatedFields = (dataStore, updateFunction) => {
        if (!isTridharmaSection(sectionCode) || !dataStore[tableCode]) return

        const rowIndex = dataStore[tableCode].findIndex(
          (item) => item.key === key
        )
        if (rowIndex === -1) return

        const row = dataStore[tableCode][rowIndex]
        let updates = {}

        // If updating tingkat_* field, sync with corresponding boolean flag
        if (field === "tingkat_internasional") {
          updates.internasional = !!value && value !== ""
        } else if (field === "tingkat_nasional") {
          updates.nasional = !!value && value !== ""
        } else if (field === "tingkat_lokal") {
          updates.lokal = !!value && value !== ""
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          const newData = [...dataStore[tableCode]]
          newData[rowIndex] = { ...row, ...updates }
          updateFunction((prev) => ({ ...prev, [tableCode]: newData }))
        }
      }

      // Update the appropriate data store
      if (isProdiData) {
        setProdiData((prev) => {
          const newData = [...(prev[tableCode] || [])]
          const index = newData.findIndex((item) => item.key === key)

          if (index > -1) {
            newData[index] = {
              ...newData[index],
              [field]: value,
            }
          }

          return {
            ...prev,
            [tableCode]: newData,
          }
        })

        // Sync related fields in prodiData
        syncRelatedFields(prodiData, setProdiData)
      } else if (isPolbanData) {
        setPolbanData((prev) => {
          const newData = [...(prev[tableCode] || [])]
          const index = newData.findIndex((item) => item.key === key)

          if (index > -1) {
            newData[index] = {
              ...newData[index],
              [field]: value,
            }
          }

          return {
            ...prev,
            [tableCode]: newData,
          }
        })

        // Sync related fields in polbanData
        syncRelatedFields(polbanData, setPolbanData)
      }

      // Update the main tableData
      setTableData((prev) => {
        const newData = [...(prev[tableCode] || [])]
        const index = newData.findIndex((item) => item.key === key)

        if (index > -1) {
          const updatedRow = {
            ...newData[index],
            [field]: value,
          }

          // Sync boolean flags with text fields for Tridharma sections
          if (isTridharmaSection(sectionCode)) {
            if (field === "tingkat_internasional") {
              updatedRow.internasional = !!value && value !== ""
            } else if (field === "tingkat_nasional") {
              updatedRow.nasional = !!value && value !== ""
            } else if (field === "tingkat_lokal_wilayah") {
              updatedRow.lokal = !!value && value !== ""
            }
          }

          newData[index] = updatedRow
        }

        return {
          ...prev,
          [tableCode]: newData,
        }
      })
    },
    [prodiData, polbanData, sectionCode]
  )

  /**
   * Create a debounced version of handleDataChange
   */
  const debouncedHandleDataChange = useCallback(
    (tableCode, key, field, value) => {
      // Add a small delay for better performance with rapid changes
      setTimeout(() => {
        handleDataChange(tableCode, key, field, value)
      }, 300)
    },
    [handleDataChange]
  )

  /**
   * Toggle selection of an item from Polban data
   */
  const handleToggleSelection = useCallback(
    (tableCode, rowKey) => {
      // Skip if selection is not allowed for current section
      if (!isSelectionAllowedForSection(sectionCode)) {
        message.info("Data selection feature is not available for this section")
        return
      }

      const currentPolbanData = polbanData[tableCode] || []
      const currentTableData = tableData[tableCode] || []

      // Update selected state in polban data
      const updatedPolbanData = currentPolbanData.map((row) =>
        row.key === rowKey ? { ...row, selected: !row.selected } : row
      )

      setPolbanData((prev) => ({
        ...prev,
        [tableCode]: updatedPolbanData,
      }))

      const toggledRow = updatedPolbanData.find((row) => row.key === rowKey)

      // Update tableData based on selection status
      setTableData((prev) => {
        if (toggledRow.selected) {
          const rowExists = currentTableData.some((row) => row.key === rowKey)
          if (!rowExists) {
            return {
              ...prev,
              [tableCode]: [...currentTableData, toggledRow],
            }
          }
        } else {
          return {
            ...prev,
            [tableCode]: currentTableData.filter((row) => row.key !== rowKey),
          }
        }
        return prev
      })
    },
    [polbanData, tableData, sectionCode]
  )

  /**
   * Toggle selection mode for a table
   */
  const toggleSelectionMode = useCallback(
    (tableCode) => {
      // Only allow toggling selection mode for specific sections
      if (isSelectionAllowedForSection(sectionCode)) {
        setShowSelectionMode((prev) => ({
          ...prev,
          [tableCode]: !prev[tableCode],
        }))
      } else {
        message.info("Data selection feature is not available for this section")
      }
    },
    [sectionCode]
  )

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

  return {
    tableData,
    setTableData,
    prodiData,
    setProdiData,
    polbanData,
    setPolbanData,
    isUploaded,
    setIsUploaded,
    showSelectionMode,
    setShowSelectionMode,
    editingKey,
    setEditingKey,
    initializeTableData,
    updateTableData,
    handleDataChange,
    debouncedHandleDataChange,
    handleToggleSelection,
    toggleSelectionMode,
    handleAddRow,
  }
}

export default useTableManager
