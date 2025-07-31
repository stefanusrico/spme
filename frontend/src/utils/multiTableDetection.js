import * as XLSX from "xlsx"

export const detectMultipleTables = (worksheet, config = null) => {
  try {
    console.log("🔍 Starting multiple table detection...")
    console.log("📋 Config received:", config)

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      range: 0,
      defval: "",
    })

    console.log("📊 Total rows in sheet:", jsonData.length)

    const detectedTables = []
    let currentTableInfo = null

    // **FIX**: Get barisAwalExcel from config correctly
    const barisAwalExcel = config?.barisAwalExcel || 0
    console.log("📏 barisAwalExcel from config:", barisAwalExcel)

    for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex]
      if (!row || row.length === 0) continue

      // Check for program section indicators
      const firstCellStr = String(row[0] || "")
        .trim()
        .toLowerCase()

      console.log(
        `🔍 Row ${rowIndex + 1}: "${row[0]}" | Full row:`,
        row.slice(0, 5)
      )

      // Enhanced Pattern: "Diisi oleh pengusul dari Program Studi pada Program [JENJANG]"
      if (
        firstCellStr.includes("diisi oleh pengusul") &&
        firstCellStr.includes("program studi pada program")
      ) {
        console.log(
          `📍 Found program section at row ${rowIndex + 1}: ${row[0]}`
        )

        // If we were tracking a previous table, close it with proper end row
        if (currentTableInfo) {
          currentTableInfo.endDataRow = rowIndex - 1
          detectedTables.push(currentTableInfo)
          console.log(
            `✅ Closed previous table: ${currentTableInfo.program} (end row: ${
              currentTableInfo.endDataRow + 1
            })`
          )
        }

        // Extract program type more precisely
        let programType = ""
        const originalText = String(row[0] || "").trim()

        // Extract everything after "Program Studi pada Program "
        const programMatch = originalText.match(
          /Program Studi pada Program (.+)$/i
        )
        if (programMatch) {
          programType = programMatch[1].trim()
        } else {
          // Fallback patterns
          if (firstCellStr.includes("diploma satu")) {
            programType = "Diploma Satu"
          } else if (firstCellStr.includes("diploma dua")) {
            programType = "Diploma Dua"
          } else if (firstCellStr.includes("diploma tiga")) {
            programType = "Diploma Tiga"
          } else if (firstCellStr.includes("sarjana terapan")) {
            programType = "Sarjana Terapan"
          } else if (firstCellStr.includes("sarjana")) {
            programType = "Sarjana"
          } else if (firstCellStr.includes("magister terapan")) {
            programType = "Magister Terapan"
          } else if (firstCellStr.includes("magister")) {
            programType = "Magister"
          } else if (firstCellStr.includes("doktor terapan")) {
            programType = "Doktor Terapan"
          } else if (firstCellStr.includes("doktor")) {
            programType = "Doktor"
          } else {
            programType = "Unknown Program"
          }
        }

        console.log(`🎯 Extracted program type: "${programType}"`)

        // Start tracking new table
        currentTableInfo = {
          program: programType,
          description: `Data untuk Program ${programType}`,
          programRow: rowIndex,
          headerStartRow: -1,
          headerEndRow: -1,
          startDataRow: -1,
          endDataRow: -1,
          barisAwalExcel: barisAwalExcel,
          headerRows: [], // **NEW**: Store actual header rows for this table
          numHeaderRows: 0, // **NEW**: Count of header rows for this specific table
          hierarchicalHeaders: [], // **NEW**: Store processed hierarchical headers
        }

        console.log(`🆕 Started tracking new table: ${programType}`)
        continue
      }

      // **FIX**: Look for header patterns after program section
      if (currentTableInfo && currentTableInfo.headerStartRow === -1) {
        // **NEW**: Look for header indicators (like "Tahun Lulus", "Tahun Masuk", etc.)
        const hasHeaderIndicators = row.some((cell) => {
          const cellStr = String(cell || "")
            .trim()
            .toLowerCase()
          return (
            cellStr === "tahun lulus" ||
            cellStr === "tahun" ||
            cellStr === "tahun masuk" ||
            cellStr.includes("jumlah lulusan") ||
            cellStr.includes("jumlah mahasiswa") ||
            cellStr.includes("lulusan") ||
            cellStr.includes("waktu tunggu") ||
            cellStr.startsWith("ts-") ||
            cellStr === "ts"
          )
        })

        if (hasHeaderIndicators) {
          console.log(
            `📋 Found header START at row ${rowIndex + 1} for ${
              currentTableInfo.program
            }`
          )
          currentTableInfo.headerStartRow = rowIndex

          // **FIX**: Use barisAwalExcel directly for data start, not numeric detection
          if (barisAwalExcel > 0) {
            // **NEW**: Calculate data start from barisAwalExcel
            const dataStartRowIndex = barisAwalExcel - 1 // Convert to 0-based index
            console.log(
              `📊 Using barisAwalExcel ${barisAwalExcel} -> data starts at row ${
                dataStartRowIndex + 1
              }`
            )

            // **FIX**: Header ends just before data start
            currentTableInfo.headerEndRow = dataStartRowIndex - 1
            currentTableInfo.startDataRow = dataStartRowIndex

            // **NEW**: Calculate number of header rows
            currentTableInfo.numHeaderRows =
              currentTableInfo.headerEndRow -
              currentTableInfo.headerStartRow +
              1

            // **NEW**: Extract all header rows for this table
            for (
              let i = currentTableInfo.headerStartRow;
              i <= currentTableInfo.headerEndRow;
              i++
            ) {
              if (jsonData[i]) {
                currentTableInfo.headerRows.push(jsonData[i])
              }
            }

            console.log(
              `📋 Header rows for ${currentTableInfo.program}: ${
                currentTableInfo.headerStartRow + 1
              } to ${currentTableInfo.headerEndRow + 1} (${
                currentTableInfo.numHeaderRows
              } rows)`
            )
            console.log(
              `📊 Data starts at row ${currentTableInfo.startDataRow + 1} for ${
                currentTableInfo.program
              }`
            )
            console.log(
              `📋 Extracted header rows:`,
              currentTableInfo.headerRows
            )

            // **NEW**: Process hierarchical headers immediately
            currentTableInfo.hierarchicalHeaders =
              processHierarchicalHeadersForTable(currentTableInfo.headerRows)

            console.log(
              `🏗️ Processed hierarchical headers for ${currentTableInfo.program}:`,
              currentTableInfo.hierarchicalHeaders.map((h) => h.name)
            )
          } else {
            console.warn(
              `⚠️ No barisAwalExcel specified, using fallback detection for ${currentTableInfo.program}`
            )
            // Fallback to old logic if barisAwalExcel not available
            currentTableInfo.headerEndRow = rowIndex
            currentTableInfo.startDataRow = rowIndex + 1
            currentTableInfo.numHeaderRows = 1
            currentTableInfo.headerRows = [row]
            currentTableInfo.hierarchicalHeaders =
              processHierarchicalHeadersForTable([row])
          }
        }
      }
    }

    // Close the last table if exists
    if (currentTableInfo) {
      currentTableInfo.endDataRow = jsonData.length - 1
      detectedTables.push(currentTableInfo)
      console.log(`✅ Closed final table: ${currentTableInfo.program}`)
    }

    console.log(`🎯 Detection complete: ${detectedTables.length} tables found`)
    detectedTables.forEach((table, index) => {
      console.log(`📊 Table ${index + 1}:`, {
        program: table.program,
        programRow: table.programRow + 1,
        headerStart: table.headerStartRow + 1,
        headerEnd: table.headerEndRow + 1,
        dataStart: table.startDataRow + 1,
        dataEnd: table.endDataRow + 1,
        numHeaderRows: table.numHeaderRows,
        headerRowsSample: table.headerRows.map((row) => row.slice(0, 3)),
        hierarchicalHeadersSample: table.hierarchicalHeaders
          .slice(0, 3)
          .map((h) => h.name),
        barisAwalExcel: table.barisAwalExcel,
        dataRows:
          table.startDataRow >= 0 && table.endDataRow >= 0
            ? table.endDataRow - table.startDataRow + 1
            : 0,
        sampleDataRow:
          table.startDataRow >= 0
            ? jsonData[table.startDataRow]?.slice(0, 5)
            : null,
      })
    })

    // Filter out invalid tables
    const validTables = detectedTables.filter(
      (table) =>
        table.headerStartRow >= 0 &&
        table.headerEndRow >= 0 &&
        table.startDataRow >= 0 &&
        table.program !== "Unknown Program" &&
        table.headerRows.length > 0 &&
        table.hierarchicalHeaders.length > 0
    )

    console.log(`✅ Valid tables: ${validTables.length}`)

    return validTables
  } catch (error) {
    console.error("❌ Error in detectMultipleTables:", error)
    return []
  }
}

// **NEW**: Process hierarchical headers specifically for multi-table detection
function processHierarchicalHeadersForTable(headerRows) {
  if (!headerRows || headerRows.length === 0) {
    return []
  }

  // Import detection functions
  const detectInfoHeader = (headerStr) => {
    if (!headerStr || typeof headerStr !== "string") return true
    const normalized = headerStr.toLowerCase().trim()
    if (normalized.endsWith(":")) return true
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
      "diisi oleh",
    ]
    if (
      metadataKeywords.some(
        (keyword) => normalized.includes(keyword) || normalized === keyword
      )
    )
      return true
    if (/^\d+\.?$/.test(normalized)) return true
    if (normalized.length <= 1) return true
    return false
  }

  const combineHeaderWithParent = (parentHeader, childHeader) => {
    if (!parentHeader && !childHeader) return ""
    if (!parentHeader) return childHeader || ""
    if (!childHeader) return parentHeader || ""

    const parentStr = String(parentHeader).trim()
    const childStr = String(childHeader).trim()

    if (parentStr === childStr || childStr === "") return parentStr
    if (childStr.toLowerCase().includes(parentStr.toLowerCase()))
      return childStr

    return `${parentStr} - ${childStr}`
  }

  // If only one header row, return simple headers
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
        const originalHeader = headerRows[0][index]
        return originalHeader && String(originalHeader).trim() !== ""
      })
  }

  // **FIX**: Find actual maximum columns with data
  let maxDataColumns = 0
  headerRows.forEach((row) => {
    for (let i = row.length - 1; i >= 0; i--) {
      const cellValue = row[i]
      if (
        cellValue &&
        String(cellValue).trim() !== "" &&
        !detectInfoHeader(String(cellValue))
      ) {
        maxDataColumns = Math.max(maxDataColumns, i + 1)
        break
      }
    }
  })

  console.log(`📏 Maximum data columns detected: ${maxDataColumns}`)

  // Multi-row hierarchical processing
  const hierarchicalHeaders = []

  // **FIX**: Use maxDataColumns instead of Math.max(...headerRows.map(row => row.length))
  for (let colIndex = 0; colIndex < maxDataColumns; colIndex++) {
    const columnLetter = String.fromCharCode(65 + colIndex)
    let finalHeader = ""
    let parentName = null
    let grandparentName = null
    let hasValidContent = false

    // Check if this column has any valid content
    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const cellValue = headerRows[rowIndex][colIndex]
      const cellValueStr = cellValue ? String(cellValue).trim() : ""
      if (cellValueStr !== "" && !detectInfoHeader(cellValueStr)) {
        hasValidContent = true
        break
      }
    }

    // **FIX**: Also check if there are spanning headers from previous columns
    if (!hasValidContent) {
      for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
        // Look for parent headers in previous columns for spanning
        for (let prevCol = colIndex - 1; prevCol >= 0; prevCol--) {
          const parentValue = headerRows[rowIndex][prevCol]
          const parentValueStr = parentValue ? String(parentValue).trim() : ""

          if (parentValueStr !== "" && !detectInfoHeader(parentValueStr)) {
            // Check if this parent spans to current column (no content in between)
            let isSpanning = true
            for (let checkCol = prevCol + 1; checkCol < colIndex; checkCol++) {
              const betweenValue = headerRows[rowIndex][checkCol]
              const betweenValueStr = betweenValue
                ? String(betweenValue).trim()
                : ""
              if (betweenValueStr !== "") {
                isSpanning = false
                break
              }
            }

            if (isSpanning) {
              hasValidContent = true
              break
            }
          }
        }
        if (hasValidContent) break
      }
    }

    if (!hasValidContent) {
      console.log(
        `⚠️ Column ${
          colIndex + 1
        } (${columnLetter}) has no valid content, skipping`
      )
      continue
    }

    // Collect header values from all rows for this column
    const headerValues = []
    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const headerValue = headerRows[rowIndex][colIndex]
      const headerValueStr = headerValue ? String(headerValue).trim() : ""

      if (headerValueStr !== "" && !detectInfoHeader(headerValueStr)) {
        headerValues.push(headerValueStr)
      } else if (headerValueStr === "" && rowIndex < headerRows.length - 1) {
        // **FIX**: Look for parent headers in previous columns for spanning
        for (let prevCol = colIndex - 1; prevCol >= 0; prevCol--) {
          const parentValue = headerRows[rowIndex][prevCol]
          const parentValueStr = parentValue ? String(parentValue).trim() : ""

          if (parentValueStr !== "" && !detectInfoHeader(parentValueStr)) {
            // Check if this parent spans to current column (no content in between)
            let isSpanning = true
            for (let checkCol = prevCol + 1; checkCol < colIndex; checkCol++) {
              const betweenValue = headerRows[rowIndex][checkCol]
              const betweenValueStr = betweenValue
                ? String(betweenValue).trim()
                : ""
              if (betweenValueStr !== "") {
                isSpanning = false
                break
              }
            }

            if (isSpanning) {
              headerValues.push(parentValueStr)
              break
            }
          }
        }
      }
    }

    // Build final header name from collected values
    if (headerValues.length === 0) {
      finalHeader = `Column_${colIndex + 1}`
    } else if (headerValues.length === 1) {
      finalHeader = headerValues[0]
    } else if (headerValues.length === 2) {
      parentName = headerValues[0]
      finalHeader = combineHeaderWithParent(headerValues[0], headerValues[1])
    } else if (headerValues.length >= 3) {
      grandparentName = headerValues[0]
      parentName = headerValues[1]
      finalHeader = combineHeaderWithParent(
        combineHeaderWithParent(headerValues[0], headerValues[1]),
        headerValues[2]
      )
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

    console.log(`✅ Column ${colIndex + 1} (${columnLetter}): "${finalHeader}"`)
  }

  console.log(
    `📊 Final hierarchical headers: ${hierarchicalHeaders.length} columns`
  )

  return hierarchicalHeaders
}
