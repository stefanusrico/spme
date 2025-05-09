import { useState, useEffect } from "react"
import { getPlugin } from "../plugins/registry"

export const useTablePlugin = (tableCode) => {
  const [plugin, setPlugin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tableCode) {
      try {
        setLoading(true)

        // Get plugin based on table code
        const tablePlugin = getPlugin(tableCode)

        // If no specific plugin, use default
        if (!tablePlugin) {
          console.warn(
            `No specific plugin found for ${tableCode}, using default`
          )
          const defaultPlugin = getPlugin("default")
          setPlugin(defaultPlugin)
        } else {
          setPlugin(tablePlugin)
          console.log(
            `Loaded plugin for ${tableCode}:`,
            tablePlugin.getInfo().name
          )
        }
      } catch (error) {
        console.error(`Error loading plugin for ${tableCode}:`, error)
      } finally {
        setLoading(false)
      }
    }
  }, [tableCode])

  return { plugin, loading }
}
