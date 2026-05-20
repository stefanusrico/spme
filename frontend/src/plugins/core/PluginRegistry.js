export class PluginRegistry {
  constructor() {
    this.registry = new Map()
    this.wildcardRegistry = new Map()
  }

  register(code, plugin) {
    if (!plugin || typeof plugin !== "object") {
      throw new Error(`Invalid plugin for code ${code}`)
    }

    this.validatePlugin(plugin, code)

    if (code.includes("*")) {
      this.wildcardRegistry.set(code, plugin)
    } else {
      this.registry.set(code, plugin)
    }

    console.log(`Plugin registered: ${code} - ${plugin.getInfo().name}`)
  }

  validatePlugin(plugin, code) {
    const requiredMethods = [
      "getInfo",
      "processExcelData",
      "initializeData",
      "normalizeData",
      "prepareDataForSaving",
      "validateData",
    ]

    requiredMethods.forEach((method) => {
      if (typeof plugin[method] !== "function") {
        throw new Error(`Plugin for ${code} missing required method: ${method}`)
      }
    })
  }

  get(code) {
    // Direct match
    if (this.registry.has(code)) {
      return this.registry.get(code)
    }

    // Wildcard match
    for (const [pattern, plugin] of this.wildcardRegistry.entries()) {
      if (this.matchesPattern(code, pattern)) {
        return plugin
      }
    }

    // Default fallback
    console.warn(`No plugin found for ${code}, using default`)
    return this.registry.get("default")
  }

  matchesPattern(code, pattern) {
    const regex = new RegExp("^" + pattern.replace("*", ".*") + "$")
    return regex.test(code)
  }

  getAll() {
    return new Map([...this.registry, ...this.wildcardRegistry])
  }

  clear() {
    this.registry.clear()
    this.wildcardRegistry.clear()
  }
}

// Create singleton instance
export const pluginRegistry = new PluginRegistry()
