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

  return columns
}

/**
 * Deteksi apakah header merupakan bagian dari info/metadata
 */
const detectInfoHeader = (headerStr) => {
  // ✅ TAMBAH: Defensive check
  if (!headerStr || typeof headerStr !== "string") {
    return true // Treat non-string as info header
  }

  const normalized = headerStr.toLowerCase().trim()

  // Pattern 1: Header yang diakhiri dengan titik dua (label format)
  if (normalized.endsWith(":")) {
    return true
  }

  // Pattern 2: Header yang merupakan kata kunci metadata
  const metadataKeywords = [
    "info",
    "catatan",
    "note",
    "link",
    "data",
    "jm aktif",
    "jm asing",
    "nmupps",
    "nmaft",
    "nmapt",
    "tabel",
    "sheet",
    "lembar",
  ]

  const hasMetadataKeyword = metadataKeywords.some(
    (keyword) => normalized.includes(keyword) || normalized === keyword
  )

  if (hasMetadataKeyword) {
    return true
  }

  // Pattern 3: Header yang hanya berisi angka
  if (/^\d+\.?$/.test(normalized)) {
    return true
  }

  // Pattern 4: Header yang terlalu pendek (1 karakter)
  if (normalized.length <= 1) {
    return true
  }

  return false
}

/**
 * Fungsi untuk menggabungkan header parent dan child
 */
const combineHeaderWithParent = (parentHeader, childHeader) => {
  // ✅ TAMBAH: Defensive check
  if (!parentHeader && !childHeader) {
    return ""
  }

  if (!parentHeader) {
    return childHeader || ""
  }

  if (!childHeader) {
    return parentHeader || ""
  }

  // Convert to string untuk safety
  const parentStr = String(parentHeader).trim()
  const childStr = String(childHeader).trim()

  if (parentStr === childStr) {
    return childStr
  }

  // Jika child header kosong, gunakan parent
  if (childStr === "") {
    return parentStr
  }

  // Jika parent header sudah ada dalam child header, gunakan child saja
  if (childStr.toLowerCase().includes(parentStr.toLowerCase())) {
    return childStr
  }

  // Gabungkan parent dan child
  return `${parentStr} - ${childStr}`
}

/**
 * ✅ FIXED: Fungsi untuk memproses hierarchical headers dari Excel dengan defensive checks
 */
const processHierarchicalHeaders = (headerRows) => {
  if (!headerRows || headerRows.length === 0) {
    return []
  }

  // Jika hanya ada satu baris header
  if (headerRows.length === 1) {
    return headerRows[0]
      .map((header, index) => ({
        name: header
          ? String(header).trim() || `Column_${index + 1}`
          : `Column_${index + 1}`,
        column: String.fromCharCode(65 + index),
        cell: `${String.fromCharCode(65 + index)}1`,
        originalIndex: index,
        parentName: null,
        grandparentName: null,
      }))
      .filter((header, index) => {
        // Filter out empty columns at the end
        const originalHeader = headerRows[0][index]
        return originalHeader && String(originalHeader).trim() !== ""
      })
  }

  // Temukan kolom terakhir yang benar-benar memiliki data
  let lastValidColumn = -1
  for (
    let colIndex = 0;
    colIndex < Math.max(...headerRows.map((row) => row.length));
    colIndex++
  ) {
    let hasValidData = false
    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const cellValue = headerRows[rowIndex][colIndex]
      if (
        cellValue &&
        String(cellValue).trim() !== "" &&
        !detectInfoHeader(String(cellValue))
      ) {
        hasValidData = true
        lastValidColumn = colIndex
        break
      }
    }
  }

  // Jika tidak ada kolom valid yang ditemukan, gunakan default
  if (lastValidColumn === -1) {
    lastValidColumn = headerRows[0].length - 1
  }

  // Batasi maxColumns ke lastValidColumn + 1
  const maxColumns = lastValidColumn + 1
  const hierarchicalHeaders = []

  // Buat mapping untuk parent headers yang spanning
  const parentSpanMap = {}

  // Analisis setiap baris header untuk mencari spanning cells
  for (let rowIndex = 0; rowIndex < headerRows.length - 1; rowIndex++) {
    const currentRow = headerRows[rowIndex]
    let currentParent = null
    let currentParentStartCol = -1

    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const cellValue = currentRow[colIndex]
      const nextRowValue = headerRows[rowIndex + 1]
        ? headerRows[rowIndex + 1][colIndex]
        : null

      // ✅ FIXED: Add defensive checks
      const cellValueStr = cellValue ? String(cellValue).trim() : ""
      const nextRowValueStr = nextRowValue ? String(nextRowValue).trim() : ""

      if (cellValueStr !== "" && !detectInfoHeader(cellValueStr)) {
        // Ini adalah parent header
        currentParent = cellValueStr
        currentParentStartCol = colIndex
      } else if (
        currentParent &&
        nextRowValueStr !== "" &&
        !detectInfoHeader(nextRowValueStr)
      ) {
        // Cell kosong tapi ada value di row berikutnya, ini spanning
        if (!parentSpanMap[`${rowIndex}_${colIndex}`]) {
          parentSpanMap[`${rowIndex}_${colIndex}`] = currentParent
        }
      }

      // Simpan parent mapping untuk kolom ini
      if (currentParent) {
        parentSpanMap[`${rowIndex}_${colIndex}`] = currentParent

        // Cek apakah parent masih berlaku untuk kolom berikutnya
        const nextColValue = currentRow[colIndex + 1]
        const nextColValueStr = nextColValue ? String(nextColValue).trim() : ""

        if (nextColValueStr !== "" && !detectInfoHeader(nextColValueStr)) {
          // Ada header baru di kolom berikutnya, reset parent
          currentParent = null
          currentParentStartCol = -1
        }
      }

      // Reset parent jika sudah melewati batas kolom valid
      if (colIndex >= lastValidColumn) {
        currentParent = null
        currentParentStartCol = -1
      }
    }
  }

  // Proses setiap kolom
  for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
    const columnLetter = String.fromCharCode(65 + colIndex)
    let finalHeader = ""
    let parentName = null
    let grandparentName = null

    // Cek apakah kolom ini memiliki data valid di setidaknya satu baris
    let hasValidContent = false
    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const cellValue = headerRows[rowIndex][colIndex]
      const cellValueStr = cellValue ? String(cellValue).trim() : ""

      if (cellValueStr !== "" && !detectInfoHeader(cellValueStr)) {
        hasValidContent = true
        break
      }
    }

    // Jika kolom tidak memiliki content valid, skip
    if (!hasValidContent) {
      continue
    }

    // Ambil header dari setiap level (dari atas ke bawah)
    const headerValues = []
    const parentValues = []

    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const headerValue = headerRows[rowIndex][colIndex]
      const headerValueStr = headerValue ? String(headerValue).trim() : ""

      if (headerValueStr !== "" && !detectInfoHeader(headerValueStr)) {
        headerValues.push({
          value: headerValueStr,
          row: rowIndex,
          col: colIndex,
        })
      } else {
        // Cek apakah ada parent dari spanning, tapi hanya jika ada child header yang valid
        const parentKey = `${rowIndex}_${colIndex}`
        if (parentSpanMap[parentKey]) {
          // Validasi bahwa ada child header di baris berikutnya
          let hasChildHeader = false
          for (
            let nextRow = rowIndex + 1;
            nextRow < headerRows.length;
            nextRow++
          ) {
            const childValue = headerRows[nextRow][colIndex]
            const childValueStr = childValue ? String(childValue).trim() : ""

            if (childValueStr !== "" && !detectInfoHeader(childValueStr)) {
              hasChildHeader = true
              break
            }
          }

          if (hasChildHeader) {
            parentValues.push({
              value: parentSpanMap[parentKey],
              row: rowIndex,
              col: colIndex,
            })
          }
        }
      }
    }

    // Combine header values dan parent values
    const allHeaders = [...parentValues, ...headerValues]
    allHeaders.sort((a, b) => a.row - b.row)

    // Ambil unique values berdasarkan row
    const uniqueHeaders = []
    const seenRows = new Set()

    allHeaders.forEach((header) => {
      if (!seenRows.has(header.row)) {
        uniqueHeaders.push(header.value)
        seenRows.add(header.row)
      }
    })

    // Tentukan struktur hierarchy
    if (uniqueHeaders.length === 0) {
      finalHeader = `Column_${colIndex + 1}`
    } else if (uniqueHeaders.length === 1) {
      finalHeader = uniqueHeaders[0]
    } else if (uniqueHeaders.length === 2) {
      parentName = uniqueHeaders[0]
      finalHeader = combineHeaderWithParent(uniqueHeaders[0], uniqueHeaders[1])
    } else if (uniqueHeaders.length >= 3) {
      grandparentName = uniqueHeaders[0]
      parentName = uniqueHeaders[1]
      finalHeader = combineHeaderWithParent(
        combineHeaderWithParent(uniqueHeaders[0], uniqueHeaders[1]),
        uniqueHeaders[2]
      )
    }

    // ✅ FIXED: Fallback dengan defensive checks
    if (!parentName && colIndex > 0) {
      for (let prevCol = colIndex - 1; prevCol >= 0; prevCol--) {
        for (let rowIndex = 0; rowIndex < headerRows.length - 1; rowIndex++) {
          const prevHeader = headerRows[rowIndex][prevCol]
          const currentRowHeader = headerRows[rowIndex][colIndex]

          // ✅ FIXED: Add defensive string conversion and null checks
          const prevHeaderStr = prevHeader ? String(prevHeader).trim() : ""
          const currentRowHeaderStr = currentRowHeader
            ? String(currentRowHeader).trim()
            : ""

          if (
            prevHeaderStr !== "" &&
            !detectInfoHeader(prevHeaderStr) &&
            currentRowHeaderStr === ""
          ) {
            // Validasi bahwa ini benar-benar parent dengan mengecek apakah
            // ada child header di baris berikutnya
            const nextRowHeader =
              headerRows[rowIndex + 1] && headerRows[rowIndex + 1][colIndex]
            const nextRowHeaderStr = nextRowHeader
              ? String(nextRowHeader).trim()
              : ""

            const hasChildInNextRow = nextRowHeaderStr !== ""

            if (hasChildInNextRow) {
              parentName = prevHeaderStr

              // Update final header jika belum include parent
              const currentBottomHeader =
                headerRows[headerRows.length - 1][colIndex]
              const currentBottomHeaderStr = currentBottomHeader
                ? String(currentBottomHeader).trim()
                : ""

              if (currentBottomHeaderStr && !finalHeader.includes(parentName)) {
                finalHeader = combineHeaderWithParent(
                  parentName,
                  currentBottomHeaderStr
                )
              }
              break
            }
          }
        }
        if (parentName) break
      }
    }

    hierarchicalHeaders.push({
      name: finalHeader || `Column_${colIndex + 1}`,
      column: columnLetter,
      cell: `${columnLetter}${headerRows.length}`,
      originalIndex: colIndex,
      parentName: parentName,
      grandparentName: grandparentName,
      isGroup: Boolean(parentName || grandparentName),
      children: [],
    })
  }

  return hierarchicalHeaders
}

// ✅ REST OF THE FILE REMAINS THE SAME...
export const mapColumnsUsingAI = async (
  dbColumns,
  excelHeaders,
  semanticThreshold = 0.65
) => {
  try {
    console.log("🤖 Calling AI mapping service...")
    console.log("📋 DB Columns:", dbColumns.length)
    console.log("📊 Excel Headers:", excelHeaders.length)

    const formattedDbColumns = dbColumns.map((column) => ({
      indeksData: column.indeksData,
      title: column.judul,
    }))

    const filteredHeaders = excelHeaders
      .filter((header) => {
        // Skip header yang kosong
        if (!header || !header.name || String(header.name).trim() === "") {
          return false
        }

        const headerStr = String(header.name).trim()

        // Skip header yang merupakan bagian dari info/metadata
        const isInfoHeader = detectInfoHeader(headerStr)
        if (isInfoHeader) {
          return false
        }

        return true
      })
      .map((header) => header.name) // Extract hanya name untuk AI mapping

    console.log("🎯 Filtered headers for AI:", filteredHeaders)

    const response = await axiosInstance.post("/data-mapping", {
      database_columns: formattedDbColumns,
      excel_headers: filteredHeaders,
      semantic_threshold: semanticThreshold,
    })

    console.log("🔄 AI service response:", response.data)

    if (response.data && response.data.success && response.data.mapping) {
      console.log("✅ AI mapping successful!")
      return response.data.mapping
    } else {
      console.error(
        "❌ AI mapping failed:",
        response.data?.error || "Unknown error"
      )
      throw new Error(
        response.data?.error || "AI mapping service returned failure"
      )
    }
  } catch (error) {
    console.error("❌ Error calling AI mapping service:", error)

    if (error.response) {
      console.error("📡 Response status:", error.response.status)
      console.error("📡 Response data:", error.response.data)
    }

    throw new Error(`AI mapping failed: ${error.message}`)
  }
}

export const extractAllColumnsFromConfig = (tableConfig) => {
  const allColumns = []
  const dataColumns = []

  if (!tableConfig) {
    console.log("[ERROR] Table config is null or undefined!")
    return { allColumns: [], dataColumns: [] }
  }

  let columnsSource = null
  let columns = null

  if (Array.isArray(tableConfig.columns)) {
    columnsSource = "direct columns array"
    columns = tableConfig.columns
  } else if (tableConfig.kolom && Array.isArray(tableConfig.kolom)) {
    columnsSource = "kolom property"
    columns = tableConfig.kolom
  } else if (
    tableConfig.tables &&
    tableConfig.tables.length > 0 &&
    tableConfig.tables[0]
  ) {
    const firstTable = tableConfig.tables[0]

    if (Array.isArray(firstTable.columns)) {
      columnsSource = "tables[0].columns"
      columns = firstTable.columns
    } else if (firstTable.kolom && Array.isArray(firstTable.kolom)) {
      columnsSource = "tables[0].kolom"
      columns = firstTable.kolom
    }
  }

  if (!columns) {
    console.log(
      "[ERROR] Could not find columns in any expected location in config!"
    )
    return { allColumns: [], dataColumns: [] }
  }

  columns.forEach((column) => {
    allColumns.push(column)

    if (column.isGroup && Array.isArray(column.children)) {
      column.children.forEach((child) => {
        if (!child.isGroup) {
          dataColumns.push({
            ...child,
            parentTitle: column.judul,
            parentIndeksData: column.indeksData,
          })
        } else if (child.children && Array.isArray(child.children)) {
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
      dataColumns.push(column)
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
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const merges = sheet["!merges"] || []

    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: 0,
      defval: "",
    })

    let headerRowIndex = -1
    let excelStartRow = tableConfig.barisAwalExcel || 0
    const maxRowsToScan = Math.min(20, jsonData.length)

    if (excelStartRow && excelStartRow > 0) {
      headerRowIndex = excelStartRow - 1
    } else {
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
    }

    const headerRows = []
    let currentHeaderIndex = headerRowIndex
    let hasFoundNumericRow = false
    let maxHeaderRows = 3

    while (
      currentHeaderIndex < jsonData.length &&
      !hasFoundNumericRow &&
      headerRows.length < maxHeaderRows
    ) {
      const row = jsonData[currentHeaderIndex]
      if (!row || row.length === 0) {
        break
      }

      const firstCell = String(row[0] || "").trim()
      const hasNumericFirstCell = /^\d+\.?$/.test(firstCell)

      if (hasNumericFirstCell && headerRows.length > 0) {
        hasFoundNumericRow = true
        break
      }

      headerRows.push(row)
      currentHeaderIndex++
    }

    if (headerRows.length === 0) {
      headerRows.push(jsonData[headerRowIndex] || [])
    }

    // ✅ Process hierarchical headers with improved error handling
    const hierarchicalHeaders = processHierarchicalHeaders(headerRows)

    // Buat combinedHeaders yang berisi hierarchical structure
    const combinedHeaders = hierarchicalHeaders.map((header) => header.name)

    // Create structured headers untuk response
    const structuredHeaders = hierarchicalHeaders

    // Filter out info headers dari hierarchicalHeaders sebelum digunakan untuk mapping
    const validHeaders = hierarchicalHeaders.filter((header) => {
      return !detectInfoHeader(header.name)
    })

    // Create mapping dari validHeaders ke hierarchicalHeaders indices
    const headerIndexMap = {}
    let validIndex = 0
    hierarchicalHeaders.forEach((header, originalIndex) => {
      if (!detectInfoHeader(header.name)) {
        headerIndexMap[validIndex] = originalIndex
        validIndex++
      }
    })

    const dataStartRow = headerRowIndex + headerRows.length

    const filteredJsonData = jsonData.filter(
      (row, index) =>
        row &&
        index >= dataStartRow &&
        row.length > 0 &&
        row.some((cell) => cell !== "")
    )

    const { allColumns, dataColumns } = extractAllColumnsFromConfig(tableConfig)

    const columnMap = {}
    dataColumns.forEach((column) => {
      if (column.indeksData) {
        columnMap[column.indeksData] = column
      }
    })

    const detectedIndices = {}
    const unmatchedColumns = []

    // ✅ HANYA MENGGUNAKAN AI MAPPING - NO FALLBACK
    try {
      console.log("🤖 Using AI mapping for column detection...")

      const aiMapping = await mapColumnsUsingAI(
        Object.values(columnMap),
        validHeaders,
        0.65
      )

      if (aiMapping && typeof aiMapping === "object") {
        console.log("✅ AI mapping successful:", aiMapping)

        Object.entries(columnMap).forEach(([dataIndex, column]) => {
          if (aiMapping[dataIndex]) {
            const { excelIndex, excelHeader } = aiMapping[dataIndex]
            // Map kembali ke index asli di hierarchicalHeaders
            const originalIndex = headerIndexMap[excelIndex] || excelIndex
            detectedIndices[dataIndex] = originalIndex
            console.log(
              `✅ Mapped: ${dataIndex} -> ${excelHeader} (index: ${originalIndex})`
            )
          } else {
            unmatchedColumns.push({
              indeksData: dataIndex,
              judul: column.judul,
            })
            console.log(`❌ Unmatched: ${dataIndex} (${column.judul})`)
          }
        })
      } else {
        console.error("❌ AI mapping failed or returned invalid response")
        throw new Error("AI mapping service failed")
      }
    } catch (error) {
      console.error("❌ AI mapping error:", error)

      // ❌ NO FALLBACK - THROW ERROR INSTEAD
      message.error(
        "AI column mapping failed. Please check your data format and try again."
      )
      throw new Error(`Column mapping failed: ${error.message}`)
    }

    // Log mapping results
    console.log("📊 Final mapping results:")
    console.log("✅ Detected indices:", detectedIndices)
    console.log("❌ Unmatched columns:", unmatchedColumns)

    const transformedRows = filteredJsonData.map((row, rowIdx) => {
      const transformedRow = {}

      Object.entries(detectedIndices).forEach(([dataIndex, colIndex]) => {
        transformedRow[dataIndex] = row[colIndex] || ""
      })

      return transformedRow
    })

    return {
      rawData: filteredJsonData,
      headers: combinedHeaders,
      structuredHeaders: structuredHeaders,
      hierarchicalHeaders: hierarchicalHeaders,
      detectedIndices,
      columnMap,
      tableConfig,
      headerRowIndex,
      headerRows,
      jsonData,
      dataStartRow,
      transformedRows,
      unmatchedColumns, // Include unmatched columns for debugging
    }
  } catch (error) {
    console.error("Error saat memproses data Excel:", error)
    message.error(
      "Gagal memproses data Excel: " +
        (error.message || "Error tidak diketahui")
    )
    throw error // Re-throw error instead of returning empty data
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
