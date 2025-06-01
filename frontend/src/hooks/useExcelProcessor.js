import { useCallback } from "react"
import { message } from "antd"
import * as XLSX from "xlsx"
import { processExcelData } from "../utils/tableUtils"
import { normalizeDataConsistency } from "../utils/tridharmaUtils"
import { isSelectionAllowedForSection } from "../constants/sectionStructure"

/**
 * Custom hook for processing Excel uploads
 */
const useExcelProcessor = (
  config,
  sectionCode,
  tableData,
  setTableData,
  prodiData,
  setProdiData,
  polbanData,
  setPolbanData,
  setIsUploaded,
  setShowSelectionMode,
  calculateScore,
  prodiName
) => {
  /**
   * Handle file upload for a table
   */
  const handleUpload = useCallback(
    (info, tableCode) => {
      const file = info.file
      console.log("Uploading file:", file.name, "for table:", tableCode)

      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          console.log("File loaded, parsing Excel...")
          const workbook = XLSX.read(e.target.result, { type: "array" })
          console.log("Excel workbook parsed, sheets:", workbook.SheetNames)

          console.log("Processing Excel data...")
          const { allRows, prodiRows, polbanRows } = await processExcelData(
            workbook,
            tableCode,
            config,
            prodiName,
            sectionCode
          )

          // Normalize data to ensure boolean flags match tingkat_* fields
          const normalizedProdiRows = normalizeDataConsistency(prodiRows)
          const normalizedPolbanRows = normalizeDataConsistency(polbanRows)

          // Process polban data with selection status
          const currentPolbanData = polbanData[tableCode] || []
          const currentlySelectedPolbanItems = currentPolbanData.filter(
            (item) => item.selected
          )

          const mergedPolbanData = normalizedPolbanRows.map((newRow) => {
            const existingRow = currentlySelectedPolbanItems.find(
              (existingItem) =>
                existingItem.lembagamitra === newRow.lembagamitra &&
                existingItem.judulkegiatankerjasama ===
                  newRow.judulkegiatankerjasama
            )

            if (existingRow) {
              return {
                ...newRow,
                selected: true,
              }
            }

            return newRow
          })

          // Update prodiData state
          setProdiData((prev) => {
            const currentProdiData = prev[tableCode] || []

            const newProdiRows = normalizedProdiRows.filter((newRow) => {
              return !currentProdiData.some(
                (existingRow) =>
                  existingRow.lembagamitra === newRow.lembagamitra &&
                  existingRow.judulkegiatankerjasama ===
                    newRow.judulkegiatankerjasama
              )
            })

            return {
              ...prev,
              [tableCode]: [...currentProdiData, ...newProdiRows],
            }
          })

          // Update polbanData state
          setPolbanData((prev) => ({
            ...prev,
            [tableCode]: [...mergedPolbanData],
          }))

          // Update tableData state
          setTableData((prev) => {
            const currentProdiData = prev[tableCode] || []

            const newProdiRows = normalizedProdiRows.filter((newRow) => {
              return !currentProdiData.some(
                (existingRow) =>
                  existingRow.lembagamitra === newRow.lembagamitra &&
                  existingRow.judulkegiatankerjasama ===
                    newRow.judulkegiatankerjasama
              )
            })

            // If selection is allowed for this section, only include selected polban rows
            // Otherwise, include all polban rows automatically
            const polbanRowsToInclude = isSelectionAllowedForSection(
              sectionCode
            )
              ? mergedPolbanData.filter((row) => row.selected)
              : mergedPolbanData.map((row) => ({ ...row, selected: true }))

            const updatedData = {
              ...prev,
              [tableCode]: [
                ...currentProdiData,
                ...newProdiRows,
                ...polbanRowsToInclude,
              ],
            }

            return updatedData
          })

          console.log(`Updated table data for ${tableCode}`)

          // Handle selection UI display
          if (mergedPolbanData.length > 0) {
            // Only show selection UI if selection is allowed for this section
            if (isSelectionAllowedForSection(sectionCode)) {
              setShowSelectionMode((prev) => ({
                ...prev,
                [tableCode]: true,
              }))
              message.info(
                `${mergedPolbanData.length} rows of institution data available for selection`
              )
            } else {
              // For non-selectable sections, automatically mark all as selected
              const allSelectedPolbanData = mergedPolbanData.map((row) => ({
                ...row,
                selected: true,
              }))

              setPolbanData((prev) => ({
                ...prev,
                [tableCode]: allSelectedPolbanData,
              }))
            }
          }

          setIsUploaded((prev) => ({
            ...prev,
            [tableCode]: true,
          }))

          message.success(
            `File uploaded successfully with ${allRows.length} rows of data!`
          )

          // Calculate score after upload if needed
          setTimeout(() => {
            if (
              config?.formula &&
              config.tables.some(
                (t) =>
                  (typeof t === "string" && t === tableCode) ||
                  (t && t.code === tableCode && t.used_in_formula)
              )
            ) {
              console.log("Will calculate score after upload")

              setTableData((prev) => {
                const updatedData = {
                  ...prev,
                  [tableCode]: [
                    ...(prev[tableCode] || []),
                    ...normalizedProdiRows,
                    ...mergedPolbanData.filter((row) => row.selected),
                  ],
                }

                // Calculate score with the updated data
                calculateScore(updatedData[tableCode], sectionCode)

                return updatedData
              })
            }
          }, 200)
        } catch (error) {
          console.error("Error processing uploaded file:", error)
          message.error(
            "Invalid file format: " + (error.message || "An error occurred")
          )
          console.error("Error stack:", error.stack)
        }
      }

      reader.onerror = (error) => {
        console.error("FileReader error:", error)
        message.error(
          "Error reading file: " + (error.message || "An error occurred")
        )
      }

      reader.readAsArrayBuffer(file)
    },
    [
      config,
      sectionCode,
      tableData,
      setTableData,
      prodiData,
      setProdiData,
      polbanData,
      setPolbanData,
      setIsUploaded,
      setShowSelectionMode,
      calculateScore,
      prodiName,
    ]
  )

  return {
    handleUpload,
    processExcelData,
  }
}

export default useExcelProcessor
