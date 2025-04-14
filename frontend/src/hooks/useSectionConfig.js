import { useState, useEffect, useCallback } from "react"
import { getFormulaReference } from "../utils/formulaUtils"
import axiosInstance from "../utils/axiosConfig"

export const useSectionConfig = (sectionCode, userData) => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFormulaForSection = useCallback(async () => {
    if (!sectionCode) return null

    try {
      const { number, sub } = getFormulaReference(sectionCode)
      console.log(`Fetching formula ${number}${sub} for section ${sectionCode}`)

      const response = await axiosInstance.get(`/rumus/nomor/${number}/${sub}`)

      if (response.data) {
        console.log("Formula fetched successfully:", response.data)
        return response.data
      }
    } catch (error) {
      console.error("Error fetching formula:", error)
    }

    return null
  }, [sectionCode])

  const fetchSectionConfig = useCallback(async () => {
    if (!userData) return

    setLoading(true)
    try {
      console.log("Fetching section config for sectionCode:", sectionCode)
      const response = await axiosInstance.get(
        `/lkps/sections/${sectionCode}/config`
      )

      if (response.data) {
        console.log("Received section config:", response.data)
        const configData = response.data

        const formula = await fetchFormulaForSection()
        if (formula) {
          configData.formula = formula
          console.log("Added formula to config:", formula)
        } else {
          console.log("No formula fetched for this section")
        }

        if (!Array.isArray(configData.tables)) {
          configData.tables = configData.tables ? [configData.tables] : []
          console.log("Converted tables to array:", configData.tables)
        }

        configData.tables.forEach((table) => {
          console.log("Processing table:", table.code || table)

          if (
            table.columns &&
            typeof table.columns === "object" &&
            !Array.isArray(table.columns)
          ) {
            console.log(
              "Table has object columns, converting to array:",
              table.columns
            )
            table.columns = Object.values(table.columns)
            console.log("Converted columns to array:", table.columns)
          }
        })

        setConfig(configData)
      } else {
        setError("Failed to load section configuration")
        console.error("Empty response from section config API")
      }
    } catch (err) {
      console.error("Error fetching section config:", err)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [sectionCode, userData, fetchFormulaForSection])

  // Fetch configuration when section or user changes
  useEffect(() => {
    if (userData) {
      fetchSectionConfig()
    }
  }, [fetchSectionConfig, userData])

  return {
    config,
    setConfig,
    loading,
    setLoading,
    error,
    setError,
    fetchFormulaForSection,
  }
}
