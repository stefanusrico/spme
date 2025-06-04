import * as XLSX from "xlsx"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"

export const extractColumns = (tableConfig) => {
  let columns = []

  if (Array.isArray(tableConfig.columns)) {
    columns = tableConfig.columns
  } else if (typeof tableConfig.columns === "object" && tableConfig.columns) {
    columns = Object.values(tableConfig.columns)
  }

  if (columns.length === 0 && tableConfig.kode) {
    console.log(
      `Tabel ${tableConfig.kode} tidak memiliki kolom yang didefinisikan, Anda mungkin perlu membuatnya terlebih dahulu`
    )
  }

  console.log(
    `[DEBUG] Extracted ${columns.length} columns from table config:`,
    columns.map((c) => ({
      indeksData: c.indeksData,
      judul: c.judul,
      isGroup: c.isGroup,
    }))
  )

  return columns
}

// New function to use GeminiDataMappingController for column mapping
export const mapColumnsUsingAI = async (dbColumns, excelHeaders) => {
  try {
    console.log("[DEBUG] Sending mapping request to AI service...")
    console.log(
      `[DEBUG] Mapping ${dbColumns.length} DB columns to ${excelHeaders.length} Excel headers`
    )

    // Format database columns for API
    const formattedDbColumns = dbColumns.map((column) => ({
      indeksData: column.indeksData,
      title: column.judul,
    }))

    // Filter out empty headers
    const filteredHeaders = excelHeaders.filter(
      (header) =>
        header !== null && header !== undefined && String(header).trim() !== ""
    )

    // Send request to the API
    const response = await axiosInstance.post("/data-mapping", {
      database_columns: formattedDbColumns,
      excel_headers: filteredHeaders,
    })

    if (response.data && response.data.success && response.data.mapping) {
      console.log("[DEBUG] AI mapping successful")
      return response.data.mapping
    } else {
      console.error(
        "[ERROR] AI mapping failed:",
        response.data?.error || "Unknown error"
      )
      return null
    }
  } catch (error) {
    console.error("[ERROR] Error calling AI mapping service:", error)
    return null
  }
}

export const extractAllColumnsFromConfig = (tableConfig) => {
  const allColumns = []
  const dataColumns = [] // This will hold ONLY leaf columns for mapping

  if (!tableConfig) {
    console.log("[ERROR] Table config is null or undefined!")
    return { allColumns: [], dataColumns: [] }
  }

  // Debug the incoming config structure
  console.log("[DEBUG] Table config structure received:", {
    kode: tableConfig.kode || tableConfig.code,
    judul: tableConfig.judul || tableConfig.title,
    has_columns: !!tableConfig.columns,
    has_tables: !!(tableConfig.tables && tableConfig.tables.length),
    tables_length: tableConfig.tables ? tableConfig.tables.length : 0,
  })

  // Determine where columns are located - check all possible locations
  let columnsSource = null
  let columns = null

  // Check direct columns
  if (Array.isArray(tableConfig.columns)) {
    columnsSource = "direct columns array"
    columns = tableConfig.columns
  }
  // Check kolom property
  else if (tableConfig.kolom && Array.isArray(tableConfig.kolom)) {
    columnsSource = "kolom property"
    columns = tableConfig.kolom
  }
  // Check in tables[0] (nested structure from config)
  else if (
    tableConfig.tables &&
    tableConfig.tables.length > 0 &&
    tableConfig.tables[0]
  ) {
    const firstTable = tableConfig.tables[0]

    // Check firstTable.columns
    if (Array.isArray(firstTable.columns)) {
      columnsSource = "tables[0].columns"
      columns = firstTable.columns
    }
    // Check firstTable.kolom
    else if (firstTable.kolom && Array.isArray(firstTable.kolom)) {
      columnsSource = "tables[0].kolom"
      columns = firstTable.kolom
    }
  }

  if (!columns) {
    console.log(
      "[ERROR] Could not find columns in any expected location in config!"
    )
    console.log("[DEBUG] Full config structure:", tableConfig)
    return { allColumns: [], dataColumns: [] }
  }

  console.log(`[DEBUG] Found ${columns.length} columns in ${columnsSource}`)

  // Process the columns
  columns.forEach((column) => {
    // Add to allColumns for completeness
    allColumns.push(column)

    // Check if it's a group column with children
    if (column.isGroup && Array.isArray(column.children)) {
      // Add each child column to dataColumns (for mapping)
      column.children.forEach((child) => {
        // Only add leaf nodes to dataColumns
        if (!child.isGroup) {
          dataColumns.push({
            ...child,
            parentTitle: column.judul,
            parentIndeksData: column.indeksData,
          })
        } else if (child.children && Array.isArray(child.children)) {
          // Handle nested children (if any)
          child.children.forEach((grandchild) => {
            dataColumns.push({
              ...grandchild,
              parentTitle: child.judul,
              grandparentTitle: column.judul,
              parentIndeksData: child.indeksData,
              grandparentIndeksData: column.indeksData,
            })
          })
        }
      })
    } else if (!column.isGroup) {
      // Add normal non-group column to dataColumns for mapping
      dataColumns.push(column)
    }
  })

  // Detailed debug of all extracted columns
  console.log("\n[DEBUG] All columns extracted from config:", allColumns.length)
  allColumns.forEach((col, idx) => {
    if (col.isGroup) {
      console.log(`  ${idx + 1}. 📂 GROUP: ${col.judul} (${col.indeksData})`)
    } else {
      console.log(`  ${idx + 1}. ${col.judul} (${col.indeksData})`)
    }
  })

  console.log("\n[DEBUG] DATA columns for mapping:", dataColumns.length)
  dataColumns.forEach((col, idx) => {
    if (col.parentTitle) {
      if (col.grandparentTitle) {
        console.log(
          `  ${idx + 1}. ${col.grandparentTitle} > ${col.parentTitle} > ${
            col.judul
          } (${col.indeksData})`
        )
      } else {
        console.log(
          `  ${idx + 1}. ${col.parentTitle} > ${col.judul} (${col.indeksData})`
        )
      }
    } else {
      console.log(`  ${idx + 1}. ${col.judul} (${col.indeksData})`)
    }
  })

  return { allColumns, dataColumns }
}

export const processExcelDataBase = async (workbook, tableCode, config) => {
  if (!config) {
    console.error("Tidak ada konfigurasi tersedia untuk memproses data Excel")
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  let tableConfig = config

  if (
    config.tables &&
    Array.isArray(config.tables) &&
    config.tables.length > 0 &&
    config.code !== tableCode &&
    config.kode !== tableCode
  ) {
    const matchingTable = config.tables.find(
      (t) =>
        typeof t === "object" && (t.code === tableCode || t.kode === tableCode)
    )

    if (matchingTable) {
      console.log(
        `[DEBUG] Found matching table in config.tables: ${
          matchingTable.kode || matchingTable.code
        }`
      )
      tableConfig = matchingTable
    }
  }

  if (
    !tableConfig ||
    (tableConfig.code !== tableCode && tableConfig.kode !== tableCode)
  ) {
    console.error(`Konfigurasi tabel tidak ditemukan untuk ${tableCode}`)
    message.error(`Konfigurasi tabel tidak ditemukan untuk ${tableCode}`)
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  try {
    console.log(`\n===============================`)
    console.log(
      `PROCESSING TABLE: ${
        tableConfig.judul || tableConfig.title
      } (${tableCode})`
    )
    console.log(`===============================\n`)

    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const merges = sheet["!merges"] || []

    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: 0,
      defval: "",
    })

    console.log(
      `[DEBUG] Excel file has ${jsonData.length} rows in first sheet: "${sheetName}"`
    )
    console.log(`[DEBUG] Excel file has ${merges.length} merged cells`)

    let headerRowIndex = -1
    let excelStartRow = tableConfig.barisAwalExcel || 0
    const maxRowsToScan = Math.min(20, jsonData.length)

    if (excelStartRow && excelStartRow > 0) {
      headerRowIndex = excelStartRow - 1
      console.log(
        `[DEBUG] Using barisAwalExcel from config: ${excelStartRow}, setting headerRowIndex to ${headerRowIndex}`
      )
    } else {
      console.log(
        `[DEBUG] No barisAwalExcel provided, trying to auto-detect header row...`
      )
      for (let i = 0; i < maxRowsToScan; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue

        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || "").trim()

          if (
            (cell === "No." ||
              cell === "No" ||
              cell === "Tahun Masuk" ||
              cell === "Tahun Akademik" ||
              cell === "Tahun Lulus" ||
              cell.toLowerCase() === "no." ||
              cell.toLowerCase() === "no" ||
              cell.toLowerCase() === "tahun masuk" ||
              cell.toLowerCase() === "tahun akademik" ||
              cell.toLowerCase() === "tahun lulus") &&
            j + 1 < row.length &&
            row[j + 1] !== ""
          ) {
            const nonEmptyCells = row.filter((cell) => cell !== "").length
            if (nonEmptyCells >= 3) {
              headerRowIndex = i
              excelStartRow = i
              console.log(
                `[DEBUG] AUTO-DETECTED header row at row ${
                  i + 1
                } with keyword "${cell}"`
              )
              break
            }
          }
        }

        if (headerRowIndex !== -1) break
      }

      if (headerRowIndex === -1) {
        headerRowIndex = 0
        excelStartRow = 0
        console.log(
          `[DEBUG] Failed to auto-detect header row, using default: row 1`
        )
      }
    }

    // Simplified header processing - ambil hanya header yang clean
    const headerRows = []
    let currentHeaderIndex = headerRowIndex
    let hasFoundNumericRow = false
    let maxHeaderRows = 3 // Batasi maksimal 3 baris header

    while (
      currentHeaderIndex < jsonData.length &&
      !hasFoundNumericRow &&
      headerRows.length < maxHeaderRows
    ) {
      const row = jsonData[currentHeaderIndex]
      if (!row || row.length === 0) {
        break
      }

      // Check if this row looks like a data row rather than a header row
      const firstCell = String(row[0] || "").trim()
      const hasNumericFirstCell = /^\d+\.?$/.test(firstCell)

      if (hasNumericFirstCell && headerRows.length > 0) {
        hasFoundNumericRow = true
        console.log(
          `[DEBUG] Found data row starting with number at row ${
            currentHeaderIndex + 1
          }`
        )
        break
      }

      // Add this row as a potential header row
      headerRows.push(row)
      console.log(
        `[DEBUG] Adding header row ${currentHeaderIndex + 1}: ${row
          .slice(0, 5)
          .join(", ")}${row.length > 5 ? "..." : ""}`
      )
      currentHeaderIndex++
    }

    // We need at least one header row
    if (headerRows.length === 0) {
      headerRows.push(jsonData[headerRowIndex] || [])
      console.log(
        `[DEBUG] No header rows detected, using row ${
          headerRowIndex + 1
        } as default`
      )
    }

    // IMPROVED: Extract clean headers - hanya ambil header terakhir yang berisi data kolom aktual
    const lastHeaderRow = headerRows[headerRows.length - 1]
    const combinedHeaders = []

    console.log(
      `\n[DEBUG] Processing ${headerRows.length} header rows to create clean headers`
    )

    // Function to get the most relevant header for each column
    function getCleanHeaderForColumn(colIndex) {
      // Start from the last (most specific) header row and work backwards
      for (let rowIndex = headerRows.length - 1; rowIndex >= 0; rowIndex--) {
        const headerValue = String(headerRows[rowIndex][colIndex] || "").trim()

        // Skip jika header kosong atau hanya berisi angka/nomor urut
        if (!headerValue || /^\d+\.?$/.test(headerValue)) {
          continue
        }

        // Skip jika header terlalu pendek (kemungkinan bukan header yang berguna)
        if (headerValue.length < 2) {
          continue
        }

        // Skip jika header berisi pattern yang menunjukkan ini bukan nama kolom
        if (headerValue.match(/^(1|2|3|4|5|6|7|8|9|10|\d+)$/)) {
          continue
        }

        return headerValue
      }

      // Jika tidak ada header yang valid, gunakan posisi kolom
      return `Column_${colIndex + 1}`
    }

    // Build clean headers for each column
    const maxColumns = Math.max(...headerRows.map((row) => row.length))
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const cleanHeader = getCleanHeaderForColumn(colIndex)
      combinedHeaders[colIndex] = cleanHeader
    }

    // Debug the combined headers
    console.log(
      `\n[DEBUG] Clean headers extracted (${combinedHeaders.length} columns):`
    )
    combinedHeaders.forEach((header, idx) => {
      console.log(`  Column ${idx + 1}: "${header}"`)
    })

    const dataStartRow = headerRowIndex + headerRows.length
    console.log(
      `\n[DEBUG] Data starts at row ${
        dataStartRow + 1
      } (0-based index: ${dataStartRow})`
    )

    const filteredJsonData = jsonData.filter(
      (row, index) =>
        row &&
        index >= dataStartRow &&
        row.length > 0 &&
        row.some((cell) => cell !== "")
    )
    console.log(
      `[DEBUG] Filtered out empty rows, found ${filteredJsonData.length} data rows`
    )

    // Extract all columns from the config
    const { allColumns, dataColumns } = extractAllColumnsFromConfig(tableConfig)

    // Create a mapping of indeksData to column config - ONLY using data columns
    const columnMap = {}
    dataColumns.forEach((column) => {
      if (column.indeksData) {
        columnMap[column.indeksData] = column
        console.log(
          `[DEBUG] Added to columnMap: ${column.indeksData} -> ${column.judul}`
        )

        // Add hierarchical context for better matches
        if (column.parentTitle) {
          if (column.grandparentTitle) {
            console.log(
              `   (within hierarchy: ${column.grandparentTitle} > ${column.parentTitle} > ${column.judul})`
            )
          } else {
            console.log(
              `   (within hierarchy: ${column.parentTitle} > ${column.judul})`
            )
          }
        }
      }
    })

    console.log(
      `\n[DEBUG] Created columnMap with ${
        Object.keys(columnMap).length
      } entries:`,
      Object.keys(columnMap).map((key) => `${key}: ${columnMap[key].judul}`)
    )

    // ---------- IMPROVED AI-BASED MAPPING ----------
    console.log(`\n[DEBUG] Starting AI-based column mapping process...`)
    console.log(
      `[DEBUG] Finding matches for ${
        Object.keys(columnMap).length
      } database columns in ${combinedHeaders.length} Excel columns`
    )

    // Initialize detected indices
    const detectedIndices = {}
    const unmatchedColumns = []

    try {
      // Use AI mapping to match columns
      const aiMapping = await mapColumnsUsingAI(
        Object.values(columnMap),
        combinedHeaders
      )

      if (aiMapping) {
        // Process the AI mapping results
        Object.entries(columnMap).forEach(([dataIndex, column]) => {
          if (aiMapping[dataIndex]) {
            const { excelIndex, excelHeader } = aiMapping[dataIndex]
            detectedIndices[dataIndex] = excelIndex
            console.log(
              `  ✅ MATCHED "${column.judul}" (${dataIndex}) to Excel column ${
                excelIndex + 1
              }: "${excelHeader}"`
            )
          } else {
            unmatchedColumns.push({
              indeksData: dataIndex,
              judul: column.judul,
            })
            console.log(
              `  ❌ NO MATCH FOUND for "${column.judul}" (${dataIndex})`
            )
          }
        })
      } else {
        console.log("[ERROR] Failed to get AI mapping, using fallback matching")
        // If AI mapping fails, use basic matching as fallback
        Object.entries(columnMap).forEach(([dataIndex, column]) => {
          const index = basicColumnMatching(combinedHeaders, column)
          if (index !== -1) {
            detectedIndices[dataIndex] = index
            console.log(
              `  ✅ MATCHED (fallback) "${
                column.judul
              }" (${dataIndex}) to Excel column ${index + 1}: "${
                combinedHeaders[index]
              }"`
            )
          } else {
            unmatchedColumns.push({
              indeksData: dataIndex,
              judul: column.judul,
            })
            console.log(
              `  ❌ NO MATCH FOUND for "${column.judul}" (${dataIndex})`
            )
          }
        })
      }
    } catch (error) {
      console.error("[ERROR] Error during column mapping:", error)
      // Use basic matching as fallback
      Object.entries(columnMap).forEach(([dataIndex, column]) => {
        const index = basicColumnMatching(combinedHeaders, column)
        if (index !== -1) {
          detectedIndices[dataIndex] = index
          console.log(
            `  ✅ MATCHED (fallback) "${
              column.judul
            }" (${dataIndex}) to Excel column ${index + 1}: "${
              combinedHeaders[index]
            }"`
          )
        } else {
          unmatchedColumns.push({ indeksData: dataIndex, judul: column.judul })
          console.log(
            `  ❌ NO MATCH FOUND for "${column.judul}" (${dataIndex})`
          )
        }
      })
    }

    // Improved basic fallback matching function
    function basicColumnMatching(headers, column) {
      const columnTitle = column.judul.toLowerCase().trim()

      // First pass: exact match
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || "")
          .toLowerCase()
          .trim()
        if (header === columnTitle) {
          return i
        }
      }

      // Second pass: contains match
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || "")
          .toLowerCase()
          .trim()
        if (header.includes(columnTitle) || columnTitle.includes(header)) {
          return i
        }
      }

      // Third pass: word-based matching
      const columnWords = columnTitle.split(/\s+/)
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || "")
          .toLowerCase()
          .trim()
        const headerWords = header.split(/\s+/)

        // Check if any significant words match
        const significantMatches = columnWords.filter(
          (word) =>
            word.length > 2 &&
            headerWords.some((hw) => hw.includes(word) || word.includes(hw))
        )

        if (significantMatches.length > 0) {
          return i
        }
      }

      return -1
    }

    // Debug summary of all column mappings
    console.log(`\n==================================================`)
    console.log(`COLUMN MAPPING SUMMARY FOR ${tableCode}`)
    console.log(`==================================================`)
    console.log(
      `✅ Successfully matched ${Object.keys(detectedIndices).length}/${
        Object.keys(columnMap).length
      } columns`
    )

    if (unmatchedColumns.length > 0) {
      console.log(`\n❌ UNMATCHED COLUMNS (${unmatchedColumns.length}):`)
      unmatchedColumns.forEach((col, idx) => {
        console.log(`  ${idx + 1}. ${col.judul} (${col.indeksData})`)
      })
    }

    console.log(`\n📋 COLUMN MAPPING DETAILS:`)
    Object.entries(detectedIndices).forEach(([indeksData, excelIndex]) => {
      const columnInfo = columnMap[indeksData]
      const excelHeader = combinedHeaders[excelIndex]

      console.log(
        `  - ${columnInfo.judul} (${indeksData}) -> Excel column ${
          excelIndex + 1
        }: "${excelHeader}"`
      )
    })

    // Show a visual representation of the mapping
    console.log(`\n📊 VISUAL MAPPING:`)
    console.log(`  DATABASE FIELD                 ->  EXCEL HEADER`)
    console.log(
      `  -----------------------------------------------------------------------------------`
    )
    Object.entries(detectedIndices).forEach(([indeksData, excelIndex]) => {
      const paddedIndeksData = indeksData.padEnd(30, " ")
      console.log(`  ${paddedIndeksData} ->  ${combinedHeaders[excelIndex]}`)
    })

    // Add a comprehensive comparison between Excel headers and DB columns
    console.log(`\n==================================================`)
    console.log(`COMPREHENSIVE EXCEL vs DATABASE COLUMN COMPARISON`)
    console.log(`==================================================`)

    console.log(`\n[EXCEL HEADERS] Clean Excel headers found in the file:`)
    combinedHeaders.forEach((header, idx) => {
      console.log(`  ${idx + 1}. "${header}"`)
    })

    console.log(`\n[DATABASE COLUMNS] All database columns from configuration:`)
    Object.entries(columnMap).forEach(([indeksData, column], idx) => {
      if (column.parentTitle) {
        if (column.grandparentTitle) {
          console.log(
            `  ${idx + 1}. ${column.grandparentTitle} > ${
              column.parentTitle
            } > ${column.judul} (${indeksData})`
          )
        } else {
          console.log(
            `  ${idx + 1}. ${column.parentTitle} > ${
              column.judul
            } (${indeksData})`
          )
        }
      } else {
        console.log(`  ${idx + 1}. ${column.judul} (${indeksData})`)
      }
    })

    console.log(`\n[MAPPING STATUS] Status of each database column:`)
    Object.entries(columnMap).forEach(([indeksData, column], idx) => {
      const matched = detectedIndices[indeksData] !== undefined
      const matchedToHeader = matched
        ? combinedHeaders[detectedIndices[indeksData]]
        : "NOT MATCHED"
      console.log(
        `  ${idx + 1}. ${column.judul} (${indeksData}): ${
          matched ? "✅ MATCHED" : "❌ NOT MATCHED"
        } -> ${matchedToHeader}`
      )
    })
    console.log(`==================================================\n`)

    // Transform data into rows with indeksData as keys
    const transformedRows = filteredJsonData.map((row, rowIdx) => {
      const transformedRow = {}

      Object.entries(detectedIndices).forEach(([dataIndex, colIndex]) => {
        transformedRow[dataIndex] = row[colIndex] || ""
      })

      // Debug first few and last few rows
      if (rowIdx < 2 || rowIdx >= filteredJsonData.length - 2) {
        console.log(`[DEBUG] Transformed row ${rowIdx + 1}:`, transformedRow)
      } else if (rowIdx === 2 && filteredJsonData.length > 5) {
        console.log(`[DEBUG] ... ${filteredJsonData.length - 4} more rows ...`)
      }

      return transformedRow
    })

    return {
      rawData: filteredJsonData,
      headers: combinedHeaders,
      detectedIndices,
      columnMap,
      tableConfig,
      headerRowIndex,
      headerRows,
      jsonData,
      dataStartRow,
      transformedRows, // Add the transformed data
    }
  } catch (error) {
    console.error("Error saat memproses data Excel:", error)
    message.error(
      "Gagal memproses data Excel: " +
        (error.message || "Error tidak diketahui")
    )
    return { rawData: [], headers: [], detectedIndices: {} }
  }
}

export const isSelected = (value) => {
  if (value === undefined || value === null || value === "") return false
  if (value === true) return true
  if (
    typeof value === "string" &&
    (value === "✓" ||
      value === "√" ||
      value === "v" ||
      value === "x" ||
      value === "X" ||
      value.toLowerCase() === "true" ||
      value.toLowerCase() === "yes" ||
      value.toLowerCase() === "ya")
  )
    return true
  return false
}

export const isTrueValue = (value) => {
  if (value === undefined || value === null) return false
  if (value === true) return true
  if (typeof value === "number" && value === 1) return true
  if (
    typeof value === "string" &&
    (value.toUpperCase() === "TRUE" || value.toLowerCase() === "true")
  )
    return true
  if (
    typeof value === "string" &&
    (value === "✓" ||
      value === "√" ||
      value === "v" ||
      value === "x" ||
      value === "X" ||
      value.toLowerCase() === "ya" ||
      value.toLowerCase() === "yes")
  )
    return true
  return false
}

export const processExcelData = async (
  workbook,
  tableCode,
  config,
  prodiName,
  sectionCode = ""
) => {
  console.warn(
    "⚠️ DEPRECATED: Menggunakan processExcelData lama. Silakan update ke arsitektur plugin."
  )

  const result = await processExcelDataBase(
    workbook,
    tableCode,
    config,
    prodiName
  )

  const { rawData, headers, detectedIndices, columnMap } = result

  return {
    allRows: [],
    prodiRows: [],
    polbanRows: [],
  }
}

// Function to save Excel data to the database
export const saveExcelDataToLkps = async (transformedRows, kodeTabel) => {
  try {
    console.log(
      `[DEBUG] Saving ${transformedRows.length} rows to table ${kodeTabel}`
    )

    // API call to save data
    const response = await fetch(`/api/lkps-data/${kodeTabel}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: transformedRows }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Gagal menyimpan data")
    }

    console.log(`[DEBUG] Data saved successfully!`)
    return await response.json()
  } catch (error) {
    console.error("Error saving Excel data:", error)
    message.error(
      "Gagal menyimpan data: " + (error.message || "Error tidak diketahui")
    )
    throw error
  }
}
