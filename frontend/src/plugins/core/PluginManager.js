import { pluginRegistry } from "./PluginRegistry.js"
import { PluginFactory } from "./PluginFactory.js"

export class PluginManager {
  constructor() {
    this.registry = pluginRegistry
    this.factory = new PluginFactory()
  }

  async registerPlugin(code, pluginOrType, config = {}) {
    try {
      let plugin

      if (typeof pluginOrType === "string") {
        plugin = await this.factory.create(pluginOrType, config)
      } else {
        plugin = pluginOrType
      }

      this.registry.register(code, plugin)
      return plugin
    } catch (error) {
      console.error(`Failed to register plugin ${code}:`, error)
      throw error
    }
  }

  getPlugin(code) {
    return this.registry.get(code)
  }

  async processData(code, workbook, tableCode, config, prodiName) {
    const plugin = this.getPlugin(code)
    return await plugin.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      code
    )
  }

  async calculateScore(code, data, config, additionalData) {
    const plugin = this.getPlugin(code)
    return await plugin.calculateScore(data, config, additionalData)
  }

  getAllPlugins() {
    return this.registry.getAll()
  }
}

export const pluginManager = new PluginManager()
