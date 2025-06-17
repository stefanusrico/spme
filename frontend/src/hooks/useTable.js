import { useState, useEffect, useCallback } from "react"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"

export const useTable = (tableCode, navigate) => {
  const [tableStructure, setTableStructure] = useState([])
  const [structureLoading, setStructureLoading] = useState(true)
  const [savedTables, setSavedTables] = useState([])
  const [tableData, setTableData] = useState([])
  const [plugin, setPlugin] = useState(null)

  // Load table structure from tables
  useEffect(() => {
    const loadTableStructure = async () => {
      try {
        setStructureLoading(true)
        const response = await axiosInstance.get("/lkps/tables")

        if (response.data && response.data.data) {
          // Process tables into a table structure
          const tables = response.data.data
          const structure = buildTableStructureFromTables(tables)
          setTableStructure(structure)
          console.log("Table structure loaded:", structure.length, "tables")
        } else {
          console.error("Invalid response format from tables API")
          message.error("Failed to load LKPS structure")
        }
      } catch (error) {
        console.error("Error in loadTableStructure:", error)
        message.error("Failed to load LKPS structure")
      } finally {
        setStructureLoading(false)
      }
    }

    loadTableStructure()
  }, [])

  // Find current table in structure
  const findTableByCode = useCallback(
    (code) => {
      if (!tableStructure || !code) return null

      // Flat search through structure
      const findInArray = (tables) => {
        for (const table of tables) {
          if (table.code === code) return table

          if (table.children) {
            const found = findInArray(table.children)
            if (found) return found
          }
        }
        return null
      }

      return findInArray(tableStructure)
    },
    [tableStructure]
  )

  // Get adjacent tables for navigation
  const getAdjacentTables = useCallback(() => {
    if (!tableStructure || !tableCode) return { prev: null, next: null }

    // Flatten table structure
    const flattenStructure = (tables, result = []) => {
      tables.forEach((table) => {
        if (table.type !== "group") {
          result.push(table)
        }
        if (table.children) {
          flattenStructure(table.children, result)
        }
      })
      return result
    }

    const flatTables = flattenStructure(tableStructure)
    const currentIndex = flatTables.findIndex((t) => t.code === tableCode)

    if (currentIndex === -1) return { prev: null, next: null }

    const prev = currentIndex > 0 ? flatTables[currentIndex - 1].code : null
    const next =
      currentIndex < flatTables.length - 1
        ? flatTables[currentIndex + 1].code
        : null

    return { prev, next }
  }, [tableCode, tableStructure])

  // Get current table and navigation
  const currentTable = findTableByCode(tableCode)
  const { prev, next } = getAdjacentTables()

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (prev) navigate(`/lkps/${prev}`)
  }, [navigate, prev])

  const handleNext = useCallback(() => {
    if (next) navigate(`/lkps/${next}`)
  }, [navigate, next])

  const handleTableChange = useCallback(
    (newTable) => {
      navigate(`/lkps/${newTable}`)
    },
    [navigate]
  )

  // Update table data
  const updateTableData = useCallback(
    (updatedData, recalculate = true) => {
      if (!plugin) return

      // Normalize data first
      let normalizedData = plugin.normalizeData
        ? plugin.normalizeData(updatedData)
        : updatedData

      // Recalculate fields if needed
      if (recalculate && plugin.recalculateData) {
        normalizedData = plugin.recalculateData(normalizedData)
      }

      setTableData(normalizedData)
    },
    [plugin]
  )

  // Handle cell change
  const handleCellChange = useCallback(
    (rowKey, dataIndex, value) => {
      const newData = [...tableData]
      const rowIndex = newData.findIndex((item) => item.key === rowKey)

      if (rowIndex > -1) {
        const row = newData[rowIndex]
        newData[rowIndex] = { ...row, [dataIndex]: value }

        // Automatically recalculate for this row only
        if (plugin && plugin.recalculateRow) {
          newData[rowIndex] = plugin.recalculateRow(newData[rowIndex])
        }

        updateTableData(newData, false)
      }
    },
    [tableData, updateTableData, plugin]
  )

  // Helper function to build table structure from tables
  function buildTableStructureFromTables(tables) {
    const result = []
    const tableMap = {}

    // Process tables into structure
    tables.forEach((table) => {
      // FIX: Ensure table.kode is a string
      const kodeString = String(table.kode || "")

      if (!kodeString) {
        console.warn("Table with missing kode:", table)
        return
      }

      // Extract parent code (first digit of the table code)
      const mainCodeMatch = kodeString.match(/^(\d)/)
      if (!mainCodeMatch) {
        console.warn("Invalid table code format:", kodeString)
        return
      }

      const mainCode = mainCodeMatch[1]

      // Create main table if it doesn't exist
      if (!tableMap[mainCode]) {
        const mainTable = {
          code: mainCode,
          title: getParentTitle(mainCode),
          type: "group",
          children: [],
        }
        result.push(mainTable)
        tableMap[mainCode] = mainTable
      }

      // Add table as a table
      const tableEntry = {
        code: kodeString,
        title: String(table.judul || ""),
        type: "content",
        tableCode: kodeString,
      }

      // Check if the table code is exactly the same as the main code
      if (kodeString === mainCode) {
        // This is the main table content
        Object.assign(tableMap[mainCode], tableEntry)
      } else {
        // This is a subtable (contains dash or letters after the first digit)
        tableMap[mainCode].children.push(tableEntry)
      }
    })

    return result
  }

  // Helper function to get parent title
  function getParentTitle(mainCode) {
    const parentTitles = {
      1: "Kerjasama Tridharma Perguruan Tinggi",
      2: "Mahasiswa",
      3: "Dosen",
      4: "Keuangan, Sarana, dan Prasarana",
      5: "Pembelajaran",
      6: "Penelitian",
      7: "Pengabdian kepada Masyarakat",
      8: "Luaran dan Capaian",
      9: "Sistem Penjaminan Mutu",
    }

    return parentTitles[mainCode] || `Table ${mainCode}`
  }

  return {
    tableStructure,
    structureLoading,
    currentTable,
    savedTables,
    setSavedTables,
    prev,
    next,
    handlePrev,
    handleNext,
    handleTableChange,
    tableData,
    setTableData,
    updateTableData,
    handleCellChange,
  }
}
