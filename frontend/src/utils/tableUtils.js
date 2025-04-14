import * as XLSX from "xlsx"
import { message } from "antd"

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

  const normalizedHeaders = headers.map((h) => {
    if (h === undefined || h === null) return ""
    return String(h).toLowerCase().trim()
  })

  const fieldTokens = tokenizeFieldName(dataIndex)
  const tsInfo = extractTSInfo(dataIndex)
  const columnScores = []

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i]
    if (!header) continue

    const matchDetails = {
      index: i,
      header: headers[i],
      score: 0,
      matches: [],
      originalHeader: header,
    }

    if (header.includes(" - ")) {
      const [parentPart, childPart] = header
        .split(" - ")
        .map((part) => part.trim())

      const headerTsInfo = extractTSInfo(childPart)
      const parentTokens = tokenizeHeaderPart(parentPart)
      const childTokens = tokenizeHeaderPart(childPart)
      const parentTokenSet = new Set(parentTokens)
      const childTokenSet = new Set(childTokens)
      const matchedFieldTokens = new Set()
      let parentScore = 0
      let childScore = 0

      // Kecocokan token di induk
      fieldTokens.forEach((token) => {
        if (parentTokenSet.has(token) && !matchedFieldTokens.has(token)) {
          parentScore += 20
          matchDetails.matches.push(`Kecocokan tepat di induk: "${token}"`)
          matchedFieldTokens.add(token)
        }
      })

      // Token majemuk di induk
      fieldTokens
        .filter((t) => t.includes("_"))
        .forEach((compoundToken) => {
          const parts = compoundToken.split("_")
          let matchedCount = 0

          parts.forEach((part) => {
            if (parentTokenSet.has(part)) {
              matchedCount++
            }
          })

          if (matchedCount > 0 && !matchedFieldTokens.has(compoundToken)) {
            const matchRatio = matchedCount / parts.length
            const score = 15 * matchRatio
            parentScore += score
            matchDetails.matches.push(
              `Kecocokan majemuk di induk: "${compoundToken}" (${matchedCount}/${parts.length} bagian)`
            )
            matchedFieldTokens.add(compoundToken)
          }
        })

      // Logika pencocokan TS
      if (tsInfo.hasTS && headerTsInfo.hasTS) {
        childScore += 10
        matchDetails.matches.push(`Keduanya mengandung TS`)

        if (
          tsInfo.hasNumber &&
          headerTsInfo.hasNumber &&
          tsInfo.number === headerTsInfo.number
        ) {
          childScore += 200
          matchDetails.matches.push(
            `Kecocokan nomor TS tepat: TS-${tsInfo.number}`
          )
        } else if (!tsInfo.hasNumber && !headerTsInfo.hasNumber) {
          childScore += 150
          matchDetails.matches.push(`Kecocokan TS polos tepat (tanpa angka)`)
        } else if (!tsInfo.hasNumber && headerTsInfo.hasNumber) {
          childScore -= 100
          matchDetails.matches.push(
            `Ketidakcocokan: field tidak memiliki nomor TS tetapi header memilikinya`
          )
        } else if (tsInfo.hasNumber && !headerTsInfo.hasNumber) {
          childScore -= 50
          matchDetails.matches.push(
            `Ketidakcocokan: field memiliki nomor TS tetapi header tidak`
          )
        } else if (
          tsInfo.hasNumber &&
          headerTsInfo.hasNumber &&
          tsInfo.number !== headerTsInfo.number
        ) {
          childScore -= 70
          matchDetails.matches.push(
            `Ketidakcocokan nomor TS: ${tsInfo.number} vs ${headerTsInfo.number}`
          )
        }
      }

      // Kecocokan token di anak
      fieldTokens.forEach((token) => {
        if (childTokenSet.has(token) && !matchedFieldTokens.has(token)) {
          childScore += 20
          matchDetails.matches.push(`Kecocokan tepat di anak: "${token}"`)
          matchedFieldTokens.add(token)
        }
      })

      // Token majemuk di anak
      fieldTokens
        .filter((t) => t.includes("_"))
        .forEach((compoundToken) => {
          if (matchedFieldTokens.has(compoundToken)) return

          const parts = compoundToken.split("_")
          let matchedCount = 0

          parts.forEach((part) => {
            if (childTokenSet.has(part)) {
              matchedCount++
            }
          })

          if (matchedCount > 0) {
            const matchRatio = matchedCount / parts.length
            const score = 15 * matchRatio
            childScore += score
            matchDetails.matches.push(
              `Kecocokan majemuk di anak: "${compoundToken}" (${matchedCount}/${parts.length} bagian)`
            )
            matchedFieldTokens.add(compoundToken)
          }
        })

      // Kasus khusus split
      fieldTokens
        .filter((t) => t.includes("_"))
        .forEach((compoundToken) => {
          if (matchedFieldTokens.has(compoundToken)) return

          const compoundParts = compoundToken.split("_")
          const childText = childPart.toLowerCase()
          let allPartsInChild = true

          compoundParts.forEach((part) => {
            if (!childText.includes(part)) {
              allPartsInChild = false
            }
          })

          if (allPartsInChild) {
            childScore += 25
            matchDetails.matches.push(
              `Semua bagian dari "${compoundToken}" ditemukan di anak "${childPart}"`
            )
            matchedFieldTokens.add(compoundToken)
          }
        })

      // Periksa teks dalam tanda kurung
      const parenthesisMatch = parentPart.match(/\((.*?)\)/)
      if (parenthesisMatch && parenthesisMatch[1]) {
        const parenthesisText = parenthesisMatch[1].toLowerCase()

        if (
          dataIndex
            .toLowerCase()
            .includes(parenthesisText.replace(/[\/\-\s]/g, "_"))
        ) {
          parentScore += 40
          matchDetails.matches.push(
            `Field berisi teks dalam tanda kurung: "${parenthesisText}"`
          )
        }

        if (
          (parenthesisText.includes("full") ||
            parenthesisText.includes("part")) &&
          dataIndex
            .toLowerCase()
            .includes(parenthesisText.includes("full") ? "full" : "part")
        ) {
          parentScore += 30
          matchDetails.matches.push(
            `Kecocokan penunjukan waktu: "${parenthesisText}"`
          )
        }
      }

      // Bonus token pertama/terakhir
      if (fieldTokens.length > 0) {
        const firstToken = fieldTokens[0]
        const lastToken = fieldTokens[fieldTokens.length - 1]

        if (parentTokenSet.has(firstToken)) {
          parentScore += 5
          matchDetails.matches.push(
            `Token pertama "${firstToken}" cocok dengan induk`
          )
        }

        if (childTokenSet.has(lastToken)) {
          childScore += 5
          matchDetails.matches.push(
            `Token terakhir "${lastToken}" cocok dengan anak`
          )
        }
      }

      // Bonus token majemuk
      if (fieldTokens.some((t) => t.includes("_"))) {
        const compoundTokens = fieldTokens.filter((t) => t.includes("_"))

        compoundTokens.forEach((token) => {
          const parts = token.split("_")
          let partsInParent = 0
          let partsInChild = 0

          parts.forEach((part) => {
            if (parentPart.includes(part)) partsInParent++
            if (childPart.includes(part)) partsInChild++
          })

          if (partsInChild === parts.length) {
            childScore += 10
            matchDetails.matches.push(
              `Semua bagian dari "${token}" ditemukan di anak`
            )
          } else if (partsInParent === parts.length) {
            parentScore += 10
            matchDetails.matches.push(
              `Semua bagian dari "${token}" ditemukan di induk`
            )
          }
        })
      }

      // Penanganan pola khusus
      if (dataIndex.includes("mahasiswa_aktif")) {
        if (parentPart.toLowerCase().includes("aktif")) {
          parentScore += 25
          matchDetails.matches.push('Induk berisi "Aktif"')
        }
      }

      if (
        dataIndex.includes("penuh_waktu") ||
        dataIndex.includes("paruh_waktu")
      ) {
        const isParuh = dataIndex.includes("paruh_waktu")

        if (parentPart.toLowerCase().includes(isParuh ? "paruh" : "penuh")) {
          parentScore += 30
          matchDetails.matches.push(
            `Induk berisi jenis waktu yang benar: "${
              isParuh ? "paruh" : "penuh"
            }"`
          )
        }
      }

      if (dataIndex.includes("full_time") || dataIndex.includes("part_time")) {
        const isPart = dataIndex.includes("part_time")

        if (parentPart.toLowerCase().includes(isPart ? "part" : "full")) {
          parentScore += 30
          matchDetails.matches.push(
            `Induk berisi jenis waktu yang benar: "${isPart ? "part" : "full"}"`
          )
        }
      }

      matchDetails.score = parentScore + childScore

      if (parentScore > 0 && childScore > 0) {
        matchDetails.score += 10
        matchDetails.matches.push(`Bonus: Kecocokan di kedua induk dan anak`)
      }
    } else {
      const headerTokens = tokenizeHeaderPart(header)
      const headerTokenSet = new Set(headerTokens)
      const matchedFieldTokens = new Set()

      fieldTokens.forEach((token) => {
        if (headerTokenSet.has(token) && !matchedFieldTokens.has(token)) {
          matchDetails.score += 20
          matchDetails.matches.push(`Kecocokan tepat: "${token}"`)
          matchedFieldTokens.add(token)
        }
      })

      fieldTokens
        .filter((t) => t.includes("_"))
        .forEach((compoundToken) => {
          if (matchedFieldTokens.has(compoundToken)) return

          const parts = compoundToken.split("_")
          let matchedCount = 0

          parts.forEach((part) => {
            if (headerTokenSet.has(part)) {
              matchedCount++
            }
          })

          if (matchedCount > 0) {
            const matchRatio = matchedCount / parts.length
            const score = 15 * matchRatio
            matchDetails.score += score
            matchDetails.matches.push(
              `Kecocokan majemuk: "${compoundToken}" (${matchedCount}/${parts.length} bagian)`
            )
            matchedFieldTokens.add(compoundToken)
          }
        })

      fieldTokens
        .filter((t) => t.includes("_"))
        .forEach((compoundToken) => {
          if (matchedFieldTokens.has(compoundToken)) return

          const parts = compoundToken.split("_")
          let allPartsInHeader = true

          parts.forEach((part) => {
            if (!header.includes(part)) {
              allPartsInHeader = false
            }
          })

          if (allPartsInHeader) {
            matchDetails.score += 25
            matchDetails.matches.push(
              `Semua bagian dari "${compoundToken}" ditemukan di header`
            )
            matchedFieldTokens.add(compoundToken)
          }
        })
    }

    if (matchDetails.score > 0) {
      columnScores.push(matchDetails)
    }
  }

  columnScores.sort((a, b) => b.score - a.score)
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

function tokenizeFieldName(fieldName) {
  const tokens = []
  const parts = fieldName.toLowerCase().split("_")

  parts.forEach((part) => {
    if (part && part.length > 0) {
      tokens.push(part)
    }
  })

  if (parts.length >= 2) {
    for (let i = 0; i < parts.length - 1; i++) {
      tokens.push(`${parts[i]}_${parts[i + 1]}`)
    }

    if (parts.length >= 3) {
      for (let i = 0; i < parts.length - 2; i++) {
        tokens.push(`${parts[i]}_${parts[i + 1]}_${parts[i + 2]}`)
      }
    }

    if (parts.filter((p) => p.length > 0).length >= 2) {
      tokens.push(parts.filter((p) => p.length > 0).join("_"))
    }
  }

  return tokens
}

function tokenizeHeaderPart(headerPart) {
  if (!headerPart) return []

  const normalized = headerPart
    .toLowerCase()
    .replace(/\([^)]*\)/g, " $& ")
    .replace(/[\/\-_.:;,]/g, " ")

  return normalized.split(/\s+/).filter((t) => t.length > 0)
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
