import { useCallback, useState } from "react"
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
  const [programSelectorState, setProgramSelectorState] = useState({
    visible: false,
    availablePrograms: [],
    pendingWorkbook: null,
    pendingTableCode: null,
  })

  const processPendingUpload = useCallback(
    async (selectedProgram) => {
      console.log("🔄 Processing pending upload for program:", selectedProgram)

      if (!programSelectorState.pendingWorkbook) {
        console.error("❌ No pending workbook found")
        return
      }

      try {
        console.log("🔧 Processing Excel data for program:", selectedProgram)

        // **FIX**: Pass selectedProgram to processExcelData
        const result = await plugin.processExcelData(
          programSelectorState.pendingWorkbook,
          programSelectorState.pendingTableCode || tableCode,
          config,
          prodiName,
          "",
          selectedProgram // **NEW**: Pass the selected program
        )

        console.log("🎯 Plugin processing result:", result)

        if (result.allRows && result.allRows.length > 0) {
          const tableCodeToUpdate =
            programSelectorState.pendingTableCode || tableCode

          console.log(
            `📊 Setting table data for ${tableCodeToUpdate}:`,
            result.allRows.length,
            "rows"
          )

          setAllExcelData((prev) => ({
            ...prev,
            [tableCodeToUpdate]: result.allRows,
          }))

          if (result.shouldReplaceExisting) {
            setTableData((prev) => ({
              ...prev,
              [tableCodeToUpdate]: result.allRows,
            }))
          } else {
            setSelectionData((prev) => ({
              ...prev,
              [tableCodeToUpdate]: result.allRows,
            }))
            setShowSelectionMode((prev) => ({
              ...prev,
              [tableCodeToUpdate]: true,
            }))
          }

          setIsUploaded((prev) => ({
            ...prev,
            [tableCodeToUpdate]: true,
          }))

          calculateScoreData()

          console.log(
            "✅ Upload completed successfully for program:",
            selectedProgram
          )
          message.success(`Data ${selectedProgram} berhasil dimuat!`)
        } else {
          console.warn("⚠️ No data found in result")
          message.warning("Tidak ada data yang ditemukan dalam file Excel")
        }
      } catch (error) {
        console.error("❌ Error processing Excel data:", error)
        message.error(`Error processing Excel data: ${error.message}`)
      } finally {
        // Close program selector
        setProgramSelectorState({
          visible: false,
          availablePrograms: [],
          pendingWorkbook: null,
          pendingTableCode: null,
        })
      }
    },
    [
      programSelectorState,
      plugin,
      config,
      prodiName,
      setAllExcelData,
      setTableData,
      setSelectionData,
      setShowSelectionMode,
      setIsUploaded,
      setProgramSelectorState,
      tableCode,
      calculateScoreData,
    ]
  )

  const handleUpload = useCallback(
    (info, tableCode) => {
      console.log("🚀 Upload started:", { fileName: info.file.name, tableCode })

      if (!plugin) {
        console.error("❌ Plugin not available")
        message.error("Plugin not available")
        return
      }

      const file = info.file
      console.log("📁 Processing file:", file.name, "for table:", tableCode)

      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          console.log("📖 File loaded, parsing Excel...")
          const workbook = XLSX.read(e.target.result, { type: "array" })
          console.log("📊 Excel workbook parsed, sheets:", workbook.SheetNames)

          console.log("🔧 Processing Excel data using plugin...")

          // Process Excel data without selected program first
          const result = await plugin.processExcelData(
            workbook,
            tableCode,
            config,
            prodiName,
            tableCode
            // Don't pass selectedProgram initially
          )

          console.log("🎯 Plugin processing result:", result)
          console.log(
            "🔍 Checking requiresProgramSelection:",
            result?.requiresProgramSelection
          )

          // **FIX**: Add more detailed logging and check
          if (result && result.requiresProgramSelection === true) {
            console.log(
              "🔔 Multiple programs detected, showing program selector"
            )
            console.log("📋 Available programs:", result.availablePrograms)

            if (
              !result.availablePrograms ||
              result.availablePrograms.length === 0
            ) {
              console.warn("⚠️ No available programs in result")
              message.error(
                "Multiple programs detected but no program list available"
              )
              return
            }

            setProgramSelectorState({
              visible: true,
              availablePrograms: result.availablePrograms,
              pendingWorkbook: workbook,
              pendingTableCode: tableCode,
            })

            message.info(
              `Multiple programs detected (${result.availablePrograms.length} programs). Please select which program to import.`
            )
            return
          }

          // **FIX**: Add explicit check for single table
          if (
            !result ||
            (!result.requiresProgramSelection &&
              (!result.allRows || result.allRows.length === 0))
          ) {
            console.warn("⚠️ No data returned from plugin processing")
            message.warning("No data found in the uploaded file")
            return
          }

          console.log("📄 Single table processing...")

          // Single table - process normally
          const { allRows = [], shouldReplaceExisting = false } = result || {}

          console.log("===== PROCESSED DATA =====")
          console.log(`Processed ${allRows.length} rows`)
          if (allRows.length > 0) {
            console.log(
              "First row sample:",
              JSON.stringify(allRows[0], null, 2)
            )
          }
          console.log("===========================")

          // Update state with new data (existing logic)
          setAllExcelData((prev) => ({
            ...prev,
            [tableCode]: allRows,
          }))

          // Handle table data updates (existing logic)
          if (isSelectionAllowedForTable(tableCode)) {
            if (shouldReplaceExisting) {
              const modifiedRows = allRows.map((row) => ({
                ...row,
                selected: true,
                _replacementFlag: true,
              }))

              setTableData((prev) => ({
                ...prev,
                [tableCode]: modifiedRows,
              }))

              setSelectionData((prev) => ({
                ...prev,
                [tableCode]: [],
              }))

              setShowSelectionMode((prev) => ({
                ...prev,
                [tableCode]: false,
              }))

              message.success(
                `Data successfully replaced with ${allRows.length} rows! Don't forget to save to calculate score.`
              )
            } else {
              setSelectionData((prev) => ({
                ...prev,
                [tableCode]: allRows.map((row) => ({
                  ...row,
                  selected: false,
                })),
              }))

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
            // Non-selectable tables (existing logic)
            if (shouldReplaceExisting) {
              setTableData((prev) => ({
                ...prev,
                [tableCode]: allRows.map((row) => ({
                  ...row,
                  selected: true,
                })),
              }))
            } else {
              setTableData((prev) => {
                const currentTableData = prev[tableCode] || []
                return {
                  ...prev,
                  [tableCode]: [
                    ...currentTableData,
                    ...allRows.map((row) => ({
                      ...row,
                      selected: true,
                    })),
                  ],
                }
              })
            }

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
        } catch (error) {
          console.error("Error processing uploaded file:", error)
          message.error(
            "Invalid file format: " + (error.message || "An error occurred")
          )
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
      plugin,
    ]
  )

  return {
    handleUpload,
    programSelectorState,
    setProgramSelectorState,
    processPendingUpload,
  }
}
