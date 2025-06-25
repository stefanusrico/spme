import { processExcelDataBase } from "../../utils/tableUtils.js"
import { PluginUtils } from "../utils/PluginUtils.js"

export class BasePlugin {
  constructor(pluginInfo) {
    if (!pluginInfo.code || !pluginInfo.name) {
      throw new Error("Plugin must have code and name")
    }
    this.info = pluginInfo
  }

  getInfo() {
    return this.info
  }

  configureSection(config) {
    return config
  }

  hasDefaultData() {
    return false
  }

  getDefaultData(tableCode, config = {}) {
    return []
  }

  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    if (!existingData || existingData.length === 0) {
      return defaultData
    }

    return existingData
  }

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config?.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (existingData?.[tableCode]?.length > 0) {
          initialTableData[tableCode] = this.mergeWithDefaults(
            existingData[tableCode],
            tableCode,
            { config, prodiName, sectionCode }
          )
        } else if (this.hasDefaultData()) {
          initialTableData[tableCode] = this.getDefaultData(tableCode, {
            config,
            prodiName,
            sectionCode,
          })
        } else {
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  }

  // ✅ NEW: Dynamic field processing based on AI mapping
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (value === undefined || value === null) {
      return fieldType === "number" ? 0 : ""
    }

    // Auto-detect field type if not specified
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    switch (fieldType) {
      case "number":
        return PluginUtils.parseNumber(value, 0)
      case "formatted_number":
        const numValue = PluginUtils.parseNumber(value, 0)
        return parseFloat(PluginUtils.formatNumber(numValue, 2))
      case "boolean":
        return PluginUtils.parseBoolean(value)
      case "text":
      default:
        return PluginUtils.normalizeTextField(value)
    }
  }

  // ✅ NEW: Detect field type based on field name patterns
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Number patterns
    if (
      fieldLower.includes("jumlah") ||
      fieldLower.includes("total") ||
      fieldLower.includes("daya_tampung") ||
      fieldLower.includes("sks") ||
      fieldLower.includes("bobot") ||
      fieldLower.includes("nilai") ||
      fieldLower.includes("poin") ||
      fieldLower.includes("skor") ||
      /^\d+$/.test(String(value))
    ) {
      return "number"
    }

    // Formatted number patterns (for percentages, ratios, etc.)
    if (
      fieldLower.includes("rata") ||
      fieldLower.includes("persentase") ||
      fieldLower.includes("rasio") ||
      fieldLower.includes("indeks")
    ) {
      return "formatted_number"
    }

    // Boolean patterns
    if (
      fieldLower.includes("kesesuaian") ||
      fieldLower.includes("sesuai") ||
      fieldLower.includes("valid") ||
      fieldLower.includes("aktif") ||
      fieldLower.includes("status")
    ) {
      return "boolean"
    }

    // Default to text
    return "text"
  }

  // ✅ NEW: Process row data dynamically based on detected indices
  processRowData(row, detectedIndices, additionalFields = {}) {
    const processedItem = {
      key: `${this.info.code}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      selected: true,
      ...additionalFields,
    }

    // Process each detected field dynamically
    Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
      if (colIndex === undefined || colIndex < 0) return

      const value = row[colIndex]
      processedItem[fieldName] = this.processFieldValue(fieldName, value)
    })

    return processedItem
  }

  // ✅ UPDATED: Generic Excel processing
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = PluginUtils.filterDataRows(rawData)

    const processedData = filteredData.map((row, index) =>
      this.processRowData(row, detectedIndices, { no: index + 1 })
    )

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  getCalculatedFields() {
    return {}
  }

  getReadOnlyFields() {
    return Object.keys(this.getCalculatedFields())
  }

  normalizeData(data) {
    return data
  }

  validateData(data) {
    return { valid: true, errors: [] }
  }

  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: new Date().getTime(),
      selected: item.selected !== false,
    }))
  }
}
