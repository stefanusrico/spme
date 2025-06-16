import { BasePlugin } from "../core/BasePlugin.js"
import { PluginUtils } from "../utils/PluginUtils.js"
import { ExcelUtils } from "../utils/ExcelUtils.js"


export class DosenPluginBase extends BasePlugin {
  constructor(pluginInfo, fieldMapping) {
    super(pluginInfo)
    this.fieldMapping = fieldMapping
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { filteredData, detectedIndices } = await ExcelUtils.processExcel(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (!filteredData.length) return { allRows: [] }

    const processedData = filteredData.map((row, index) => ({
      key: `${this.info.code}-${index + 1}-${Date.now()}`,
      no: index + 1,
      selected: true,
      ...ExcelUtils.mapRowToObject(row, detectedIndices, this.fieldMapping),
    }))

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  // Common method untuk hitung dosen dengan kriteria tertentu
  countDosenByCriteria(data, criteria) {
    return data.filter((dosen) => {
      // Skip if no NIDN
      if (!dosen.nidn_nidk?.trim()) return false

      // Check all criteria
      return Object.entries(criteria).every(([field, expectedValue]) => {
        const actualValue = dosen[field]

        if (typeof expectedValue === "function") {
          return expectedValue(actualValue)
        }

        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue)
        }

        return actualValue === expectedValue
      })
    }).length
  }

  // Check kesesuaian kompetensi
  hasKesesuaian(value) {
    return ["V", "v", "√", "✓", "Ya", "ya"].includes(String(value).trim())
  }

  normalizeData(data) {
    return data.map((item) => {
      const normalized = { ...item }

      Object.keys(this.fieldMapping).forEach((field) => {
        normalized[field] = PluginUtils.normalizeTextField(normalized[field])
      })

      return normalized
    })
  }
}
