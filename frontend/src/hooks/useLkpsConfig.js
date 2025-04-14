import { useState, useEffect, useRef } from "react"
import axiosInstance from "../utils/axiosConfig"
import { getFormulaReference } from "../utils/formulaUtils"

/**
 * Custom hook for loading and managing LKPS section configuration
 * @param {string} sectionCode - The current section code
 * @param {object} userData - Current user data
 * @returns {object} Configuration data and state
 */
const useLkpsConfig = (sectionCode, userData) => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Reference to config for use in callbacks
  const configRef = useRef(null)

  // Update configRef when config changes
  useEffect(() => {
    configRef.current = config
  }, [config])

  /**
   * Fetch the formula for the current section
   */
  const fetchFormulaForSection = async () => {
    if (!sectionCode) return null

    try {
      // Get the formula reference for this section
      const { number, sub } = getFormulaReference(sectionCode)
      console.log(`Fetching formula ${number}${sub} for section ${sectionCode}`)

      // Fetch the formula from the API
      const response = await axiosInstance.get(`/rumus/nomor/${number}/${sub}`)

      if (response.data) {
        console.log("Formula fetched successfully:", response.data)
        return response.data
      }
    } catch (error) {
      console.error("Error fetching formula:", error)
    }

    return null
  }

  // Load section configuration when section code changes
  useEffect(() => {
    if (!userData || !sectionCode) return

    const fetchSectionConfig = async () => {
      setLoading(true)
      try {
        console.log("Fetching section config for sectionCode:", sectionCode)
        const response = await axiosInstance.get(
          `/lkps/sections/${sectionCode}/config`
        )

        if (response.data) {
          console.log("Received section config:", response.data)
          const configData = response.data

          // Fetch the appropriate formula for this section
          const formula = await fetchFormulaForSection()
          if (formula) {
            configData.formula = formula
            console.log("Added formula to config:", formula)
          } else {
            console.log("No formula fetched for this section")
          }

          // Ensure tables is an array
          if (!Array.isArray(configData.tables)) {
            configData.tables = configData.tables ? [configData.tables] : []
            console.log("Converted tables to array:", configData.tables)
          }

          // Process tables structure
          configData.tables.forEach((table) => {
            console.log("Processing table:", table.code || table)

            // Convert object columns to array if needed
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
    }

    fetchSectionConfig()
  }, [sectionCode, userData])

  return {
    config,
    configRef,
    setConfig,
    loading,
    error,
    fetchFormulaForSection,
  }
}

export default useLkpsConfig
