import { BasePlugin } from "./core/BasePlugin.js"

export class DefaultSectionPlugin extends BasePlugin {
  constructor() {
    super({
      code: "default",
      name: "Default Section Handler",
      description: "Generic handler for tables without specific plugins",
    })
  }

  processExcelData(excelData, config = {}) {
    console.log(
      `[DefaultPlugin] Processing Excel data: ${excelData?.length || 0} rows`
    )
    return excelData || []
  }

  initializeData(config = {}) {
    return []
  }

  async calculateScore(data, config = {}, additionalData = {}) {
    console.log(
      `[DefaultPlugin] Calculating score for ${data?.length || 0} rows`
    )
    return { scores: [], scoreDetail: {} }
  }

  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data.map((row, index) => ({
      id: row.id || `row-${index}`,
      key: row.key || `row-${index}`,
      ...row,
    }))
  }

  prepareDataForSaving(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data.map((row) => {
      const { id, key, _editing, _selected, ...cleanRow } = row
      return cleanRow
    })
  }

  validateData(row) {
    return { valid: true, errors: {} }
  }

  configureSection(config) {
    return { ...config, isGenericSection: true }
  }
}

// Export default instance
export default new DefaultSectionPlugin()
