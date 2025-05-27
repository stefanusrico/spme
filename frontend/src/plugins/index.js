import {
  pluginRegistry as registry,
  PluginRegistry,
} from "./core/PluginRegistry.js"
export { PluginRegistry }
export const pluginRegistry = registry

export { pluginManager, PluginManager } from "./core/PluginManager.js"
export { PluginFactory } from "./core/PluginFactory.js"

// Registration function
export { registerAllPlugins, default as registerPlugins } from "./register.js"

// Base classes (for extending)
export { BasePlugin } from "./core/BasePlugin.js"
export { DosenPluginBase } from "./base/DosenPluginBase.js"
export { GenericTablePlugin } from "./base/GenericTablePlugin.js"

// Utilities
export * as PluginUtils from "./utils/PluginUtils.js"
export * as ExcelUtils from "./utils/ExcelUtils.js"

// Helper function to get plugin with safety check
export function getPlugin(code) {
  // Add safety check to handle undefined registry
  if (!registry) {
    console.error("Plugin registry not initialized when accessing:", code)
    return null
  }
  return registry.get(code)
}

// Helper function to check if plugin exists
export function hasPlugin(code) {
  // Add safety check to handle undefined registry
  if (!registry) {
    console.error("Plugin registry not initialized when checking:", code)
    return false
  }
  return registry.get(code) !== registry.get("default")
}
