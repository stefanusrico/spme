import { useState, useEffect, useCallback } from "react"
import axiosInstance from "../utils/axiosConfig"

export const useTableConfig = (tableCode, userData) => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Transform MongoDB model to frontend format
  const adaptTableConfigForFrontend = (tableConfig) => {
    console.log("Adapting table config:", tableConfig)

    // If already in expected format, return as is
    if (tableConfig.columns) return tableConfig

    // Build columns array from MongoDB format
    let columnsArray = []

    // Check if we have columns in the response
    if (tableConfig.kolom && Array.isArray(tableConfig.kolom)) {
      columnsArray = tableConfig.kolom.map((col) => ({
        data_index: col.indeksData,
        title: col.judul,
        type: col.type || "text",
        width: col.lebar,
        align: col.align || "center",
        is_group: col.isGroup,
        children: col.children
          ? col.children.map((child) => ({
              data_index: child.indeksData,
              title: child.judul,
              type: child.type || "text",
              width: child.lebar,
              align: child.align || "center",
            }))
          : [],
      }))
    } else if (
      tableConfig.semuaKolom &&
      Array.isArray(tableConfig.semuaKolom)
    ) {
      // Alternative column format
      columnsArray = tableConfig.semuaKolom.map((col) => ({
        data_index: col.indeksData,
        title: col.judul,
        type: col.type || "text",
        width: col.lebar,
        align: col.align || "center",
        is_group: col.isGroup,
      }))
    }

    // Return formatted config - ensure code is set correctly
    return {
      code: tableConfig.kode,
      title: tableConfig.judul,
      excel_start_row: tableConfig.barisAwalExcel,
      columns: columnsArray,
    }
  }

  const fetchTableConfig = useCallback(async (code) => {
    try {
      console.log(`Fetching table config for: ${code}`)
      const response = await axiosInstance.get(`/lkps/tables/${code}/config`)

      if (response.data) {
        console.log("Received raw table config:", response.data)
        const adaptedConfig = adaptTableConfigForFrontend(response.data)
        console.log("Adapted table config:", adaptedConfig)
        return adaptedConfig
      }
    } catch (error) {
      console.error(`Error fetching table config for ${code}:`, error)
      throw error
    }
    return null
  }, [])

  const fetchConfig = useCallback(async () => {
    if (!userData || !tableCode) {
      // Reset loading state jika data tidak mencukupi
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    setLoading(true)
    setError(null)

    try {
      console.log("Fetching config for tableCode:", tableCode)

      // Fetch table config using the table code
      const tableConfig = await fetchTableConfig(tableCode)

      if (tableConfig) {
        // Build config with the table
        const configData = {
          code: tableCode,
          title: tableConfig.title || tableConfig.judul,
          tables: [tableConfig],
        }

        // Ensure tables is always an array with proper objects containing 'code' property
        if (!Array.isArray(configData.tables)) {
          configData.tables = configData.tables ? [configData.tables] : []
        }

        // Make sure each table has the code property correctly set
        configData.tables = configData.tables.map((table) => {
          if (typeof table === "string") {
            return { code: table }
          } else if (!table.code && table.kode) {
            return { ...table, code: table.kode }
          }
          return table
        })

        console.log("Configured tables:", configData.tables)
        setConfig(configData)
        console.log("Final table config:", configData)
      } else {
        setError("Failed to load table configuration")
      }
    } catch (err) {
      console.error("Error in fetchConfig:", err)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [tableCode, userData, fetchTableConfig])

  // Fetch configuration when table or user changes
  useEffect(() => {
    if (userData) {
      fetchConfig()
    }
  }, [fetchConfig, userData])

  return {
    config,
    setConfig,
    loading,
    error,
    setError,
  }
}
