import { processExcelDataBase } from "../../utils/tableUtils.js"
import { PluginUtils } from "../utils/PluginUtils.js"
// FIX: Remove imports for functions that no longer exist
// import {
//   detectMultipleTables,
//   filterDataByProgram,
//   detectHeaderRowInFilteredData,
// } from "../../utils/multiTableDetection.js"

// FIX: Import the new, single function for detection
import { detectMultipleTables } from "../../utils/multiTableDetection.js"
import * as XLSX from "xlsx"

export class BasePlugin {
  constructor(pluginInfo) {
    if (!pluginInfo.code || !pluginInfo.name) {
      throw new Error("Plugin must have code and name")
    }
    this.info = pluginInfo
  }

  getInfo() {
    return this.info
  }

  configureSection(config) {
    return config
  }

  hasDefaultData() {
    return false
  }

  getDefaultData(tableCode, config = {}) {
    return []
  }

  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    if (!existingData || existingData.length === 0) {
      return defaultData
    }

    return existingData
  }

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config?.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (existingData?.[tableCode]?.length > 0) {
          initialTableData[tableCode] = this.mergeWithDefaults(
            existingData[tableCode],
            tableCode,
            { config, prodiName, sectionCode }
          )
        } else if (this.hasDefaultData()) {
          initialTableData[tableCode] = this.getDefaultData(tableCode, {
            config,
            prodiName,
            sectionCode,
          })
        } else {
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  }

  // ✅ Dynamic field processing based on AI mapping
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (value === undefined || value === null) {
      return fieldType === "number" ? 0 : ""
    }

    // Auto-detect field type if not specified
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    switch (fieldType) {
      case "number":
        return PluginUtils.parseNumber(value, 0)
      case "formatted_number":
        const numValue = PluginUtils.parseNumber(value, 0)
        return parseFloat(PluginUtils.formatNumber(numValue, 2))
      case "boolean":
        return PluginUtils.parseBoolean(value)
      case "text":
      default:
        return PluginUtils.normalizeTextField(value)
    }
  }

  // ✅ Detect field type based on field name patterns
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Number patterns
    if (
      fieldLower.includes("jumlah") ||
      fieldLower.includes("total") ||
      fieldLower.includes("daya_tampung") ||
      fieldLower.includes("sks") ||
      fieldLower.includes("bobot") ||
      fieldLower.includes("nilai") ||
      fieldLower.includes("poin") ||
      fieldLower.includes("skor") ||
      /^\d+$/.test(String(value))
    ) {
      return "number"
    }

    // Formatted number patterns (for percentages, ratios, etc.)
    if (
      fieldLower.includes("rata") ||
      fieldLower.includes("persentase") ||
      fieldLower.includes("rasio") ||
      fieldLower.includes("indeks")
    ) {
      return "formatted_number"
    }

    // Boolean patterns
    if (
      fieldLower.includes("kesesuaian") ||
      fieldLower.includes("sesuai") ||
      fieldLower.includes("valid") ||
      fieldLower.includes("aktif") ||
      fieldLower.includes("status")
    ) {
      return "boolean"
    }

    // Default to text
    return "text"
  }

  // ✅ Process row data dynamically based on detected indices
  processRowData(row, detectedIndices, additionalFields = {}) {
    const processedItem = {
      key: `${this.info.code}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      selected: true,
      ...additionalFields,
    }

    // Process each detected field dynamically
    Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
      if (colIndex === undefined || colIndex < 0) return

      const value = row[colIndex]
      processedItem[fieldName] = this.processFieldValue(fieldName, value)
    })

    return processedItem
  }

  // ✅ **REWRITTEN**: Excel processing with new multi-table detection
  async processExcelData(
    workbook,
    tableCode,
    config,
    prodiName,
    sectionCode,
    selectedProgram = null
  ) {
    try {
      console.log("🔍 Starting Excel processing...", {
        tableCode,
        selectedProgram,
        hasSelectedProgram: !!selectedProgram,
        config: config,
        barisAwalExcel: config?.barisAwalExcel,
      })

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // **FIX**: Make sure config has the right structure for detection
      let detectionConfig = config

      // If config has tables, use the first table's config for detection
      if (config?.tables && config.tables.length > 0) {
        const firstTable = config.tables[0]
        if (typeof firstTable === "object" && firstTable.barisAwalExcel) {
          detectionConfig = firstTable
        }
      }

      console.log("📋 Detection config:", {
        barisAwalExcel: detectionConfig?.barisAwalExcel,
        configType: typeof detectionConfig,
      })

      // **FIX**: Pass the correct config to detection
      const { detectMultipleTables } = await import(
        "../../utils/multiTableDetection.js"
      )
      const detectedTables = detectMultipleTables(worksheet, detectionConfig)

      console.log("📊 Multiple table detection result:", detectedTables)

      // Check if we detected multiple program sections
      if (detectedTables.length > 1 && !selectedProgram) {
        console.log(
          `🎯 Detected ${detectedTables.length} program sections, no program selected`
        )

        return {
          requiresProgramSelection: true,
          availablePrograms: detectedTables.map((table) => ({
            program: table.program,
            description: table.description,
          })),
          multiTableInfo: detectedTables,
          allRows: [],
        }
      }

      if (detectedTables.length > 1 && selectedProgram) {
        console.log(`📝 Processing selected program: ${selectedProgram}`)

        // Find the specific table info for the selected program
        const selectedTableInfo = detectedTables.find(
          (table) => table.program === selectedProgram
        )

        if (!selectedTableInfo) {
          throw new Error(
            `Could not find table info for selected program: ${selectedProgram}`
          )
        }

        console.log("🎯 Selected table info:", selectedTableInfo)

        // **FIX**: Check if barisAwalExcel was used or if it's fallback
        if (
          selectedTableInfo.startDataRow ===
          selectedTableInfo.barisAwalExcel - 1
        ) {
          console.log(
            `✅ Using barisAwalExcel ${selectedTableInfo.barisAwalExcel} for ${selectedProgram}`
          )
        } else {
          console.log(
            `⚠️ Fallback detection used for ${selectedProgram}, barisAwalExcel=${
              selectedTableInfo.barisAwalExcel
            }, actual data start=${selectedTableInfo.startDataRow + 1}`
          )
        }

        // Validate that we have proper table structure
        if (
          selectedTableInfo.headerStartRow === -1 ||
          selectedTableInfo.headerEndRow === -1 ||
          selectedTableInfo.startDataRow === -1
        ) {
          throw new Error(
            `Invalid table structure for program: ${selectedProgram}`
          )
        }

        // **FIX**: Extract the exact range INCLUDING all header rows
        const startRow = selectedTableInfo.headerStartRow
        const endRow = selectedTableInfo.endDataRow

        console.log(
          `📏 Extracting range: rows ${startRow + 1} to ${endRow + 1}`
        )
        console.log(
          `📋 Header rows: ${selectedTableInfo.headerStartRow + 1} to ${
            selectedTableInfo.headerEndRow + 1
          }`
        )
        console.log(
          `📊 Data rows: ${selectedTableInfo.startDataRow + 1} to ${
            selectedTableInfo.endDataRow + 1
          }`
        )

        // Extract data using proper Excel range
        const range = XLSX.utils.decode_range(worksheet["!ref"])
        const extractRange = {
          s: { c: range.s.c, r: startRow },
          e: { c: range.e.c, r: endRow },
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          range: extractRange,
          defval: "",
        })

        console.log(
          `📊 Extracted ${jsonData.length} rows for ${selectedProgram}`
        )
        console.log(`📋 First few rows:`, jsonData.slice(0, 5))

        // **NEW**: Calculate number of header rows in extracted data
        const numHeaderRows = selectedTableInfo.numHeaderRows

        console.log(
          `📋 Using ${numHeaderRows} header rows for ${selectedProgram}`
        )
        console.log(
          `📋 Header rows sample:`,
          selectedTableInfo.headerRows.map((row) => row.slice(0, 3))
        )

        // **CRITICAL FIX**: Use processExcelDataBase for multiple table!
        return await this.processFilteredExcelDataWithBase(
          jsonData,
          numHeaderRows,
          tableCode,
          config,
          prodiName,
          sectionCode,
          selectedProgram
        )
      } else {
        console.log("📄 Single table detected or fallback, processing normally")
        return await this.processSingleTableExcelData(
          workbook,
          tableCode,
          config,
          prodiName,
          sectionCode
        )
      }
    } catch (error) {
      console.error("❌ Error in BasePlugin processExcelData:", error)
      throw error
    }
  }

  // **NEW**: Process filtered data using processExcelDataBase logic
  async processFilteredExcelDataWithBase(
    extractedData,
    numHeaderRows,
    tableCode,
    config,
    prodiName,
    sectionCode,
    selectedProgram
  ) {
    console.log(
      `🔧 Processing filtered Excel data with BASE logic for ${selectedProgram}`
    )
    console.log(`📊 Extracted data length: ${extractedData.length}`)
    console.log(`📋 Number of header rows: ${numHeaderRows}`)

    if (extractedData.length === 0) {
      throw new Error(`No data found for program: ${selectedProgram}`)
    }

    try {
      // **FIX**: Extract header rows for hierarchical processing
      const headerRows = []
      for (let i = 0; i < numHeaderRows && i < extractedData.length; i++) {
        headerRows.push(extractedData[i] || [])
      }

      console.log(
        `📋 Extracted header rows for ${selectedProgram}:`,
        headerRows
      )

      // **FIX**: Use pre-processed hierarchical headers from detection
      const hierarchicalHeaders = selectedTableInfo.hierarchicalHeaders || []

      console.log(
        `📊 Using pre-processed hierarchical headers for ${selectedProgram}:`,
        hierarchicalHeaders.map((h) => h.name)
      )

      // **REMOVE**: Don't process headers again, use the ones from detection
      // const { processHierarchicalHeaders } = await import("../../utils/tableUtils.js")
      // const hierarchicalHeaders = processHierarchicalHeaders(headerRows)

      // Get database columns for AI mapping
      const { extractAllColumnsFromConfig } = await import("../../utils/tableUtils.js")
      const { dataColumns } = extractAllColumnsFromConfig(config)
      const columnMap = {}
      dataColumns.forEach((column) => {
        if (column.indeksData) {
          columnMap[column.indeksData] = column
        }
      })

      // **FIX**: Filter valid headers and use AI mapping
      const validHeaders = hierarchicalHeaders.filter(
        (header) => !this.detectInfoHeader(header.name)
      )

      console.log(
        `🤖 Sending to AI mapping - Valid headers:`,
        validHeaders.map((h) => h.name)
      )
      console.log(
        `🤖 Sending to AI mapping - DB columns:`,
        Object.values(columnMap).map((c) => c.judul)
      )

      let detectedIndices = {}
      try {
        const aiMapping = await this.mapColumnsUsingAI(
          Object.values(columnMap),
          validHeaders, // Send hierarchical headers to AI
          0.65
        )

        console.log(`🎯 AI Mapping result for ${selectedProgram}:`, aiMapping)

        // Map AI results back to column indices
        Object.entries(columnMap).forEach(([dataIndex, column]) => {
          if (aiMapping[dataIndex]) {
            const { excelIndex } = aiMapping[dataIndex]
            detectedIndices[dataIndex] = excelIndex
          }
        })
      } catch (aiError) {
        console.error(`❌ AI mapping failed for ${selectedProgram}:`, aiError)
        throw new Error(`AI mapping failed: ${aiError.message}`)
      }

      console.log(
        `🎯 Final detected indices for ${selectedProgram}:`,
        detectedIndices
      )

      // **FIX**: Extract data rows (skip all header rows)
      const dataStartRow = numHeaderRows
      const rawDataRows = extractedData
        .slice(dataStartRow)
        .filter(
          (row) =>
            row &&
            row.length > 0 &&
            row.some((cell) => String(cell || "").trim() !== "")
        )

      console.log(
        `📊 Found ${rawDataRows.length} data rows for ${selectedProgram}`
      )

      if (rawDataRows.length === 0) {
        console.warn(`⚠️ No data rows found for ${selectedProgram}`)
        return {
          allRows: [],
          shouldReplaceExisting: true,
        }
      }

      // Process data rows using the detected indices
      const processedData = rawDataRows.map((row, index) =>
        this.processRowData(row, detectedIndices, {
          no: index + 1,
          _selectedProgram: selectedProgram,
        })
      )

      console.log(
        `✅ Processed ${processedData.length} rows for ${selectedProgram}`
      )
      console.log(`📋 Sample processed row:`, processedData[0])

      return {
        allRows: processedData,
        shouldReplaceExisting: true,
        hierarchicalHeaders,
        selectedProgram,
      }
    } catch (error) {
      console.error(
        `❌ Error processing filtered data with BASE for ${selectedProgram}:`,
        error
      )
      throw error
    }
  }

  // ✅ Process single table (existing logic)
  async processSingleTableExcelData(
    workbook,
    tableCode,
    config,
    prodiName,
    sectionCode
  ) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = PluginUtils.filterDataRows(rawData)

    const processedData = filteredData.map((row, index) =>
      this.processRowData(row, detectedIndices, { no: index + 1 })
    )

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  // **UPDATED**: Process filtered data with proper header extraction
  async processFilteredExcelData(
    extractedData,
    headerRowIndex,
    numHeaderRows,
    tableCode,
    config,
    prodiName,
    sectionCode,
    selectedProgram
  ) {
    console.log(`🔧 Processing filtered Excel data for ${selectedProgram}`)
    console.log(`📊 Extracted data length: ${extractedData.length}`)
    console.log(`📋 Number of header rows: ${numHeaderRows}`)

    if (extractedData.length === 0) {
      throw new Error(`No data found for program: ${selectedProgram}`)
    }

    // **FIX**: Extract multiple header rows for hierarchical processing
    const headerRows = []
    for (let i = 0; i < numHeaderRows && i < extractedData.length; i++) {
      headerRows.push(extractedData[i] || [])
    }

    console.log(`📋 Extracted header rows for ${selectedProgram}:`, headerRows)

    // **FIX**: Use the SAME hierarchical processing as single table
    const { processHierarchicalHeaders } = await import(
      "../../utils/tableUtils.js"
    )
    const hierarchicalHeaders = processHierarchicalHeaders(headerRows)

    console.log(
      `📊 Processed hierarchical headers for ${selectedProgram}:`,
      hierarchicalHeaders
    )

    // Get database columns for AI mapping
    const { extractAllColumnsFromConfig } = await import(
      "../../utils/tableUtils.js"
    )
    const { dataColumns } = extractAllColumnsFromConfig(config)
    const columnMap = {}
    dataColumns.forEach((column) => {
      if (column.indeksData) {
        columnMap[column.indeksData] = column
      }
    })

    // **FIX**: Filter valid headers and use AI mapping
    const validHeaders = hierarchicalHeaders.filter(
      (header) => !this.detectInfoHeader(header.name)
    )

    console.log(
      `🤖 Sending to AI mapping - Valid headers:`,
      validHeaders.map((h) => h.name)
    )
    console.log(
      `🤖 Sending to AI mapping - DB columns:`,
      Object.values(columnMap)
    )

    let detectedIndices = {}
    try {
      const aiMapping = await this.mapColumnsUsingAI(
        Object.values(columnMap),
        validHeaders, // Send hierarchical headers to AI
        0.65
      )

      console.log(`🎯 AI Mapping result for ${selectedProgram}:`, aiMapping)

      // Map AI results back to column indices
      Object.entries(columnMap).forEach(([dataIndex, column]) => {
        if (aiMapping[dataIndex]) {
          const { excelIndex } = aiMapping[dataIndex]
          detectedIndices[dataIndex] = excelIndex
        }
      })
    } catch (aiError) {
      console.error(`❌ AI mapping failed for ${selectedProgram}:`, aiError)
      throw new Error(`AI mapping failed: ${aiError.message}`)
    }

    console.log(
      `🎯 Final detected indices for ${selectedProgram}:`,
      detectedIndices
    )

    // **FIX**: Extract data rows (skip all header rows)
    const dataStartRow = numHeaderRows
    const rawDataRows = extractedData
      .slice(dataStartRow)
      .filter(
        (row) =>
          row &&
          row.length > 0 &&
          row.some((cell) => String(cell || "").trim() !== "")
      )

    console.log(
      `📊 Found ${rawDataRows.length} data rows for ${selectedProgram}`
    )

    if (rawDataRows.length === 0) {
      console.warn(`⚠️ No data rows found for ${selectedProgram}`)
      return {
        allRows: [],
        shouldReplaceExisting: true,
      }
    }

    // Process data rows using the detected indices
    const processedData = rawDataRows.map((row, index) =>
      this.processRowData(row, detectedIndices, {
        no: index + 1,
        _selectedProgram: selectedProgram,
      })
    )

    console.log(
      `✅ Processed ${processedData.length} rows for ${selectedProgram}`
    )
    console.log(`📋 Sample processed row:`, processedData[0])

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
      hierarchicalHeaders,
      selectedProgram,
    }
  }

  // **NEW**: Fallback method for manual processing
  async processFilteredExcelDataFallback(
    extractedData,
    headerRowIndex,
    numHeaderRows, // **NEW** parameter
    tableCode,
    config,
    prodiName,
    sectionCode,
    selectedProgram
  ) {
    console.log(`🔄 Fallback processing for ${selectedProgram}`)

    // Extract header rows based on numHeaderRows
    const headerRows = []
    for (let i = 0; i < numHeaderRows && i < extractedData.length; i++) {
      headerRows.push(extractedData[i] || [])
    }

    if (headerRows.length === 0) {
      headerRows.push(extractedData[headerRowIndex] || [])
    }

    console.log(
      `📋 Extracted header rows for ${selectedProgram} (fallback):`,
      headerRows
    )

    // **FIX**: Use the SAME hierarchical processing as single table
    const { processHierarchicalHeaders } = await import(
      "../../utils/tableUtils.js"
    )
    const hierarchicalHeaders = processHierarchicalHeaders(headerRows)

    console.log(
      `📊 Processed hierarchical headers for ${selectedProgram}:`,
      hierarchicalHeaders
    )

    // Get database columns for AI mapping
    const { extractAllColumnsFromConfig } = await import(
      "../../utils/tableUtils.js"
    )
    const { dataColumns } = extractAllColumnsFromConfig(config)
    const columnMap = {}
    dataColumns.forEach((column) => {
      if (column.indeksData) {
        columnMap[column.indeksData] = column
      }
    })

    // **FIX**: Use AI mapping with hierarchical headers
    const validHeaders = hierarchicalHeaders.filter(
      (header) => !this.detectInfoHeader(header.name)
    )

    console.log(
      `🤖 Sending to AI mapping - Valid headers:`,
      validHeaders.map((h) => h.name)
    )
    console.log(
      `🤖 Sending to AI mapping - DB columns:`,
      Object.values(columnMap)
    )

    let detectedIndices = {}
    try {
      const aiMapping = await this.mapColumnsUsingAI(
        Object.values(columnMap),
        validHeaders, // Send hierarchical headers to AI
        0.65
      )

      console.log(`🎯 AI Mapping result for ${selectedProgram}:`, aiMapping)

      // Map AI results back to column indices
      Object.entries(columnMap).forEach(([dataIndex, column]) => {
        if (aiMapping[dataIndex]) {
          const { excelIndex } = aiMapping[dataIndex]
          detectedIndices[dataIndex] = excelIndex
        }
      })
    } catch (aiError) {
      console.error(`❌ AI mapping failed for ${selectedProgram}:`, aiError)
      throw new Error(`AI mapping failed: ${aiError.message}`)
    }

    console.log(
      `🎯 Final detected indices for ${selectedProgram}:`,
      detectedIndices
    )

    // Extract data rows (skip header rows)
    const dataStartRow = headerRows.length
    const rawDataRows = extractedData
      .slice(dataStartRow)
      .filter(
        (row) =>
          row &&
          row.length > 0 &&
          row.some((cell) => String(cell || "").trim() !== "")
      )

    console.log(
      `📊 Found ${rawDataRows.length} data rows for ${selectedProgram}`
    )

    if (rawDataRows.length === 0) {
      console.warn(`⚠️ No data rows found for ${selectedProgram}`)
      return {
        allRows: [],
        shouldReplaceExisting: true,
      }
    }

    // Process data rows using the detected indices
    const processedData = rawDataRows.map((row, index) =>
      this.processRowData(row, detectedIndices, {
        no: index + 1,
        _selectedProgram: selectedProgram,
      })
    )

    console.log(
      `✅ Processed ${processedData.length} rows for ${selectedProgram} (fallback)`
    )

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
      hierarchicalHeaders,
      selectedProgram,
    }
  }

  processHierarchicalHeadersForFiltered(headerRows) {
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
          const originalHeader = headerRows[0][index]
          return originalHeader && String(originalHeader).trim() !== ""
        })
    }

    const hierarchicalHeaders = []
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
          !this.detectInfoHeader(String(cellValue))
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

    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const columnLetter = String.fromCharCode(65 + colIndex)
      let finalHeader = ""
      let parentName = null
      let grandparentName = null
      let hasValidContent = false

      for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
        const cellValue = headerRows[rowIndex][colIndex]
        const cellValueStr = cellValue ? String(cellValue).trim() : ""
        if (cellValueStr !== "" && !this.detectInfoHeader(cellValueStr)) {
          hasValidContent = true
          break
        }
      }

      if (!hasValidContent) {
        continue
      }

      const headerValues = []
      for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
        const headerValue = headerRows[rowIndex][colIndex]
        const headerValueStr = headerValue ? String(headerValue).trim() : ""

        if (headerValueStr !== "" && !this.detectInfoHeader(headerValueStr)) {
          headerValues.push(headerValueStr)
        }
      }

      if (headerValues.length === 0) {
        finalHeader = `Column_${colIndex + 1}`
      } else if (headerValues.length === 1) {
        finalHeader = headerValues[0]
      } else if (headerValues.length === 2) {
        parentName = headerValues[0]
        finalHeader = this.combineHeaderWithParent(
          headerValues[0],
          headerValues[1]
        )
      } else if (headerValues.length >= 3) {
        grandparentName = headerValues[0]
        parentName = headerValues[1]
        finalHeader = this.combineHeaderWithParent(
          this.combineHeaderWithParent(headerValues[0], headerValues[1]),
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
    }

    return hierarchicalHeaders
  }

  combineHeaderWithParent(parentHeader, childHeader) {
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

  detectInfoHeader(headerStr) {
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

  extractAllColumnsFromConfig(tableConfig) {
    const allColumns = [],
      dataColumns = []
    if (!tableConfig) return { allColumns, dataColumns }

    let columns = null
    if (Array.isArray(tableConfig.columns)) columns = tableConfig.columns
    else if (tableConfig.kolom && Array.isArray(tableConfig.kolom))
      columns = tableConfig.kolom
    else if (
      tableConfig.tables &&
      tableConfig.tables.length > 0 &&
      tableConfig.tables[0]
    ) {
      const firstTable = tableConfig.tables[0]
      if (Array.isArray(firstTable.columns)) columns = firstTable.columns
      else if (firstTable.kolom && Array.isArray(firstTable.kolom))
        columns = firstTable.kolom
    }
    if (!columns) return { allColumns, dataColumns }

    columns.forEach((column) => {
      allColumns.push(column)
      if (column.isGroup && Array.isArray(column.children)) {
        column.children.forEach((child) => {
          if (!child.isGroup)
            dataColumns.push({
              ...child,
              parentTitle: column.judul,
              parentIndeksData: column.indeksData,
            })
          else if (child.children && Array.isArray(child.children)) {
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

  async mapColumnsUsingAI(dbColumns, excelHeaders, semanticThreshold = 0.65) {
    console.log("🚨 BasePlugin.mapColumnsUsingAI CALLED!")
    try {
      const { mapColumnsUsingAI } = await import("../../utils/tableUtils.js")
      const result = await mapColumnsUsingAI(
        dbColumns,
        excelHeaders,
        semanticThreshold
      )
      console.log("✅ BasePlugin AI mapping result:", result)
      return result
    } catch (error) {
      console.error("❌ BasePlugin AI mapping error:", error)
      throw error
    }
  }

  async processRawDataRowsWithManualMapping(
    rawDataRows,
    headerRows,
    tableCode,
    config,
    prodiName,
    sectionCode,
    selectedProgram
  ) {
    console.log("🔧 Fallback to manual mapping for", selectedProgram)
    const processedData = rawDataRows.map((row, index) => {
      const item = {
        key: `excel-manual-${selectedProgram}-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        program: selectedProgram,
      }
      if (headerRows.length > 0) {
        const lastHeaderRow = headerRows[headerRows.length - 1]
        lastHeaderRow.forEach((header, colIndex) => {
          if (header && String(header).trim() !== "") {
            const fieldName = this.createFieldName(String(header).trim())
            const value = row[colIndex]
            item[fieldName] = this.processFieldValue(fieldName, value)
          }
        })
      }
      return item
    })
    return {
      allRows: processedData,
      shouldReplaceExisting: true,
      selectedProgram: selectedProgram,
      multiTableProcessed: true,
    }
  }

  createFieldName(header) {
    return header
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
  }

  getCalculatedFields() {
    return {}
  }

  getReadOnlyFields() {
    return Object.keys(this.getCalculatedFields())
  }

  normalizeData(data) {
    return data
  }

  validateData(data) {
    return { valid: true, errors: [] }
  }

  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: new Date().getTime(),
      selected: item.selected !== false,
    }))
  }
}
