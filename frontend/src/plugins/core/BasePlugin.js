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

  /**
   * Check if this plugin should have default data
   * Override in child classes that need default data
   */
  hasDefaultData() {
    return false
  }

  /**
   * Get default data for a specific table
   * Override in child classes to provide default data
   */
  getDefaultData(tableCode, config = {}) {
    return []
  }

  /**
   * Merge default data with existing data
   * Override for custom merge logic
   */
  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    // If no existing data, return defaults
    if (!existingData || existingData.length === 0) {
      return defaultData
    }

    // If has existing data, return as is (child classes can override for merging)
    return existingData
  }

  /**
   * Initialize data with defaults if needed
   * DO NOT OVERRIDE THIS IN CHILD CLASSES
   */
  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config?.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        // Check if we have existing data
        if (existingData?.[tableCode]?.length > 0) {
          // Use merge logic to ensure defaults exist if needed
          initialTableData[tableCode] = this.mergeWithDefaults(
            existingData[tableCode],
            tableCode,
            { config, prodiName, sectionCode }
          )
        }
        // If no existing data and plugin has defaults, use them
        else if (this.hasDefaultData()) {
          initialTableData[tableCode] = this.getDefaultData(tableCode, {
            config,
            prodiName,
            sectionCode,
          })
        }
        // Otherwise empty array
        else {
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  }

  // Other methods remain the same...
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    throw new Error(
      `processExcelData must be implemented by ${this.constructor.name}`
    )
  }

  async calculateScore(data, config, additionalData = {}) {
    throw new Error(
      `calculateScore must be implemented by ${this.constructor.name}`
    )
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
