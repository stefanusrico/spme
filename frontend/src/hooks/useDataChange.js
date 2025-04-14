import { useCallback } from "react"
import { isTridharmaSection } from "../utils/tridharmaUtils"

/**
 * Custom hook for handling data changes in tables
 * @param {string} sectionCode - Current section code
 * @param {object} prodiData - Prodi data
 * @param {object} polbanData - Polban data
 * @param {function} setProdiData - Function to update prodi data
 * @param {function} setPolbanData - Function to update polban data
 * @param {function} setTableData - Function to update table data
 * @param {function} calculateScoreData - Function to calculate score
 * @param {object} configRef - Reference to configuration
 * @returns {object} Data change handler functions
 */
const useDataChange = (
  sectionCode,
  prodiData,
  polbanData,
  setProdiData,
  setPolbanData,
  setTableData,
  calculateScoreData,
  configRef
) => {
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

        const updatedData = {
          ...prev,
          [tableCode]: newData,
        }

        // Recalculate score with updated data if needed
        setTimeout(() => {
          if (
            configRef.current?.formula &&
            configRef.current.tables.some(
              (t) =>
                (typeof t === "string" && t === tableCode) ||
                (t && t.code === tableCode && t.used_in_formula)
            )
          ) {
            calculateScoreData(updatedData[tableCode])
          }
        }, 300)

        return updatedData
      })
    },
    [
      prodiData,
      polbanData,
      calculateScoreData,
      sectionCode,
      setProdiData,
      setPolbanData,
      setTableData,
      configRef,
    ]
  )

  // Create a debounced version of handleDataChange
  const debouncedHandleDataChange = useCallback(
    (tableCode, key, field, value) => {
      // Add a small delay for better performance with rapid changes
      setTimeout(() => {
        handleDataChange(tableCode, key, field, value)
      }, 300)
    },
    [handleDataChange]
  )

  return { handleDataChange, debouncedHandleDataChange }
}

export default useDataChange
