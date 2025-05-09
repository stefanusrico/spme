import { useCallback } from "react"
import { message } from "antd"
import * as XLSX from "xlsx"
import { isSelectionAllowedForTable } from "../constants/tableStructure"

export const useFileUpload = (
  tableCode,
  prodiName,
  config,
  configRef,
  tableData,
  setTableData,
  setSelectionData,
  setIsUploaded,
  setShowSelectionMode,
  setAllExcelData,
  calculateScoreData,
  plugin
) => {
  const handleUpload = useCallback(
    (info, tableCode) => {
      if (!plugin) {
        message.error("Plugin not available")
        return
      }

      const file = info.file
      console.log("Uploading file:", file.name, "for table:", tableCode)

      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          console.log("File loaded, parsing Excel...")
          const workbook = XLSX.read(e.target.result, { type: "array" })
          console.log("Excel workbook parsed, sheets:", workbook.SheetNames)

          // Extract raw sheet data for logging
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const rawData = XLSX.utils.sheet_to_json(worksheet)

          console.log("===== RAW EXCEL DATA (ROW BY ROW) =====")
          rawData.forEach((row, index) => {
            console.log(`Row ${index + 1} JSON:`, JSON.stringify(row, null, 2))
          })
          console.log("=======================================")

          console.log("Processing Excel data using plugin...")

          // Use plugin to process Excel data
          const result = await plugin.processExcelData(
            workbook,
            tableCode,
            config,
            prodiName,
            tableCode
          )

          // Extract data and check if we should replace existing data
          const { allRows, shouldReplaceExisting = false } = result || {
            allRows: [],
          }

          // Log important debug information
          console.log("===== REPLACEMENT DEBUG INFO =====")
          console.log("Table code:", tableCode)
          console.log("Table code:", tableCode)
          console.log("shouldReplaceExisting:", shouldReplaceExisting)
          console.log(
            "Selection allowed:",
            isSelectionAllowedForTable(tableCode)
          )
          console.log("Rows count:", allRows.length)
          console.log("================================")

          // Log processed data
          console.log("===== PROCESSED DATA =====")
          console.log(`Processed ${allRows.length} rows`)
          if (allRows.length > 0) {
            console.log(
              "First row sample:",
              JSON.stringify(allRows[0], null, 2)
            )
            allRows.forEach((row, index) => {
              console.log(`Row ${index + 1}:`, row)
            })
          }
          console.log("===========================")

          // Update state with new data
          setAllExcelData((prev) => ({
            ...prev,
            [tableCode]: allRows,
          }))

          // For tables with selection allowed, separate data into tableData and selectionData
          if (isSelectionAllowedForTable(tableCode)) {
            if (shouldReplaceExisting) {
              // Create modified rows with selected=true
              const modifiedRows = allRows.map((row) => ({
                ...row,
                selected: true, // Mark all as selected
                _replacementFlag: true, // Add a flag to identify replaced data
              }))

              console.log("Replacing tableData with:", modifiedRows)

              // Replace existing table data completely
              setTableData((prev) => {
                const result = {
                  ...prev,
                  [tableCode]: modifiedRows,
                }
                console.log("New tableData state:", result[tableCode])
                return result
              })

              // Clear selection data
              setSelectionData((prev) => ({
                ...prev,
                [tableCode]: [],
              }))

              // Force selection mode off
              setShowSelectionMode((prev) => ({
                ...prev,
                [tableCode]: false,
              }))

              message.success(
                `Data successfully replaced with ${allRows.length} rows! Don't forget to save to calculate score.`
              )
            } else {
              // Place all new data from Excel into selectionData (traditional behavior)
              setSelectionData((prev) => ({
                ...prev,
                [tableCode]: allRows.map((row) => ({
                  ...row,
                  selected: false, // Ensure all rows are initially unselected
                })),
              }))

              // Show selection mode if we have data to select
              if (allRows.length > 0) {
                setShowSelectionMode((prev) => ({
                  ...prev,
                  [tableCode]: true,
                }))
                message.info(
                  `${allRows.length} rows of data available for selection`
                )
              }
            }
          } else {
            // For non-selectable tables, add all data directly to tableData
            if (shouldReplaceExisting) {
              // Replace existing data
              setTableData((prev) => ({
                ...prev,
                [tableCode]: allRows.map((row) => ({
                  ...row,
                  selected: true,
                })),
              }))
            } else {
              // Add to existing data
              setTableData((prev) => {
                const currentTableData = prev[tableCode] || []
                return {
                  ...prev,
                  [tableCode]: [
                    ...currentTableData,
                    ...allRows.map((row) => ({
                      ...row,
                      selected: true, // Mark all as selected for non-selection tables
                    })),
                  ],
                }
              })
            }

            // No selection data for non-selectable tables
            setSelectionData((prev) => ({
              ...prev,
              [tableCode]: [],
            }))
          }

          setIsUploaded((prev) => ({
            ...prev,
            [tableCode]: true,
          }))

          if (!shouldReplaceExisting) {
            message.success(
              `File uploaded successfully with ${allRows.length} rows of data! Don't forget to save to calculate score.`
            )
          }

          // Validate data if plugin provides validation function
          if (plugin.validateData) {
            // Validate the newly processed data
            const dataToValidate = isSelectionAllowedForTable(tableCode)
              ? shouldReplaceExisting
                ? allRows.map((row) => ({ ...row, selected: true }))
                : [] // For selection tables with no replace, initially there's no selected data
              : allRows.map((row) => ({ ...row, selected: true }))

            const { valid, errors } = plugin.validateData(dataToValidate)

            if (!valid && errors.length > 0) {
              message.warning("Data uploaded with validation warnings:")
              errors.forEach((error) => {
                message.warning(error)
              })
            }
          }
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
      setTableData,
      setSelectionData,
      setIsUploaded,
      setShowSelectionMode,
      setAllExcelData,
      tableCode,
      prodiName,
      configRef,
      plugin,
      tableData,
    ]
  )

  return { handleUpload }
}
