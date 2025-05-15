import * as XLSX from "xlsx"
import { message } from "antd"
import stringSimilarity from "string-similarity"

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

  // Debug: Show columns extracted from config
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

export const findColumnIndexByHeader = (headers, possibleNames, column) => {
  if (!headers || !Array.isArray(headers)) return -1

  const dataIndex =
    possibleNames.length > 0 ? possibleNames[possibleNames.length - 1] : ""

  // Debug: Show what we're trying to match
  console.log(
    `\n[DEBUG] Trying to match field '${dataIndex}' using possible names:`,
    possibleNames
  )

  // Add hierarchical information to debugging if available
  if (column && column.parentTitle) {
    if (column.grandparentTitle) {
      console.log(
        `[DEBUG] This is a nested column: ${column.grandparentTitle} > ${column.parentTitle} > ${column.judul}`
      )
    } else {
      console.log(
        `[DEBUG] This is a child column: ${column.parentTitle} > ${column.judul}`
      )
    }
  }

  // Transform headers to string for comparison
  const processedHeaders = headers.map((h) => {
    return String(h || "")
      .toLowerCase()
      .trim()
  })

  // Log all headers to diagnose the issue
  console.log("Available Excel headers:", processedHeaders)

  // Get all possible variants of the field name
  const fieldVariants = []

  // Add original dataIndex
  fieldVariants.push(dataIndex)

  // Add dataIndex with underscores replaced by spaces
  fieldVariants.push(dataIndex.replace(/_/g, " "))

  // Add all possibleNames
  possibleNames.forEach((name) => {
    if (name && !fieldVariants.includes(name)) {
      fieldVariants.push(name)
    }
  })

  console.log(`[DEBUG] Using field variants for matching:`, fieldVariants)

  // Extract TS info from the dataIndex
  const tsInfo = extractTSInfo(dataIndex)

  // Handle min/max/rata-rata specifically
  const isMin = dataIndex.includes("min_")
  const isMax = dataIndex.includes("maks_")
  const isAverage = dataIndex.includes("rata_rata_")

  // Check for specific contexts in dataIndex
  const isPadaPsLainDiPt = dataIndex.includes("pada_ps_lain_di_pt")
  const isPadaPsYangDiakreditasi = dataIndex.includes(
    "pada_ps_yang_diakreditasi"
  )

  // Calculate scores for all headers against all field variants
  const columnScores = []

  for (let i = 0; i < processedHeaders.length; i++) {
    const header = processedHeaders[i]
    if (!header) continue

    let bestScore = 0
    let matchDetails = []

    // Check for hierarchical headers (with " - " delimiter)
    if (header.includes(" - ")) {
      const headerParts = header.split(" - ").map((p) => p.trim())

      // Context-based checks for program type
      if (isPadaPsLainDiPt && !header.includes("pada ps lain di pt")) {
        bestScore -= 0.9 // Strong penalty for context mismatch
        matchDetails.push(
          "CONTEXT MISMATCH: Expected 'pada ps lain di pt' but not found"
        )
        continue // Skip this header entirely
      }

      if (
        isPadaPsYangDiakreditasi &&
        !header.includes("pada ps yang diakreditasi")
      ) {
        bestScore -= 0.9 // Strong penalty for context mismatch
        matchDetails.push(
          "CONTEXT MISMATCH: Expected 'pada ps yang diakreditasi' but not found"
        )
        continue // Skip this header entirely
      }

      // Boost scores for correct context matches
      if (isPadaPsLainDiPt && header.includes("pada ps lain di pt")) {
        bestScore += 0.3 // Bonus for correct context
        matchDetails.push("CONTEXT MATCH: Found 'pada ps lain di pt'")
      }

      if (
        isPadaPsYangDiakreditasi &&
        header.includes("pada ps yang diakreditasi")
      ) {
        bestScore += 0.3 // Bonus for correct context
        matchDetails.push("CONTEXT MATCH: Found 'pada ps yang diakreditasi'")
      }

      // Extract TS info from the last header part specifically
      const lastHeaderPart = headerParts[headerParts.length - 1]
      const headerTsInfo = extractTSInfo(lastHeaderPart)

      // STRONG TS NUMBER MATCHING - with improved logic
      if (tsInfo.hasTS && headerTsInfo.hasTS) {
        // Case 1: dataIndex has plain "ts" without number
        if (!tsInfo.hasNumber && headerTsInfo.hasNumber) {
          // Plain TS should match to header with current year (TS)
          // Lower score if it's matching to TS-1 or TS-2
          bestScore -= 0.9 // Severe penalty for matching plain TS to numbered TS
          matchDetails.push(
            `MISMATCH: Plain TS field matching to numbered TS-${headerTsInfo.number}`
          )
          continue // Skip this header entirely
        }
        // Case 2: Both have numbers, and they must match
        else if (tsInfo.hasNumber && headerTsInfo.hasNumber) {
          if (tsInfo.number === headerTsInfo.number) {
            bestScore += 0.6 // Strong bonus for exact TS number match
            matchDetails.push(`EXACT TS MATCH: both have TS-${tsInfo.number}`)
          } else {
            bestScore -= 0.9 // Very strong penalty for TS number mismatch
            matchDetails.push(
              `TS MISMATCH: expected TS-${tsInfo.number} but found TS-${headerTsInfo.number}`
            )
            continue // Skip this header entirely
          }
        }
        // Case 3: dataIndex has number but header doesn't
        else if (tsInfo.hasNumber && !headerTsInfo.hasNumber) {
          bestScore -= 0.7 // Strong penalty
          matchDetails.push(
            `TS MISMATCH: expected TS-${tsInfo.number} but found plain TS`
          )
          continue // Skip this header
        }
        // Case 4: Both have plain TS (without number)
        else if (!tsInfo.hasNumber && !headerTsInfo.hasNumber) {
          bestScore += 0.4 // Bonus for plain TS match
          matchDetails.push("Both contain plain TS (without number)")
        }
      }

      // Critical check for min/max/average mismatches in indicator type
      if (
        (isMin &&
          (lastHeaderPart.includes("rata-rata") ||
            lastHeaderPart.includes("maks") ||
            lastHeaderPart.includes("max"))) ||
        (isMax &&
          (lastHeaderPart.includes("rata-rata") ||
            lastHeaderPart.includes("min"))) ||
        (isAverage &&
          (lastHeaderPart.includes("maks") ||
            lastHeaderPart.includes("max") ||
            lastHeaderPart.includes("min")))
      ) {
        bestScore -= 0.95 // Critical penalty for indicator type mismatch
        matchDetails.push(
          "CRITICAL SEMANTIC MISMATCH: min/max/rata-rata contradiction!"
        )
        continue // Skip this header entirely due to critical mismatch
      }

      // Special handling for min/max/rata-rata in hierarchical headers
      if (isMin || isMax || isAverage) {
        // Check if the last part indicates min/max/average
        if (
          isMin &&
          (lastHeaderPart === "min" ||
            lastHeaderPart === "min." ||
            lastHeaderPart === "minimum")
        ) {
          bestScore += 0.5
          matchDetails.push("MIN indicator match")
        } else if (
          isMax &&
          (lastHeaderPart === "maks" ||
            lastHeaderPart === "maks." ||
            lastHeaderPart === "max" ||
            lastHeaderPart === "max." ||
            lastHeaderPart === "maksimum" ||
            lastHeaderPart === "maximum")
        ) {
          bestScore += 0.5
          matchDetails.push("MAX indicator match")
        } else if (
          isAverage &&
          (lastHeaderPart === "rata-rata" ||
            lastHeaderPart === "rata rata" ||
            lastHeaderPart === "average" ||
            lastHeaderPart === "mean")
        ) {
          bestScore += 0.5
          matchDetails.push("AVERAGE indicator match")
        }
      }

      // Compare each field variant with each header part
      for (const variant of fieldVariants) {
        // Get best similarity across all header parts
        let bestPartSimilarity = 0
        let bestPartIndex = -1

        for (let partIndex = 0; partIndex < headerParts.length; partIndex++) {
          const similarity = stringSimilarity.compareTwoStrings(
            variant,
            headerParts[partIndex]
          )

          if (similarity > bestPartSimilarity) {
            bestPartSimilarity = similarity
            bestPartIndex = partIndex
          }
        }

        // Weight more if it matches the last part (most specific)
        const weightedScore =
          bestPartSimilarity *
          (bestPartIndex === headerParts.length - 1
            ? 0.9
            : 0.7 - 0.1 * bestPartIndex)

        if (weightedScore > bestScore) {
          bestScore = weightedScore
          matchDetails = [
            `Similarity with hierarchical header part ${bestPartIndex + 1}: ${(
              bestPartSimilarity * 100
            ).toFixed(2)}%`,
          ]
        }
      }
    } else {
      // For regular non-hierarchical headers
      for (const variant of fieldVariants) {
        // Using the stringSimilarity library
        const similarity = stringSimilarity.compareTwoStrings(variant, header)

        if (similarity > bestScore) {
          bestScore = similarity
          matchDetails = [`Similarity score: ${(similarity * 100).toFixed(2)}%`]
        }
      }

      // Apply context penalties for non-hierarchical headers too
      if (isPadaPsLainDiPt && !header.includes("pada ps lain di pt")) {
        bestScore -= 0.8 // Penalty for context mismatch
        matchDetails.push(
          "Non-hierarchical context mismatch: Expected 'pada ps lain di pt'"
        )
      }

      if (
        isPadaPsYangDiakreditasi &&
        !header.includes("pada ps yang diakreditasi")
      ) {
        bestScore -= 0.8 // Penalty for context mismatch
        matchDetails.push(
          "Non-hierarchical context mismatch: Expected 'pada ps yang diakreditasi'"
        )
      }
    }

    // Additional scoring based on keyword matches
    if (
      dataIndex.includes("mahasiswa_aktif") &&
      header.toLowerCase().includes("aktif")
    ) {
      bestScore += 0.1
      matchDetails.push('Header contains "Aktif" keyword')
    }

    if (
      (dataIndex.includes("penuh_waktu") || dataIndex.includes("full_time")) &&
      (header.toLowerCase().includes("penuh") ||
        header.toLowerCase().includes("full"))
    ) {
      bestScore += 0.1
      matchDetails.push("Time type match: full/penuh")
    }

    if (
      (dataIndex.includes("paruh_waktu") || dataIndex.includes("part_time")) &&
      (header.toLowerCase().includes("paruh") ||
        header.toLowerCase().includes("part"))
    ) {
      bestScore += 0.1
      matchDetails.push("Time type match: part/paruh")
    }

    // Strong penalties for specific mismatches
    if (
      (dataIndex.includes("min_") &&
        (header.includes("maks") ||
          header.includes("max") ||
          header.includes("rata-rata"))) ||
      (dataIndex.includes("maks_") &&
        (header.includes("min") || header.includes("rata-rata"))) ||
      (dataIndex.includes("rata_rata_") &&
        (header.includes("maks") ||
          header.includes("max") ||
          header.includes("min")))
    ) {
      bestScore -= 0.95 // Critical penalty
      matchDetails.push(
        "CRITICAL SEMANTIC MISMATCH: min/max/rata-rata contradiction!"
      )
      continue // Skip this header entirely
    }

    // Check TS suffix match for non-hierarchical headers too
    if (tsInfo.hasTS && header.includes("ts")) {
      const headerTsInfo = extractTSInfo(header)

      // Check for plain TS matching to numbered TS headers
      if (!tsInfo.hasNumber && headerTsInfo.hasNumber) {
        bestScore -= 0.9 // Strong penalty
        matchDetails.push(
          `MISMATCH: Plain TS field matching to numbered TS-${headerTsInfo.number}`
        )
        continue // Skip this header
      }

      if (tsInfo.hasNumber && headerTsInfo.hasNumber) {
        if (tsInfo.number === headerTsInfo.number) {
          bestScore += 0.3 // Bonus for matching TS number
          matchDetails.push(`Matching TS number: ${tsInfo.number}`)
        } else {
          bestScore -= 0.9 // Stronger penalty for mismatched TS number
          matchDetails.push(
            `TS NUMBER MISMATCH: expected ${tsInfo.number}, found ${headerTsInfo.number}`
          )
          continue // Skip this header entirely
        }
      }
    }

    // Add to scores if it's good enough
    if (bestScore > 0.2) {
      // Lower threshold to 0.2 for debugging purposes to see more potential matches
      // Note: In production, keep this at 0.5, but for debugging it's useful to see more options
      columnScores.push({
        index: i,
        header: headers[i],
        score: bestScore,
        matches: matchDetails,
        originalHeader: header,
      })
    }
  }

  // Sort by score (highest first)
  columnScores.sort((a, b) => b.score - a.score)

  // Debug information - show ALL potential matches with their scores
  console.log(`[DEBUG] Match candidates for "${dataIndex}":`)
  if (columnScores.length > 0) {
    columnScores.forEach((score, idx) => {
      console.log(
        `  ${idx + 1}. "${score.header}" [score: ${score.score.toFixed(
          2
        )}] - ${score.matches.join(", ")}`
      )
    })
    console.log(
      `  ✅ BEST MATCH: "${
        columnScores[0].header
      }" (score: ${columnScores[0].score.toFixed(2)})`
    )
  } else {
    console.log(`  ❌ NO MATCHES FOUND`)
  }

  return columnScores.length > 0 ? columnScores[0].index : -1
}

// Helper function to extract TS information - improved version
function extractTSInfo(text) {
  const result = {
    hasTS: false,
    hasNumber: false,
    number: null,
    isPlainTS: false,
  }

  const lowerText = String(text).toLowerCase()

  if (lowerText.includes("ts")) {
    result.hasTS = true

    // Check for TS-2 pattern
    if (lowerText.includes("ts-2") || lowerText.includes("ts_2")) {
      result.hasNumber = true
      result.number = "2"
    }
    // Check for TS-1 pattern
    else if (lowerText.includes("ts-1") || lowerText.includes("ts_1")) {
      result.hasNumber = true
      result.number = "1"
    }
    // Plain TS without number
    else if (
      lowerText === "ts" ||
      lowerText.endsWith("_ts") ||
      lowerText.endsWith("-ts")
    ) {
      result.isPlainTS = true
    }
    // Fallback to regex for more complex patterns
    else {
      const tsPattern = /ts[-_]?(\d+)/i
      const tsMatch = lowerText.match(tsPattern)

      if (tsMatch) {
        result.hasNumber = true
        result.number = tsMatch[1]
      } else if (
        lowerText === "ts" ||
        (lowerText.startsWith("ts") && !lowerText.match(/ts\d/))
      ) {
        result.isPlainTS = true
      }
    }
  }

  return result
}

export const extractAllColumnsFromConfig = (tableConfig) => {
  const allColumns = []
  const dataColumns = [] // This will hold ONLY leaf columns for mapping

  if (!tableConfig) {
    console.log("[ERROR] Table config is null or undefined!")
    return { allColumns, dataColumns }
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

  // Find the correct table config - either direct config or in tables array
  let tableConfig = config

  // If config has tables array and the code doesn't match, check inside tables
  if (
    config.tables &&
    Array.isArray(config.tables) &&
    config.tables.length > 0 &&
    config.code !== tableCode &&
    config.kode !== tableCode
  ) {
    // Try to find matching table in tables array
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

    // If barisAwalExcel is provided, use it as the starting point
    if (excelStartRow && excelStartRow > 0) {
      headerRowIndex = excelStartRow - 1 // Adjust for 0-based index
      console.log(
        `[DEBUG] Using barisAwalExcel from config: ${excelStartRow}, setting headerRowIndex to ${headerRowIndex}`
      )
    } else {
      // Otherwise, try to detect header row
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

    // Extract all potential header rows - Look for multiple levels of headers
    const headerRows = []
    let currentHeaderIndex = headerRowIndex
    let hasFoundNumericRow = false

    while (currentHeaderIndex < jsonData.length && !hasFoundNumericRow) {
      const row = jsonData[currentHeaderIndex]
      if (!row || row.length === 0) {
        break // Stop if we encounter an empty row
      }

      // Check if this row looks like a data row rather than a header row
      const firstCell = String(row[0] || "").trim()
      const hasNumericFirstCell = /^\d+\.?$/.test(firstCell)

      if (hasNumericFirstCell) {
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

    // Now combine all header rows into a hierarchical header structure
    console.log(
      `\n[DEBUG] Processing ${headerRows.length} header rows to create hierarchical headers`
    )
    const mainHeaderRow = headerRows[0]
    const combinedHeaders = [...mainHeaderRow]

    // Process merged cells to identify parent headers
    const mergedCellMap = new Map()

    if (merges && merges.length > 0) {
      merges.forEach((merge) => {
        // Only consider merges in the header rows
        if (
          merge.s.r >= headerRowIndex &&
          merge.e.r < headerRowIndex + headerRows.length
        ) {
          for (let col = merge.s.c; col <= merge.e.c; col++) {
            mergedCellMap.set(`${col}`, {
              rowStart: merge.s.r,
              rowEnd: merge.e.r,
              colStart: merge.s.c,
              colEnd: merge.e.c,
              value: jsonData[merge.s.r][merge.s.c],
            })
          }
        }
      })
      console.log(
        `[DEBUG] Found ${mergedCellMap.size} merged cells in header rows`
      )
    }

    // Function to build a hierarchical header from multiple rows
    function buildHierarchicalHeader(colIndex) {
      const headerParts = []
      let lastNonEmptyHeader = null

      for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
        const headerRow = headerRows[rowIndex]
        const cellValue = String(headerRow[colIndex] || "").trim()

        if (cellValue !== "") {
          // Direct cell value
          headerParts.push(cellValue)
          lastNonEmptyHeader = cellValue
        } else {
          // Check if this cell is part of a merged cell
          const mergeKey = `${colIndex}`
          if (mergedCellMap.has(mergeKey)) {
            const mergeInfo = mergedCellMap.get(mergeKey)
            const mergedValue = String(
              jsonData[mergeInfo.rowStart][mergeInfo.colStart] || ""
            ).trim()

            if (
              mergedValue !== "" &&
              (headerParts.length === 0 ||
                headerParts[headerParts.length - 1] !== mergedValue)
            ) {
              headerParts.push(mergedValue)
              lastNonEmptyHeader = mergedValue
            }
          } else if (rowIndex > 0) {
            // Check if we should inherit from previous row
            // Find the last non-empty header above this cell
            for (let prevRow = rowIndex - 1; prevRow >= 0; prevRow--) {
              const prevValue = String(
                headerRows[prevRow][colIndex] || ""
              ).trim()
              if (prevValue !== "") {
                // Check if this value is already in our headerParts
                if (!headerParts.includes(prevValue)) {
                  headerParts.push(prevValue)
                }
                break
              }
            }
          }
        }
      }

      // Special handling for Tingkat headers
      const hasLevelInfo = headerParts.some(
        (part) =>
          part.toLowerCase() === "tingkat" ||
          ((part.toLowerCase().includes("internasional") ||
            part.toLowerCase().includes("nasional") ||
            part.toLowerCase().includes("lokal")) &&
            !headerParts.some(
              (p) =>
                p.toLowerCase().includes("bekerja") ||
                p.toLowerCase().includes("lulusan") ||
                p.toLowerCase().includes("kerja") ||
                p.toLowerCase().includes("berwirausaha")
            ))
      )

      if (hasLevelInfo) {
        // Only apply the "Tingkat -" prefix if the context is about achievement levels
        // not about workplace location
        const isTingkatContext = headerParts.some(
          (part) => part.toLowerCase() === "tingkat"
        )

        const isWorkplaceContext = headerParts.some(
          (part) =>
            part.toLowerCase().includes("bekerja") ||
            part.toLowerCase().includes("lulusan") ||
            part.toLowerCase().includes("kerja") ||
            part.toLowerCase().includes("berwirausaha")
        )

        // If it's clearly not about workplace, proceed with level detection
        if (!isWorkplaceContext) {
          const levelType = headerParts.find(
            (part) =>
              part.toLowerCase().includes("internasional") ||
              part.toLowerCase() === "ln" ||
              part.toLowerCase() === "int" ||
              part.toLowerCase().includes("nasional") ||
              part.toLowerCase() === "n" ||
              part.toLowerCase() === "dn" ||
              part.toLowerCase().includes("lokal") ||
              part.toLowerCase().includes("wilayah") ||
              part.toLowerCase() === "l"
          )

          if (levelType) {
            const lowerLevelType = levelType.toLowerCase()
            if (
              lowerLevelType.includes("internasional") ||
              lowerLevelType === "ln" ||
              lowerLevelType === "int"
            ) {
              return isTingkatContext
                ? "Tingkat - Internasional"
                : "Internasional"
            } else if (
              lowerLevelType.includes("nasional") ||
              lowerLevelType === "n" ||
              lowerLevelType === "dn"
            ) {
              return isTingkatContext ? "Tingkat - Nasional" : "Nasional"
            } else if (
              lowerLevelType.includes("lokal") ||
              lowerLevelType.includes("wilayah") ||
              lowerLevelType === "l"
            ) {
              return isTingkatContext
                ? "Tingkat - Lokal/Wilayah"
                : "Lokal/Wilayah"
            }
          }
        }
      }

      // Return combined hierarchical header
      return headerParts.length > 0 ? headerParts.join(" - ") : ""
    }

    // Build hierarchical headers for each column
    for (let colIndex = 0; colIndex < mainHeaderRow.length; colIndex++) {
      const hierarchicalHeader = buildHierarchicalHeader(colIndex)
      if (hierarchicalHeader) {
        combinedHeaders[colIndex] = hierarchicalHeader
      }
    }

    // Debug the combined headers
    console.log(
      `\n[DEBUG] Combined hierarchical headers (${combinedHeaders.length} columns):`
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

    console.log(`\n[DEBUG] Starting column mapping process...`)
    console.log(
      `[DEBUG] Finding matches for ${
        Object.keys(columnMap).length
      } database columns in ${combinedHeaders.length} Excel columns`
    )

    // Log whether we have any columns to match
    if (Object.keys(columnMap).length === 0) {
      console.log(
        "[ERROR] ⚠️ No columns found in columnMap! Column matching cannot proceed."
      )
      console.log(
        "[ERROR] This may be due to incorrect config structure or missing indeksData fields."
      )
      console.log("[ERROR] Raw config:", tableConfig)
    }

    // Detect indices for each column
    const detectedIndices = {}
    const unmatchedColumns = []

    Object.entries(columnMap).forEach(([dataIndex, column]) => {
      if (!column.judul) {
        console.log(`[WARNING] Column ${dataIndex} has no judul defined!`)
        return
      }

      const possibleNames = [
        column.judul,
        dataIndex.replace(/_/g, " "),
        dataIndex,
      ]

      console.log(
        `\n[DEBUG] Processing column "${column.judul}" (${dataIndex})`
      )

      const index = findColumnIndexByHeader(
        combinedHeaders,
        possibleNames,
        column
      )
      if (index !== -1) {
        detectedIndices[dataIndex] = index
        console.log(
          `  ✅ MATCHED to Excel column ${index + 1}: "${
            combinedHeaders[index]
          }"`
        )
      } else {
        unmatchedColumns.push({ indeksData: dataIndex, judul: column.judul })
        console.log(`  ❌ NO MATCH FOUND in Excel headers`)
      }
    })

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
