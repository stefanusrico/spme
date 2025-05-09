import axiosInstance from "../utils/axiosConfig"

// Tables with data selection capability
export const tablesWithDataSelection = [
  "1-1", // Kerjasama Tridharma - Pendidikan
  "1-2", // Kerjasama Tridharma - Penelitian
  "1-3", // Kerjasama Tridharma - Pengabdian
]

// Helper function for checking if a table allows selection
export const isSelectionAllowedForTable = (tableCode) => {
  return tablesWithDataSelection.includes(tableCode)
}

// Fallback structure when API fails
const fallbackStructure = [
  {
    code: "1",
    title: "Kerjasama Tridharma Perguruan Tinggi",
    subTables: [
      {
        code: "1-1",
        title: "Kerjasama Tridharma Perguruan Tinggi - Pendidikan",
      },
      {
        code: "1-2",
        title: "Kerjasama Tridharma Perguruan Tinggi - Penelitian",
      },
      {
        code: "1-3",
        title: "Kerjasama Tridharma Perguruan Tinggi - Pengabdian",
      },
    ],
  },
  // ...keep the rest of the fallback structure
]

// Helper to determine parent title based on table code and first subtable title
function getParentTitle(parentCode, subtableTitle) {
  const parentTitles = {
    1: "Kerjasama Tridharma Perguruan Tinggi",
    2: "Mahasiswa",
    3: "Dosen",
    4: "Keuangan, Sarana, dan Prasarana",
    5: "Pembelajaran",
    6: "Penelitian",
    7: "Pengabdian kepada Masyarakat",
    8: "Luaran dan Capaian",
  }

  if (parentTitles[parentCode]) {
    return parentTitles[parentCode]
  }

  // Try to extract parent title from subtable title
  if (subtableTitle && subtableTitle.includes("-")) {
    return subtableTitle.split("-")[0].trim()
  }

  return `Table ${parentCode}`
}

// Modified to build table structure from tables
const buildTableStructureFromTables = (tables) => {
  const groupedTables = {}

  tables.forEach((table) => {
    // Extract table code from table code
    // Assuming table codes follow pattern like "1-1" or "3a5"
    const tableCode = table.kode

    // Extract parent code (everything before dash or first character if no dash)
    const parentCode = tableCode.includes("-")
      ? tableCode.split("-")[0]
      : tableCode.charAt(0)

    // Initialize parent table if not exists
    if (!groupedTables[parentCode]) {
      groupedTables[parentCode] = {
        code: parentCode,
        title: getParentTitle(parentCode, table.judul),
        subTables: [],
      }
    }

    // Add table as subtable
    groupedTables[parentCode].subTables.push({
      code: tableCode,
      title: table.judul,
    })
  })

  // Convert object to array and sort by code
  return Object.values(groupedTables).sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  )
}

// Cache for table structure
let cachedTableStructure = null

export const fetchTableStructure = async (forceRefresh = false) => {
  try {
    // Return cached data if available and refresh is not forced
    if (cachedTableStructure && !forceRefresh) {
      return cachedTableStructure
    }

    // Make the API call to the new tables endpoint
    try {
      const response = await axiosInstance.get("/lkps/tables")

      console.log("API Response from tables endpoint:", response.data)

      // Check if the response has data property with an array
      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        const tables = response.data.data
        console.log("Successfully fetched tables:", tables.length)
        cachedTableStructure = buildTableStructureFromTables(tables)
        return cachedTableStructure
      } else if (response.data && Array.isArray(response.data)) {
        // Handle case where the response might be a direct array
        console.log("Successfully fetched tables:", response.data.length)
        cachedTableStructure = buildTableStructureFromTables(response.data)
        return cachedTableStructure
      }

      // If we reach here, the response format was unexpected
      console.warn("Unexpected response format, using fallback:", response.data)
      cachedTableStructure = fallbackStructure
      return fallbackStructure
    } catch (apiError) {
      console.error("API error:", apiError)
      cachedTableStructure = fallbackStructure
      return fallbackStructure
    }
  } catch (error) {
    console.error("Error in fetchTableStructure:", error)
    cachedTableStructure = fallbackStructure
    return fallbackStructure
  }
}

// Initial structure with fallback data
export const tableStructure = fallbackStructure

// Synchronous versions that use the provided structure for component usage
export const findTableByCodeSync = (code, structure) => {
  if (!structure || !structure.length) {
    // Use fallback if structure is empty
    structure = fallbackStructure
  }

  // First check if it's a main table
  const mainTable = structure.find((table) => table.code === code)
  if (mainTable) return mainTable

  // Then look in subtables
  for (const table of structure) {
    if (table.subTables) {
      const subTable = table.subTables.find((sub) => sub.code === code)
      if (subTable) {
        return {
          ...subTable,
          parentCode: table.code,
          parentTitle: table.title,
        }
      }
    }
  }

  return null
}

export const getAdjacentTablesSync = (currentCode, structure) => {
  if (!structure || !structure.length) {
    // Use fallback if structure is empty
    structure = fallbackStructure
  }

  // Flatten the table structure
  const flatTables = []
  structure.forEach((table) => {
    if (table.subTables && table.subTables.length > 0) {
      table.subTables.forEach((sub) => flatTables.push(sub.code))
    } else {
      flatTables.push(table.code)
    }
  })

  const currentIndex = flatTables.indexOf(currentCode)
  if (currentIndex === -1) return { prev: null, next: null }

  return {
    prev: currentIndex > 0 ? flatTables[currentIndex - 1] : null,
    next:
      currentIndex < flatTables.length - 1
        ? flatTables[currentIndex + 1]
        : null,
  }
}

export const getAllTablesSync = (structure) => {
  if (!structure || !structure.length) {
    // Use fallback if structure is empty
    structure = fallbackStructure
  }

  const tables = []
  structure.forEach((mainTable) => {
    if (mainTable.subTables && mainTable.subTables.length > 0) {
      mainTable.subTables.forEach((sub) => {
        tables.push({
          code: sub.code,
          title: `${sub.code} - ${sub.title}`,
          parent: mainTable.title,
        })
      })
    } else {
      tables.push({
        code: mainTable.code,
        title: `${mainTable.code} - ${mainTable.title}`,
        parent: null,
      })
    }
  })
  return tables
}
