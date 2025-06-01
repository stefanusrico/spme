import { BasePlugin } from "../core/BasePlugin.js"
import { ExcelUtils } from "../utils/ExcelUtils.js"
import { PluginUtils } from "../utils/PluginUtils.js"

/**
 * Generic plugin untuk tabel-tabel standar
 * Cocok untuk tabel yang tidak memerlukan logic khusus
 */
export class GenericTablePlugin extends BasePlugin {
  constructor(pluginInfo, columns, validationRules = []) {
    super(pluginInfo)
    this.columns = columns
    this.validationRules = validationRules
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { filteredData, detectedIndices } = await ExcelUtils.processExcel(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (!filteredData.length) return { allRows: [] }

    // Convert columns array to field mapping format
    const fieldMapping = this.columnsToFieldMapping()

    const processedData = filteredData.map((row, index) => ({
      key: `${this.info.code}-${index + 1}-${Date.now()}`,
      no: index + 1,
      selected: true,
      ...ExcelUtils.mapRowToObject(row, detectedIndices, fieldMapping),
    }))

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  columnsToFieldMapping() {
    const mapping = {}

    this.columns.forEach((column) => {
      mapping[column.field] = {
        type: column.type || "text",
        processor: column.processor,
        defaultValue: column.defaultValue,
        required: column.required,
      }
    })

    return mapping
  }

  getDefaultData() {
    const defaultData = {}

    this.columns.forEach((column) => {
      defaultData[column.field] =
        column.defaultValue || (column.type === "number" ? 0 : "")
    })

    return defaultData
  }

  validateData = PluginUtils.createValidator(this.validationRules)

  normalizeData(data) {
    return data.map((item) => {
      const normalized = { ...item }

      this.columns.forEach((column) => {
        if (normalized[column.field] !== undefined) {
          normalized[column.field] = PluginUtils.normalizeTextField(
            normalized[column.field]
          )
        }
      })

      return normalized
    })
  }
}
