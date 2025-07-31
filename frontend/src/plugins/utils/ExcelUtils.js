import { utils } from "xlsx"
import { processExcelDataBase } from "../../utils/tableUtils.js"
import { PluginUtils } from "./PluginUtils.js"

// --- START: NEW FUNCTION TO PROCESS MULTIPLE TABLES ---
/**
 * Processes a worksheet, detects multiple tables, maps the data, and returns it.
 * @param {object} worksheet - The worksheet object.
 * @param {object} config - The table configuration.
 * @param {string} tableCode - The code for the current table section.
 * @param {Array<string>} allUniqueHeaders - A flat array of all unique headers found.
 * @param {object} plugin - The plugin instance for the current table.
 * @param {Array<Array<string>>} allHeaderArrays - An array of header arrays for each detected table.
 * @param {string} prodiName - The name of the study program.
 * @returns {Promise<{mappedData: Array<object>, selectionData: Array<object>}>}
 */
export const processAndMapData = async (
  worksheet,
  config,
  tableCode,
  allUniqueHeaders,
  plugin,
  allHeaderArrays,
  prodiName
) => {
  if (!plugin || typeof plugin.getFieldMapping !== "function") {
    throw new Error("Invalid plugin or getFieldMapping method is missing.")
  }

  const fieldMapping = plugin.getFieldMapping(tableCode)
  if (!fieldMapping) {
    throw new Error(`No field mapping found for table code: ${tableCode}`)
  }

  const expectedFields = Object.keys(fieldMapping)
  const detectedIndices = ExcelUtils.detectColumnIndices(
    allUniqueHeaders,
    expectedFields
  )
  console.log("Detected Column Indices:", detectedIndices)

  const mappedData = []
  const selectionData = []

  const rows = utils.sheet_to_json(worksheet, { header: 1 })

  allHeaderArrays.forEach((headerArray, tableIndex) => {
    // Find the starting row index of this specific table's data
    const headerRowIndex = rows.findIndex(
      (row) =>
        JSON.stringify(row.map((cell) => String(cell || "").trim())) ===
        JSON.stringify(headerArray.map((cell) => String(cell || "").trim()))
    )

    if (headerRowIndex === -1) {
      console.warn(
        `Could not find header row for table ${tableIndex + 1}. Skipping.`
      )
      return
    }

    let dataRowIndex = headerRowIndex + 1
    while (
      dataRowIndex < rows.length &&
      rows[dataRowIndex].some(
        (cell) => cell !== null && String(cell).trim() !== ""
      )
    ) {
      const row = rows[dataRowIndex]
      const mappedObject = ExcelUtils.mapRowToObject(
        row,
        detectedIndices,
        fieldMapping
      )

      // Determine if the data should go to selection or main data table
      if (isSelectionAllowedForTable(tableCode)) {
        selectionData.push(mappedObject)
      } else {
        mappedData.push(mappedObject)
      }
      dataRowIndex++
    }
  })

  console.log(`Final Mapped Data (${mappedData.length} rows):`, mappedData)
  console.log(
    `Final Selection Data (${selectionData.length} rows):`,
    selectionData
  )

  return { mappedData, selectionData }
}
// --- END: NEW FUNCTION ---

// --- EXISTING CODE (UNCHANGED) ---
export const ExcelUtils = {
  /**
   * Process Excel dengan filtering otomatis
   */
  async processExcel(workbook, tableCode, config, prodiName) {
    const result = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (!result.rawData?.length) {
      return { allRows: [], detectedIndices: {} }
    }

    // Auto filter invalid rows
    const filteredData = PluginUtils.filterDataRows(result.rawData)

    return {
      ...result,
      filteredData,
      originalRowCount: result.rawData.length,
      filteredRowCount: filteredData.length,
    }
  },

  /**
   * Map Excel row to object based on field mapping
   */
  mapRowToObject(row, detectedIndices, fieldMapping) {
    const obj = {}

    Object.entries(fieldMapping).forEach(([fieldName, config]) => {
      const colIndex = detectedIndices[fieldName]

      // Use a default value if the column wasn't found in the Excel sheet
      if (colIndex === undefined || colIndex < 0) {
        obj[fieldName] =
          config.defaultValue !== undefined ? config.defaultValue : ""
        return
      }

      const rawValue = row[colIndex]

      // Apply processor if it exists
      if (config.processor) {
        obj[fieldName] = config.processor(rawValue)
      } else {
        // Default processing based on type
        switch (config.type) {
          case "number":
            obj[fieldName] = PluginUtils.parseNumber(
              rawValue,
              config.defaultValue || 0
            )
            break
          case "boolean":
            obj[fieldName] = PluginUtils.parseBoolean(rawValue)
            break
          case "year":
            obj[fieldName] = PluginUtils.parseYear(rawValue)
            break
          default:
            obj[fieldName] = PluginUtils.normalizeTextField(rawValue)
        }
      }
    })

    return obj
  },

  /**
   * Auto-detect column indices with fuzzy matching
   */
  detectColumnIndices(headers, expectedFields) {
    const indices = {}
    const headersLower = headers.map((h) => (h ? h.toLowerCase().trim() : null))

    expectedFields.forEach((field) => {
      const fieldLower = field.toLowerCase().replace(/_/g, " ")

      let bestMatchIndex = -1
      let bestMatchScore = 0

      headersLower.forEach((header, index) => {
        if (!header) return

        // Exact match is the best
        if (header === fieldLower) {
          if (bestMatchScore < 1) {
            bestMatchIndex = index
            bestMatchScore = 1
          }
          return
        }

        // Partial match (contains) is a good fallback
        if (header.includes(fieldLower) || fieldLower.includes(header)) {
          if (bestMatchScore < 0.5) {
            bestMatchIndex = index
            bestMatchScore = 0.5
          }
        }
      })

      if (bestMatchIndex !== -1) {
        indices[field] = bestMatchIndex
      }
    })

    return indices
  },
}

export default ExcelUtils
