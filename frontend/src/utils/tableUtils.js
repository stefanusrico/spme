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
 * Deteksi apakah header merupakan bagian dari info/metadata.
 */
const detectInfoHeader = (headerStr) => {
  if (!headerStr || typeof headerStr !== "string") {
    return true // Anggap non-string sebagai info header
  }

  const normalized = headerStr.toLowerCase().trim()

  if (normalized.endsWith(":")) {
    return true
  }

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

  if (
    metadataKeywords.some(
      (keyword) => normalized.includes(keyword) || normalized === keyword
    )
  ) {
    return true
  }

  if (/^\d+\.?$/.test(normalized)) {
    return true
  }

  if (normalized.length <= 1) {
    return true
  }

  return false
}

/**
 * Fungsi untuk menggabungkan header parent dan child.
 */
const combineHeaderWithParent = (parentHeader, childHeader) => {
  if (!parentHeader && !childHeader) {
    return ""
  }
  if (!parentHeader) {
    return childHeader || ""
  }
  if (!childHeader) {
    return parentHeader || ""
  }

  const parentStr = String(parentHeader).trim()
  const childStr = String(childHeader).trim()

  if (parentStr === childStr) {
    return childStr
  }
  if (childStr === "") {
    return parentStr
  }
  if (childStr.toLowerCase().includes(parentStr.toLowerCase())) {
    return childStr
  }

  return `${parentStr} - ${childStr}`
}

/**
 * Fungsi untuk memproses hierarchical headers dari Excel.
 */
const processHierarchicalHeaders = (headerRows) => {
  if (!headerRows || headerRows.length === 0) {
    return []
  }

  // Jika hanya ada satu baris header
  if (headerRows.length === 1) {
    return (
      headerRows[0]
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
        // Filter kolom kosong di bagian akhir
        .filter((header, index) => {
          const originalHeader = headerRows[0][index]
          return originalHeader && String(originalHeader).trim() !== ""
        })
    )
  }

  // Temukan kolom terakhir yang benar-benar memiliki data
  let lastValidColumn = -1
  for (
    let colIndex = 0;
    colIndex < Math.max(...headerRows.map((row) => row.length));
    colIndex++
  ) {
    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const cellValue = headerRows[rowIndex][colIndex]
      if (
        cellValue &&
        String(cellValue).trim() !== "" &&
        !detectInfoHeader(String(cellValue))
      ) {
        lastValidColumn = colIndex
        break
      }
    }
  }

  if (lastValidColumn === -1) {
    lastValidColumn = headerRows[0].length - 1
  }

  const maxColumns = lastValidColumn + 1
  const hierarchicalHeaders = []
  const parentSpanMap = {}

  // Analisis setiap baris header untuk mencari spanning cells
  for (let rowIndex = 0; rowIndex < headerRows.length - 1; rowIndex++) {
    const currentRow = headerRows[rowIndex]
    let currentParent = null
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const cellValue = currentRow[colIndex]
      const nextRowValue = headerRows[rowIndex + 1]
        ? headerRows[rowIndex + 1][colIndex]
        : null

      const cellValueStr = cellValue ? String(cellValue).trim() : ""
      const nextRowValueStr = nextRowValue ? String(nextRowValue).trim() : ""

      if (cellValueStr !== "" && !detectInfoHeader(cellValueStr)) {
        currentParent = cellValueStr
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

      if (currentParent) {
        parentSpanMap[`${rowIndex}_${colIndex}`] = currentParent
        const nextColValue = currentRow[colIndex + 1]
        const nextColValueStr = nextColValue ? String(nextColValue).trim() : ""
        if (nextColValueStr !== "" && !detectInfoHeader(nextColValueStr)) {
          currentParent = null
        }
      }
      if (colIndex >= lastValidColumn) {
        currentParent = null
      }
    }
  }

  for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
    const columnLetter = String.fromCharCode(65 + colIndex)
    let finalHeader = ""
    let parentName = null
    let grandparentName = null
    let hasValidContent = false

    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const cellValue = headerRows[rowIndex][colIndex]
      const cellValueStr = cellValue ? String(cellValue).trim() : ""
      if (cellValueStr !== "" && !detectInfoHeader(cellValueStr)) {
        hasValidContent = true
        break
      }
    }

    if (!hasValidContent) {
      continue
    }

    const headerValues = []
    const parentValues = []

    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const headerValue = headerRows[rowIndex][colIndex]
      const headerValueStr = headerValue ? String(headerValue).trim() : ""

      if (headerValueStr !== "" && !detectInfoHeader(headerValueStr)) {
        headerValues.push({ value: headerValueStr, row: rowIndex })
      } else {
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
            })
          }
        }
      }
    }

    const allHeaders = [...parentValues, ...headerValues].sort(
      (a, b) => a.row - b.row
    )
    const uniqueHeaders = []
    const seenRows = new Set()
    allHeaders.forEach((header) => {
      if (!seenRows.has(header.row)) {
        uniqueHeaders.push(header.value)
        seenRows.add(header.row)
      }
    })

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

    if (!parentName && colIndex > 0) {
      for (let prevCol = colIndex - 1; prevCol >= 0; prevCol--) {
        for (let rowIndex = 0; rowIndex < headerRows.length - 1; rowIndex++) {
          const prevHeader = headerRows[rowIndex][prevCol]
          const currentRowHeader = headerRows[rowIndex][colIndex]
          const prevHeaderStr = prevHeader ? String(prevHeader).trim() : ""
          const currentRowHeaderStr = currentRowHeader
            ? String(currentRowHeader).trim()
            : ""

          if (
            prevHeaderStr !== "" &&
            !detectInfoHeader(prevHeaderStr) &&
            currentRowHeaderStr === ""
          ) {
            const nextRowHeader =
              headerRows[rowIndex + 1] && headerRows[rowIndex + 1][colIndex]
            const hasChildInNextRow =
              nextRowHeader && String(nextRowHeader).trim() !== ""
            if (hasChildInNextRow) {
              parentName = prevHeaderStr
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

export const mapColumnsUsingAI = async (
  dbColumns,
  excelHeaders,
  semanticThreshold = 0.65
) => {
  try {
    const formattedDbColumns = dbColumns.map((column) => ({
      indeksData: column.indeksData,
      title: column.judul,
    }))

    const filteredHeaders = excelHeaders
      .filter((header) => {
        if (!header || !header.name || String(header.name).trim() === "") {
          return false
        }
        const headerStr = String(header.name).trim()
        if (detectInfoHeader(headerStr)) {
          return false
        }
        return true
      })
      .map((header) => header.name)

    const response = await axiosInstance.post("/data-mapping", {
      database_columns: formattedDbColumns,
      excel_headers: filteredHeaders,
      semantic_threshold: semanticThreshold,
    })

    if (response.data && response.data.success && response.data.mapping) {
      return response.data.mapping
    } else {
      throw new Error(
        response.data?.error || "AI mapping service returned failure"
      )
    }
  } catch (error) {
    console.error("Error calling AI mapping service:", error)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }
    throw new Error(`AI mapping failed: ${error.message}`)
  }
}

export const extractAllColumnsFromConfig = (tableConfig) => {
  const allColumns = []
  const dataColumns = []

  if (!tableConfig) {
    return { allColumns: [], dataColumns: [] }
  }

  let columns = null
  if (Array.isArray(tableConfig.columns)) {
    columns = tableConfig.columns
  } else if (tableConfig.kolom && Array.isArray(tableConfig.kolom)) {
    columns = tableConfig.kolom
  } else if (
    tableConfig.tables &&
    tableConfig.tables.length > 0 &&
    tableConfig.tables[0]
  ) {
    const firstTable = tableConfig.tables[0]
    if (Array.isArray(firstTable.columns)) {
      columns = firstTable.columns
    } else if (firstTable.kolom && Array.isArray(firstTable.kolom)) {
      columns = firstTable.kolom
    }
  }

  if (!columns) {
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
    message.error("Tidak ada konfigurasi tersedia untuk memproses data Excel")
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
    message.error(`Konfigurasi tabel tidak ditemukan untuk ${tableCode}`)
    return { rawData: [], headers: [], detectedIndices: {} }
  }

  try {
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: 0,
      defval: "",
    })

    let headerRowIndex = -1
    let excelStartRow = tableConfig.barisAwalExcel || 0
    const maxRowsToScan = Math.min(20, jsonData.length)

    if (excelStartRow > 0) {
      headerRowIndex = excelStartRow - 1
    } else {
      for (let i = 0; i < maxRowsToScan; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || "")
            .trim()
            .toLowerCase()
          if (
            (cell === "no." ||
              cell === "no" ||
              cell === "tahun masuk" ||
              cell === "tahun akademik" ||
              cell === "tahun lulus") &&
            j + 1 < row.length &&
            row[j + 1] !== ""
          ) {
            if (row.filter((c) => c !== "").length >= 3) {
              headerRowIndex = i
              break
            }
          }
        }
        if (headerRowIndex !== -1) break
      }
      if (headerRowIndex === -1) {
        headerRowIndex = 0
      }
    }

    const headerRows = []
    let currentHeaderIndex = headerRowIndex
    let hasFoundNumericRow = false
    const maxHeaderRows = 3

    while (
      currentHeaderIndex < jsonData.length &&
      !hasFoundNumericRow &&
      headerRows.length < maxHeaderRows
    ) {
      const row = jsonData[currentHeaderIndex]
      if (!row || row.length === 0) break

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

    const hierarchicalHeaders = processHierarchicalHeaders(headerRows)
    const validHeaders = hierarchicalHeaders.filter(
      (header) => !detectInfoHeader(header.name)
    )

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

    const { dataColumns } = extractAllColumnsFromConfig(tableConfig)
    const columnMap = {}
    dataColumns.forEach((column) => {
      if (column.indeksData) {
        columnMap[column.indeksData] = column
      }
    })

    const detectedIndices = {}
    const unmatchedColumns = []

    try {
      const aiMapping = await mapColumnsUsingAI(
        Object.values(columnMap),
        validHeaders,
        0.65
      )
      // Validasi: pastikan semua kolom database (selain 'no') dapat mapping
      const requiredKeys = Object.keys(columnMap).filter(
        (key) => key.toLowerCase() !== "no"
      )
      const allMapped = requiredKeys.every((key) => aiMapping[key])
      if (!allMapped) {
        throw new Error(
          "AI mapping failed: Tidak semua kolom database berhasil dipetakan ke Excel header."
        )
      }

      Object.entries(columnMap).forEach(([dataIndex, column]) => {
        if (aiMapping[dataIndex]) {
          const { excelIndex } = aiMapping[dataIndex]
          detectedIndices[dataIndex] = headerIndexMap[excelIndex] ?? excelIndex
        } else {
          unmatchedColumns.push({
            indeksData: dataIndex,
            judul: column.judul,
          })
        }
      })
    } catch (error) {
      message.error(
        "AI column mapping failed. Please check your data format and try again."
      )
      throw new Error(`Column mapping failed: ${error.message}`)
    }

    const transformedRows = filteredJsonData.map((row) => {
      const transformedRow = {}
      Object.entries(detectedIndices).forEach(([dataIndex, colIndex]) => {
        transformedRow[dataIndex] = row[colIndex] || ""
      })
      return transformedRow
    })

    return {
      rawData: filteredJsonData,
      headers: hierarchicalHeaders.map((h) => h.name),
      structuredHeaders: hierarchicalHeaders,
      hierarchicalHeaders,
      detectedIndices,
      columnMap,
      tableConfig,
      headerRowIndex,
      headerRows,
      jsonData,
      dataStartRow,
      transformedRows,
      unmatchedColumns, // Sertakan untuk debugging
    }
  } catch (error) {
    console.error("Error saat memproses data Excel:", error)
    message.error(
      `Gagal memproses data Excel: ${error.message || "Error tidak diketahui"}`
    )
    throw error 
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
  if (typeof value === "string") {
    const lowerValue = value.toLowerCase()
    return (
      lowerValue === "true" ||
      lowerValue === "ya" ||
      lowerValue === "yes" ||
      ["✓", "√", "v", "x"].includes(value)
    )
  }
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

  await processExcelDataBase(workbook, tableCode, config, prodiName)

  return {
    allRows: [],
    prodiRows: [],
    polbanRows: [],
  }
}
