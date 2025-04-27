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

  if (columns.length === 0 && tableConfig.code) {
    console.log(
      `Tabel ${tableConfig.code} tidak memiliki kolom yang didefinisikan, Anda mungkin perlu membuatnya terlebih dahulu`
    )
  }

  return columns
}

export const findColumnIndexByHeader = (headers, possibleNames) => {
  if (!headers || !Array.isArray(headers)) return -1

  const dataIndex =
    possibleNames.length > 0 ? possibleNames[possibleNames.length - 1] : ""

  // Transform headers to string for comparison
  const processedHeaders = headers.map((h) => {
    return String(h || "")
      .toLowerCase()
      .trim()
  })

  // Log all headers to diagnose the issue
  console.log("Available headers:", processedHeaders)

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
    if (bestScore > 0.5) {
      // Threshold for considering a match
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

  // Debug information
  if (columnScores.length > 0) {
    console.log(
      `Best match for "${dataIndex}": "${columnScores[0].header}" with score ${columnScores[0].score}`
    )
    console.log(`Match details:`, columnScores[0].matches)
  } else {
    console.log(`No matches found for "${dataIndex}"`)
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

export const processExcelDataBase = async (
  workbook,
  tableCode,
  config,
  prodiName
) => {
  if (!config) {
    console.error("Tidak ada konfigurasi tersedia untuk memproses data Excel")
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  const tableConfig = config.tables.find(
    (t) =>
      (typeof t === "string" && t === tableCode) || (t && t.code === tableCode)
  )

  if (!tableConfig) {
    console.error(`Konfigurasi tabel tidak ditemukan untuk ${tableCode}`)
    message.error(`Konfigurasi tabel tidak ditemukan untuk ${tableCode}`)
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  const actualTableConfig =
    typeof tableConfig === "string" ? { code: tableConfig } : tableConfig

  try {
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const merges = sheet["!merges"] || []

    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: 0,
      defval: "",
    })

    let headerRowIndex = -1
    let excelStartRow = 0
    const maxRowsToScan = Math.min(20, jsonData.length)

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
            break
          }
        }
      }

      if (headerRowIndex !== -1) break
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0
      excelStartRow = 0
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
        break
      }

      // Add this row as a potential header row
      headerRows.push(row)
      currentHeaderIndex++
    }

    // We need at least one header row
    if (headerRows.length === 0) {
      headerRows.push(jsonData[headerRowIndex] || [])
    }

    // Now combine all header rows into a hierarchical header structure
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

    const dataStartRow = headerRowIndex + headerRows.length
    const filteredJsonData = jsonData.filter(
      (row, index) =>
        row &&
        index >= dataStartRow &&
        row.length > 0 &&
        row.some((cell) => cell !== "")
    )

    const allColumns = extractAllColumnsFromConfig(actualTableConfig)
    const columnMap = {}
    allColumns.forEach((column) => {
      if (column.data_index) {
        columnMap[column.data_index] = column
      }
    })

    const detectedIndices = {}
    Object.entries(columnMap).forEach(([dataIndex, column]) => {
      if (!column.title) return

      const possibleNames = [
        column.title,
        dataIndex.replace(/_/g, " "),
        dataIndex,
      ]

      const index = findColumnIndexByHeader(combinedHeaders, possibleNames)
      if (index !== -1) {
        detectedIndices[dataIndex] = index
      }
    })

    return {
      rawData: filteredJsonData,
      headers: combinedHeaders,
      detectedIndices,
      columnMap,
      tableConfig: actualTableConfig,
      headerRowIndex,
      headerRows,
      jsonData,
      dataStartRow,
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
