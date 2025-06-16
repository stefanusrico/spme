import { useState, useCallback } from "react"
import { message } from "antd"
import { isSelectionAllowedForTable } from "../constants/tableStructure"

/**
 * Custom hook for managing selection mode for tables
 * @param {string} tableCode - Current table code
 * @param {object} polbanData - Polban data for all tables
 * @param {object} prodiData - Prodi data for all tables
 * @param {object} tableData - Combined table data
 * @param {function} setPolbanData - Function to update polban data
 * @param {function} setTableData - Function to update table data
 * @param {function} calculateScoreData - Function to calculate score
 * @param {object} configRef - Reference to the current configuration
 * @returns {object} Selection state and functions
 */
const useSelectionMode = (
  tableCode,
  polbanData,
  prodiData,
  tableData,
  setPolbanData,
  setTableData,
  calculateScoreData,
  configRef
) => {
  const [showSelectionMode, setShowSelectionMode] = useState({})
  const [dataFilter, setDataFilter] = useState("all")

  /**
   * Toggle selection mode for a table
   */
  const toggleSelectionMode = useCallback(
    (tableCode) => {
      // Only allow toggling selection mode for specific tables
      if (isSelectionAllowedForTable(tableCode)) {
        setShowSelectionMode((prev) => ({
          ...prev,
          [tableCode]: !prev[tableCode],
        }))
      } else {
        message.info("Data selection feature is not available for this table")
      }
    },
    [tableCode]
  )

  /**
   * Handle data filter change
   */
  const handleFilterChange = useCallback((e) => {
    setDataFilter(e.target.value)
  }, [])

  /**
   * Toggle selection of an item from Polban data
   */
  const handleToggleSelection = useCallback(
    (tableCode, rowKey) => {
      // Skip if selection is not allowed for current table
      if (!isSelectionAllowedForTable(tableCode)) {
        message.info("Data selection feature is not available for this table")
        return
      }

      const currentPolbanData = polbanData[tableCode] || []
      const currentProdiData = prodiData[tableCode] || []
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

      // Recalculate score after selection changes
      setTimeout(() => {
        if (configRef.current?.formula) {
          const combinedData = [
            ...currentProdiData,
            ...updatedPolbanData.filter((row) => row.selected),
          ]
          calculateScoreData(combinedData)
        }
      }, 0)
    },
    [
      polbanData,
      prodiData,
      tableData,
      tableCode,
      calculateScoreData,
      setPolbanData,
      setTableData,
      configRef,
    ]
  )

  return {
    showSelectionMode,
    setShowSelectionMode,
    dataFilter,
    setDataFilter,
    toggleSelectionMode,
    handleFilterChange,
    handleToggleSelection,
  }
}

export default useSelectionMode
