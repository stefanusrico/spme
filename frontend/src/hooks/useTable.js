import { useState, useEffect, useCallback } from "react"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"

export const useTable = (tableCode, navigate) => {
  const [tableStructure, setTableStructure] = useState([])
  const [structureLoading, setStructureLoading] = useState(true)
  const [savedTables, setSavedTables] = useState([])

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

  // Helper function to build table structure from tables
  function buildTableStructureFromTables(tables) {
    const result = []
    const tableMap = {}

    // Process tables into structure
    tables.forEach((table) => {
      // Extract parent code (first digit of the table code)
      const mainCode = table.kode.match(/^(\d)/)[1]

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
        code: table.kode,
        title: table.judul,
        type: "content",
        tableCode: table.kode,
      }

      // Check if the table code is exactly the same as the main code
      if (table.kode === mainCode) {
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
  }
}
