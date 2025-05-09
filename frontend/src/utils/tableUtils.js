import * as XLSX from "xlsx"
import { message } from "antd"
import stringSimilarity from "string-similarity"

/**
 * DEBUG UTILITIES - Keep these in production to help troubleshoot
 */
// Create a global debug object to help troubleshoot from the browser console
window.excelDebug = {
  lastWorkbook: null,
  lastHeaders: [],
  lastData: [],
  lastConfig: null,
  lastDetectedIndices: {},
}

/**
 * Convert Excel column letter to index (A->0, B->1, etc.)
 * @param {String} colLetter - Excel column letter (A, B, AA, etc.)
 * @returns {Number} - Zero-based column index
 */
export const excelColToIndex = (colLetter) => {
  if (!colLetter || typeof colLetter !== "string") return -1

  colLetter = colLetter.toUpperCase()
  let sum = 0

  for (let i = 0; i < colLetter.length; i++) {
    sum *= 26
    sum += colLetter.charCodeAt(i) - "A".charCodeAt(0) + 1
  }

  return sum - 1 // Convert to 0-based index
}

/**
 * Convert index to Excel column letter (0->A, 1->B, etc.)
 * @param {Number} index - Zero-based column index
 * @returns {String} - Excel column letter
 */
export const indexToExcelCol = (index) => {
  if (index < 0) return ""

  let temp = index + 1 // Convert to 1-based
  let letter = ""

  while (temp > 0) {
    const remainder = (temp - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    temp = Math.floor((temp - 1) / 26)
  }

  return letter
}

/**
 * Find the header row in Excel data
 * @param {Array} jsonData - JSON representation of Excel data
 * @returns {Number} - Index of the header row
 */
function findHeaderRow(jsonData) {
  const maxRowsToScan = Math.min(20, jsonData.length)

  for (let i = 0; i < maxRowsToScan; i++) {
    const row = jsonData[i]
    if (!row || row.length === 0) continue

    // Look for known header markers
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "")
        .trim()
        .toLowerCase()

      if (
        cell === "no." ||
        cell === "no" ||
        cell === "tahun masuk" ||
        cell === "tahun akademik" ||
        cell === "tahun lulus" ||
        cell === "nama" ||
        cell === "kode" ||
        cell === "jumlah"
      ) {
        // Check if this is likely a header row (has multiple non-empty cells)
        const nonEmptyCells = row.filter(
          (cell) => String(cell || "").trim() !== ""
        ).length
        if (nonEmptyCells >= 3) {
          return i
        }
      }
    }
  }

  return 0 // Default to first row
}

/**
 * Get merged cell information
 * @param {Array} merges - Merged cells array from Excel
 * @param {Number} startRow - Start row index
 * @param {Number} endRow - End row index
 * @param {Array} jsonData - JSON data from Excel
 * @returns {Object} - Mapping of merged cells
 */
function getMergedCells(merges, startRow, endRow, jsonData) {
  const mergedCells = {}

  merges.forEach((merge) => {
    // Only consider merges in the header rows
    if (merge.s.r >= startRow && merge.e.r <= endRow) {
      for (let row = merge.s.r; row <= merge.e.r; row++) {
        for (let col = merge.s.c; col <= merge.e.c; col++) {
          // Map cell coordinate to the value in the top-left cell of the merge
          mergedCells[`${row},${col}`] = {
            value: jsonData[merge.s.r][merge.s.c],
            startRow: merge.s.r,
            startCol: merge.s.c,
          }
        }
      }
    }
  })

  return mergedCells
}

/**
 * Get combined header value from multiple header rows
 * @param {Array} headerRows - Array of header rows
 * @param {Number} colIndex - Column index
 * @param {Object} mergedCells - Merged cells mapping
 * @returns {String} - Combined header value
 */
function getCombinedHeader(headerRows, colIndex, mergedCells) {
  const headerParts = []

  for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
    // Check if this cell is part of a merged cell
    const mergeKey = `${
      rowIndex + headerRows.length - headerRows.length
    },${colIndex}`
    const mergedCell = mergedCells[mergeKey]

    if (mergedCell) {
      // If it's a merged cell, use its value
      const value = String(mergedCell.value || "").trim()
      if (value && !headerParts.includes(value)) {
        headerParts.push(value)
      }
    } else {
      // Otherwise use the cell's value
      const value = String(headerRows[rowIndex][colIndex] || "").trim()
      if (value && !headerParts.includes(value)) {
        headerParts.push(value)
      }
    }
  }

  return headerParts.join(" - ")
}

/**
 * Find column index by header
 * @param {Array} headers - Array of headers from Excel
 * @param {Array} possibleNames - Possible column names
 * @param {String} dataIndex - The data index field name
 * @returns {Number} - The index of the matching column or -1
 */
export const findColumnIndexByHeader = (
  headers,
  possibleNames,
  dataIndex = ""
) => {
  if (!headers || !Array.isArray(headers)) return -1

  // Process headers for comparison
  const processedHeaders = headers.map((h) =>
    String(h || "")
      .toLowerCase()
      .trim()
  )

  console.log(`Looking for column: ${dataIndex}`)
  console.log("Possible names:", possibleNames)
  console.log("Available headers:", processedHeaders)

  // Step 1: Try exact matches (case-insensitive)
  for (let i = 0; i < processedHeaders.length; i++) {
    const header = processedHeaders[i]
    for (const name of possibleNames) {
      const nameStr = String(name || "")
        .toLowerCase()
        .trim()
      if (nameStr && nameStr === header) {
        console.log(
          `Exact match found for "${dataIndex}" at index ${i}: "${headers[i]}"`
        )
        return i
      }
    }
  }

  // Step 2: Try contains matches
  for (let i = 0; i < processedHeaders.length; i++) {
    const header = processedHeaders[i]

    // Check for hierarchical headers (with " - " delimiter)
    const headerParts = header.includes(" - ")
      ? header.split(" - ").map((part) => part.trim().toLowerCase())
      : [header]

    for (const name of possibleNames) {
      const nameStr = String(name || "")
        .toLowerCase()
        .trim()
      if (!nameStr) continue

      // Try to match any part of hierarchical headers
      for (const part of headerParts) {
        if (part.includes(nameStr) || nameStr.includes(part)) {
          console.log(
            `Partial match found for "${dataIndex}" at index ${i}: "${headers[i]}"`
          )
          return i
        }
      }
    }
  }

  // Step 3: Try word similarity for more complex cases
  let bestMatchIndex = -1
  let bestMatchScore = 0.6 // Threshold for similarity

  for (let i = 0; i < processedHeaders.length; i++) {
    const header = processedHeaders[i]

    // Skip empty headers
    if (!header) continue

    for (const name of possibleNames) {
      const nameStr = String(name || "")
        .toLowerCase()
        .trim()
      if (!nameStr) continue

      const score = stringSimilarity.compareTwoStrings(nameStr, header)

      if (score > bestMatchScore) {
        bestMatchScore = score
        bestMatchIndex = i
      }
    }
  }

  if (bestMatchIndex !== -1) {
    console.log(
      `Similarity match found for "${dataIndex}" at index ${bestMatchIndex}: "${
        headers[bestMatchIndex]
      }" with score ${bestMatchScore.toFixed(2)}`
    )
  } else {
    console.log(`No match found for "${dataIndex}"`)
  }

  return bestMatchIndex
}

/**
 * This is the function your plugins are importing.
 * Process Excel data based on configuration and return raw structure for further processing.
 */
export const processExcelDataBase = async (
  workbook,
  tableCode,
  config,
  prodiName
) => {
  // Store for debugging
  window.excelDebug.lastWorkbook = workbook
  window.excelDebug.lastConfig = config

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    console.error("Invalid workbook structure")
    message.error("Invalid Excel file structure")
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  if (!config) {
    console.error("No configuration available for processing Excel data")
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  // Find table configuration
  const tableConfig = config.tables.find(
    (t) =>
      (typeof t === "string" && t === tableCode) || (t && t.code === tableCode)
  )

  if (!tableConfig) {
    console.error(`Table configuration not found for ${tableCode}`)
    message.error(`Table configuration not found for ${tableCode}`)
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  const actualTableConfig =
    typeof tableConfig === "string" ? { code: tableConfig } : tableConfig

  try {
    // Get the first sheet of the workbook
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const merges = sheet["!merges"] || []

    // Convert sheet to JSON array
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: 0,
      defval: "",
    })

    // Store for debugging
    window.excelDebug.lastData = jsonData

    console.log(`Loaded Excel with ${jsonData.length} rows`)

    // Find the header row
    let headerRowIndex =
      actualTableConfig.headerRow !== undefined
        ? actualTableConfig.headerRow
        : findHeaderRow(jsonData)

    console.log("Found header row at index:", headerRowIndex)

    // If header row not found, use first row
    if (headerRowIndex === -1) {
      headerRowIndex = 0
    }

    // Process headers
    const headers = []
    const headerRows = []
    let currentRowIndex = headerRowIndex

    // Get up to 3 rows that could be part of the header (multi-level headers)
    while (currentRowIndex < jsonData.length && headerRows.length < 3) {
      const row = jsonData[currentRowIndex]
      if (!row || row.length === 0) break

      // Check if this looks like a data row (starting with a number)
      const firstCell = String(row[0] || "").trim()
      if (/^\d+\.?$/.test(firstCell) && currentRowIndex > headerRowIndex) {
        break
      }

      headerRows.push(row)
      currentRowIndex++
    }

    // Store for debugging
    window.excelDebug.lastHeaders = headerRows.length > 0 ? headerRows[0] : []

    // Process merged cells in headers
    const mergedHeaderCells = getMergedCells(
      merges,
      headerRowIndex,
      currentRowIndex - 1,
      jsonData
    )

    // Get combined headers
    for (
      let colIndex = 0;
      colIndex < (headerRows[0] ? headerRows[0].length : 0);
      colIndex++
    ) {
      headers[colIndex] = getCombinedHeader(
        headerRows,
        colIndex,
        mergedHeaderCells
      )
    }

    // Data starts after the header rows
    const dataStartRow = headerRowIndex + headerRows.length

    // Filter out empty rows
    const filteredJsonData = jsonData.filter(
      (row, index) =>
        row &&
        index >= dataStartRow &&
        row.length > 0 &&
        row.some((cell) => cell !== "")
    )

    console.log(
      `Found ${filteredJsonData.length} data rows starting at row ${dataStartRow}`
    )

    // Get column definitions for this table
    const columnConfigs =
      typeof actualTableConfig === "string"
        ? []
        : Array.isArray(actualTableConfig.columns)
        ? actualTableConfig.columns
        : typeof actualTableConfig.columns === "object"
        ? Object.values(actualTableConfig.columns)
        : []

    // Create a mapping of data indices to column configurations
    const columnMap = {}

    // Extract all columns including nested ones
    const extractAllColumns = (columns) => {
      const allColumns = []

      const processColumns = (cols) => {
        if (!cols) return

        Object.values(cols).forEach((column) => {
          if (column.is_group && column.children) {
            processColumns(column.children)
          } else if (column.data_index) {
            allColumns.push(column)
          }
        })
      }

      processColumns(columns)
      return allColumns
    }

    const allColumns = extractAllColumns(actualTableConfig.columns)

    allColumns.forEach((column) => {
      if (column.data_index) {
        columnMap[column.data_index] = column
      }
    })

    // Detect column indices in Excel file
    const detectedIndices = {}

    Object.entries(columnMap).forEach(([dataIndex, column]) => {
      if (!column.title && !column.judul) return

      // Build list of possible names
      const possibleNames = [
        column.title || column.judul,
        dataIndex.replace(/_/g, " "),
        dataIndex,
      ]

      // If there are alternative titles, add them
      if (
        column.alternative_titles &&
        Array.isArray(column.alternative_titles)
      ) {
        possibleNames.push(...column.alternative_titles)
      }

      // Check MongoDB indeksExcel field
      if (column.indeksExcel !== undefined) {
        detectedIndices[dataIndex] = column.indeksExcel
        console.log(
          `Using MongoDB indeksExcel for ${dataIndex}: ${column.indeksExcel}`
        )
      }
      // Check excel_index property
      else if (column.excel_index !== undefined) {
        detectedIndices[dataIndex] = column.excel_index
        console.log(
          `Using explicit excel_index for ${dataIndex}: ${column.excel_index}`
        )
      }
      // Check excel_column property (letter like 'A', 'B', etc.)
      else if (column.excel_column) {
        const colIndex =
          typeof column.excel_column === "number"
            ? column.excel_column
            : excelColToIndex(column.excel_column)

        if (colIndex >= 0) {
          detectedIndices[dataIndex] = colIndex
          console.log(
            `Using explicit excel_column for ${dataIndex}: ${column.excel_column} (index ${colIndex})`
          )
        }
      }
      // Otherwise try to detect the column
      else {
        const index = findColumnIndexByHeader(headers, possibleNames, dataIndex)
        if (index !== -1) {
          detectedIndices[dataIndex] = index
        }
      }
    })

    console.log("Detected column indices:", detectedIndices)
    window.excelDebug.lastDetectedIndices = detectedIndices

    return {
      rawData: filteredJsonData,
      headers,
      detectedIndices,
      columnMap,
      tableConfig: actualTableConfig,
      headerRowIndex,
      headerRows,
      jsonData,
      dataStartRow,
    }
  } catch (error) {
    console.error("Error processing Excel data:", error)
    message.error(
      "Failed to process Excel data: " + (error.message || "Unknown error")
    )
    return { rawData: [], headers: [], detectedIndices: {} }
  }
}

/**
 * Check if a value represents true/selected
 */
export const isTrueValue = (value) => {
  if (value === undefined || value === null) return false
  if (value === true || value === 1) return true
  if (
    typeof value === "string" &&
    ["true", "yes", "ya", "✓", "√", "v", "x", "X"].includes(
      value.toLowerCase().trim()
    )
  ) {
    return true
  }
  return false
}

/**
 * Check if a value is selected
 */
export const isSelected = isTrueValue

/**
 * Process data values based on column type
 * @param {*} value - The raw value
 * @param {String} type - Column type
 * @returns {*} - Processed value
 */
function processValueByType(value, type) {
  if (value === undefined || value === null) return value

  switch (type && type.toLowerCase()) {
    case "number":
      return parseFloat(value) || 0
    case "boolean":
      return isTrueValue(value)
    case "date":
      if (value) {
        try {
          if (typeof value === "number") {
            // Handle Excel date number format
            return new Date((value - 25569) * 86400 * 1000)
              .toISOString()
              .split("T")[0]
          } else {
            return new Date(value).toISOString().split("T")[0]
          }
        } catch (e) {
          console.error(`Error parsing date: ${value}`, e)
          return value
        }
      }
      return value
    default:
      return value
  }
}

/**
 * Main function to process Excel data for a table
 * @param {Object} workbook - XLSX workbook object
 * @param {String} tableCode - Table code/identifier
 * @param {Object} config - Configuration object
 * @param {String} prodiName - Program name for filtering
 * @param {String} sectionCode - Section code
 * @returns {Object} - Processed data rows
 */
export const processExcelData = async (
  workbook,
  tableCode,
  config,
  prodiName,
  sectionCode = ""
) => {
  console.log(`Processing Excel data for table: ${tableCode}`)

  const result = await processExcelDataBase(
    workbook,
    tableCode,
    config,
    prodiName
  )

  const { rawData, headers, detectedIndices, columnMap } = result

  // If no data was found, return empty arrays
  if (!rawData || rawData.length === 0) {
    console.warn(`No data found for table: ${tableCode}`)
    return {
      allRows: [],
      prodiRows: [],
      polbanRows: [],
    }
  }

  console.log(`Processing ${rawData.length} rows`)

  // Process raw data into structured rows
  const allRows = rawData.map((row, rowIndex) => {
    const processedRow = {}

    // Map each column using the detected indices
    Object.entries(detectedIndices).forEach(([dataIndex, excelIndex]) => {
      if (excelIndex >= 0 && excelIndex < row.length) {
        let value = row[excelIndex]

        // Process value based on column type
        const column = columnMap[dataIndex]
        if (column && column.type) {
          value = processValueByType(value, column.type)
        }

        processedRow[dataIndex] = value
      }
    })

    return processedRow
  })

  console.log(`Processed ${allRows.length} rows successfully`)

  // Filter rows for specific prodi if prodiName is provided
  const prodiRows = prodiName
    ? allRows.filter((row) => {
        // Look for prodi name in relevant columns
        return Object.values(row).some(
          (value) =>
            typeof value === "string" &&
            value.toLowerCase().includes(prodiName.toLowerCase())
        )
      })
    : []

  // Filter rows for "POLBAN" or institutional data
  const polbanRows = allRows.filter((row) => {
    return Object.values(row).some(
      (value) =>
        typeof value === "string" &&
        (value.toLowerCase().includes("polban") ||
          value.toLowerCase().includes("politeknik negeri bandung"))
    )
  })

  console.log(`Found ${prodiRows.length} rows for prodi "${prodiName}"`)
  console.log(`Found ${polbanRows.length} rows for POLBAN`)

  return {
    allRows,
    prodiRows,
    polbanRows,
  }
}

/**
 * Direct processing function that can be used as an alternative
 */
export const processExcelDirectly = processExcelDataBase

/**
 * DIAGNOSTIC FUNCTIONS
 */

/**
 * Utility to display Excel structure in console
 * Call this from browser console: window.displayExcelStructure()
 */
window.displayExcelStructure = () => {
  const workbook = window.excelDebug.lastWorkbook
  if (!workbook) {
    console.error("No Excel file has been loaded yet")
    return
  }

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Get all cell references
  const cellRefs = Object.keys(sheet).filter((key) => !key.startsWith("!"))

  // Log sheet info
  console.log("Sheet Name:", sheetName)
  console.log("Sheet Properties:", sheet["!ref"])

  // Log first 10 rows
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  console.log("First 10 rows:", data.slice(0, 10))

  // Log headers with column letters
  const headers = data[0] || []
  const headerInfo = headers.map((h, i) => `${indexToExcelCol(i)}: ${h}`)
  console.log("Headers with column letters:", headerInfo)

  // Find potential header rows
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const rowCells = data[i] || []
    const nonEmptyCells = rowCells.filter((cell) => cell !== "").length
    console.log(`Row ${i}: ${nonEmptyCells} non-empty cells`)
  }

  return {
    sheetName,
    headers: headerInfo,
    data: data.slice(0, 10),
  }
}

/**
 * Utility to test column mapping
 * Call from browser console: window.testColumnMapping('the_problematic_column')
 */
window.testColumnMapping = (dataIndex) => {
  const headers = window.excelDebug.lastHeaders || []
  const config = window.excelDebug.lastConfig

  if (!config || !config.tables || config.tables.length === 0) {
    console.error("No configuration loaded")
    return
  }

  const tableConfig = config.tables[0]
  const columnConfigs =
    typeof tableConfig === "string"
      ? []
      : Array.isArray(tableConfig.columns)
      ? tableConfig.columns
      : typeof tableConfig.columns === "object"
      ? Object.values(tableConfig.columns)
      : []

  // Find column by data_index
  const column = columnConfigs.find((c) => c && c.data_index === dataIndex)

  if (!column) {
    console.error(`Column configuration for ${dataIndex} not found`)
    return
  }

  console.log("Testing column mapping for:", dataIndex)
  console.log("Column config:", column)

  // Try all matching methods
  const cleanHeaders = headers.map((h) =>
    h !== null && h !== undefined ? String(h).trim() : ""
  )

  // Build list of possible names
  const possibleNames = [
    column.title || column.judul,
    dataIndex.replace(/_/g, " "),
    dataIndex,
  ]

  // If there are alternative titles, add them
  if (column.alternative_titles && Array.isArray(column.alternative_titles)) {
    possibleNames.push(...column.alternative_titles)
  }

  console.log("Possible names:", possibleNames)
  console.log("Available headers:", cleanHeaders)

  // Check MongoDB indeksExcel field
  if (column.indeksExcel !== undefined) {
    console.log(`Column has explicit indeksExcel: ${column.indeksExcel}`)
  }

  // Exact match
  const exactIndex = cleanHeaders.findIndex((h) =>
    possibleNames.some(
      (name) => name && h.toLowerCase() === String(name).toLowerCase().trim()
    )
  )

  console.log(
    "Exact title match:",
    exactIndex >= 0
      ? `Found at column ${indexToExcelCol(exactIndex)}`
      : "Not found"
  )

  // Contains match
  const containsMatches = cleanHeaders
    .map((h, i) => ({
      header: h,
      index: i,
      col: indexToExcelCol(i),
      matches: possibleNames.filter(
        (name) =>
          name &&
          (h.toLowerCase().includes(String(name).toLowerCase().trim()) ||
            String(name).toLowerCase().trim().includes(h.toLowerCase()))
      ),
    }))
    .filter((m) => m.matches.length > 0)

  console.log("Contains matches:", containsMatches)

  // Word matching
  if (column.title || column.judul) {
    const titleWords = (column.title || column.judul).toLowerCase().split(/\s+/)
    const wordMatches = cleanHeaders
      .map((h, i) => {
        const header = h.toLowerCase()
        const matchedWords = titleWords.filter((word) => header.includes(word))
        const score = matchedWords.length / titleWords.length
        return {
          header: h,
          index: i,
          col: indexToExcelCol(i),
          score,
          matchedWords,
        }
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)

    console.log("Word matches:", wordMatches)
  }

  // Final mapping
  const finalMapping = window.excelDebug.lastDetectedIndices[dataIndex]

  console.log(
    "Final mapping:",
    finalMapping !== undefined
      ? `Column ${indexToExcelCol(finalMapping)} (index ${finalMapping})`
      : "Not mapped"
  )

  return {
    exactMatch:
      exactIndex >= 0
        ? { index: exactIndex, col: indexToExcelCol(exactIndex) }
        : null,
    containsMatches,
    finalMapping:
      finalMapping !== undefined
        ? { index: finalMapping, col: indexToExcelCol(finalMapping) }
        : null,
  }
}

// For backwards compatibility with any other imports
export const extractAllColumnsFromConfig = (tableConfig) => {
  const allColumns = []

  if (!tableConfig || !tableConfig.columns) {
    return allColumns
  }

  const processColumns = (columns) => {
    Object.values(columns).forEach((column) => {
      if (column.is_group && column.children) {
        processColumns(column.children)
      } else {
        allColumns.push(column)
      }
    })
  }

  processColumns(tableConfig.columns)
  return allColumns
}

export const extractColumns = (tableConfig) => {
  if (!tableConfig) return []

  let columns = []

  if (Array.isArray(tableConfig.columns)) {
    columns = tableConfig.columns
  } else if (typeof tableConfig.columns === "object" && tableConfig.columns) {
    columns = Object.values(tableConfig.columns)
  }

  return columns
}
