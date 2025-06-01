import { processExcelDataBase } from "../../utils/tableUtils.js"
import { PluginUtils } from "./PluginUtils.js"

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

      if (colIndex === undefined || colIndex < 0) {
        obj[fieldName] = config.defaultValue || ""
        return
      }

      const rawValue = row[colIndex]

      // Apply processor if exists
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

    expectedFields.forEach((field) => {
      const fieldLower = field.toLowerCase().replace(/_/g, " ")

      headers.forEach((header, index) => {
        if (!header) return

        const headerLower = header.toLowerCase().trim()

        // Exact match
        if (headerLower === fieldLower) {
          indices[field] = index
          return
        }

        // Partial match
        if (
          headerLower.includes(fieldLower) ||
          fieldLower.includes(headerLower)
        ) {
          indices[field] = index
        }
      })
    })

    return indices
  },
}
