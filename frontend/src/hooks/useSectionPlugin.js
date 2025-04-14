import { useState, useEffect } from "react"
import { getPlugin } from "../plugins/registry"

export const useSectionPlugin = (sectionCode) => {
  const [plugin, setPlugin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sectionCode) {
      try {
        setLoading(true)
        const sectionPlugin = getPlugin(sectionCode)
        setPlugin(sectionPlugin)
        console.log(
          `Loaded plugin for section ${sectionCode}:`,
          sectionPlugin.getInfo().name
        )
      } catch (error) {
        console.error(`Error loading plugin for section ${sectionCode}:`, error)
      } finally {
        setLoading(false)
      }
    }
  }, [sectionCode])

  return { plugin, loading }
}
