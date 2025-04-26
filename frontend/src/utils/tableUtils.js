import * as XLSX from "xlsx"
import { message } from "antd"
// Import the string-similarity library
// To use this, you'll need to install it with: npm install string-similarity
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

  // Look for special cases with TS prefix/suffix
  const tsInfo = extractTSInfo(dataIndex)

  // Calculate scores for all headers against all field variants
  const columnScores = []

  for (let i = 0; i < processedHeaders.length; i++) {
    const header = processedHeaders[i]
    if (!header) continue

    let bestScore = 0
    let matchDetails = []

    // Check for hierarchical headers (with " - " delimiter)
    if (header.includes(" - ")) {
      const [parentPart, childPart] = header.split(" - ").map((p) => p.trim())
      const headerTsInfo = extractTSInfo(childPart)

      // TS special handling
      if (tsInfo.hasTS && headerTsInfo.hasTS) {
        if (
          tsInfo.hasNumber &&
          headerTsInfo.hasNumber &&
          tsInfo.number === headerTsInfo.number
        ) {
          bestScore += 0.3 // Bonus for matching TS number
          matchDetails.push(`Matching TS number: ${tsInfo.number}`)
        } else if (!tsInfo.hasNumber && !headerTsInfo.hasNumber) {
          bestScore += 0.2 // Bonus for plain TS match
          matchDetails.push("Both contain plain TS")
        }
      }

      // Compare each field variant with parent and child parts
      for (const variant of fieldVariants) {
        // Using the stringSimilarity library for better comparison
        const parentSimilarity = stringSimilarity.compareTwoStrings(
          variant,
          parentPart
        )
        const childSimilarity = stringSimilarity.compareTwoStrings(
          variant,
          childPart
        )

        // Get the best score between parent and child, with higher weight to child
        const weightedScore = Math.max(
          parentSimilarity * 0.6,
          childSimilarity * 0.8
        )

        if (weightedScore > bestScore) {
          bestScore = weightedScore
          matchDetails = [
            `Similarity with hierarchical header: ${(
              weightedScore * 100
            ).toFixed(2)}%`,
          ]

          if (parentSimilarity > 0.7) {
            matchDetails.push(
              `High parent similarity: ${(parentSimilarity * 100).toFixed(2)}%`
            )
          }

          if (childSimilarity > 0.7) {
            matchDetails.push(
              `High child similarity: ${(childSimilarity * 100).toFixed(2)}%`
            )
          }
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
    }

    // Adjust score based on special patterns
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
  }

  return columnScores.length > 0 ? columnScores[0].index : -1
}

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

    const tsPattern = /ts[-_](\d+)/i
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

    const mainHeaderRow = jsonData[headerRowIndex] || []
    let subHeaderRow = []
    let hasSubHeaders = false

    if (headerRowIndex + 1 < jsonData.length) {
      subHeaderRow = jsonData[headerRowIndex + 1] || []
      const nonEmptyCells = subHeaderRow.filter((cell) => cell !== "").length
      const firstCell = String(subHeaderRow[0] || "").trim()
      const hasNumericFirstCell = /^\d+\.?$/.test(firstCell)

      if (nonEmptyCells > 0 && !hasNumericFirstCell) {
        hasSubHeaders = true
      }
    }

    let combinedHeaders = [...mainHeaderRow]

    if (hasSubHeaders) {
      for (let i = 0; i < mainHeaderRow.length; i++) {
        const mainHeader = mainHeaderRow[i]
        if (!mainHeader || mainHeader === "") continue

        let emptyCount = 0
        let j = i + 1
        while (
          j < mainHeaderRow.length &&
          (!mainHeaderRow[j] || mainHeaderRow[j] === "")
        ) {
          emptyCount++
          j++
        }

        if (emptyCount > 0 && hasSubHeaders) {
          let hasSubValues = false
          for (let k = i; k <= i + emptyCount; k++) {
            if (subHeaderRow[k] && subHeaderRow[k] !== "") {
              hasSubValues = true
              break
            }
          }

          if (hasSubValues) {
            if (subHeaderRow[i] && subHeaderRow[i] !== "") {
              combinedHeaders[i] = `${mainHeader} - ${subHeaderRow[i]}`
            }

            for (let k = i + 1; k <= i + emptyCount; k++) {
              if (subHeaderRow[k] && subHeaderRow[k] !== "") {
                combinedHeaders[k] = `${mainHeader} - ${subHeaderRow[k]}`
              }
            }
          }
        }
      }

      const tingkatIndex = mainHeaderRow.findIndex(
        (header) =>
          String(header || "")
            .toLowerCase()
            .trim() === "tingkat"
      )

      if (tingkatIndex !== -1) {
        let nextHeaderIndex = tingkatIndex + 1
        while (
          nextHeaderIndex < mainHeaderRow.length &&
          (!mainHeaderRow[nextHeaderIndex] ||
            mainHeaderRow[nextHeaderIndex] === "")
        ) {
          nextHeaderIndex++
        }

        for (let k = tingkatIndex; k < nextHeaderIndex; k++) {
          const subValue = String(subHeaderRow[k] || "")
            .toLowerCase()
            .trim()

          if (
            subValue.includes("internasional") ||
            subValue === "ln" ||
            subValue === "int"
          ) {
            combinedHeaders[k] = "Tingkat - Internasional"
          } else if (
            subValue.includes("nasional") ||
            subValue === "n" ||
            subValue === "dn"
          ) {
            combinedHeaders[k] = "Tingkat - Nasional"
          } else if (
            subValue.includes("lokal") ||
            subValue.includes("wilayah") ||
            subValue === "l"
          ) {
            combinedHeaders[k] = "Tingkat - Lokal/Wilayah"
          }
        }
      }
    }

    const dataStartRow = hasSubHeaders ? headerRowIndex + 2 : headerRowIndex + 1
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
      hasSubHeaders,
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
