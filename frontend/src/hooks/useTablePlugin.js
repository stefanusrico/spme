import { useState, useEffect } from "react"
import {
  getPlugin,
  registerAllPlugins,
  pluginRegistry,
} from "../plugins/index.js"

// Track if plugins have been registered
let pluginsRegistered = false

export const useTablePlugin = (tableCode) => {
  const [plugin, setPlugin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Register plugins once at the beginning
  useEffect(() => {
    if (!pluginsRegistered) {
      try {
        registerAllPlugins()
        pluginsRegistered = true
        console.log("Plugins registered successfully")
      } catch (err) {
        console.error("Failed to register plugins:", err)
        setError(err.message)
      }
    }
  }, [])

  // Load plugin after registration
  useEffect(() => {
    if (!tableCode) {
      setLoading(false)
      return
    }

    try {
      // Verify plugin registry exists
      if (!pluginRegistry) {
        throw new Error("Plugin registry not initialized")
      }

      const plugin = getPlugin(tableCode)

      if (!plugin) {
        console.warn(`No plugin found for ${tableCode}, using default`)
      } else {
        console.log(`Loaded plugin for ${tableCode}: ${plugin.getInfo().name}`)
      }

      setPlugin(plugin)
    } catch (err) {
      console.error(`Error loading plugin for ${tableCode}:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tableCode, pluginsRegistered])

  return { plugin, loading, error }
}
