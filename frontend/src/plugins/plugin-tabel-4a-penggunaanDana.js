/**
 * Plugin khusus untuk bagian Penggunaan Dana
 */
import { processExcelDataBase } from "../utils/tableUtils"

const penggunaanDanaPlugin = {
  getInfo() {
    return {
      code: "4a",
      name: "Penggunaan Dana Plugin",
      description: "Plugin for processing budget usage data in LKPS Table 4.a",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isPenggunaanDanaSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    console.log("=== DEBUG: Detected Indices ===")
    console.table(detectedIndices)

    console.log("=== DEBUG: Raw Data ===")
    console.table(rawData)

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      const isSequentialNumbersRow = nonEmptyValues.every((val, idx) => {
        const num = parseInt(val)
        return !isNaN(num) && num === idx + 1
      })
      if (isSequentialNumbersRow) return false

      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false
        const normalized = String(cell).toLowerCase().trim()
        return (
          normalized === "jumlah" ||
          normalized === "total" ||
          normalized === "sum" ||
          normalized === "rata-rata" ||
          normalized === "average"
        )
      })
      if (hasSummaryLabel) return false

      return true
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        jenis_penggunaan: "",
        ts_2_unit_pengelola_program_studi_rupiah: 0,
        ts_1_unit_pengelola_program_studi_rupiah: 0,
        ts_unit_pengelola_program_studi_rupiah: 0,
        rata_rata_unit_pengelola_program_studi_rupiah: 0,
        ts_2_program_studi_rupiah: 0,
        ts_1_program_studi_rupiah: 0,
        ts_program_studi_rupiah: 0,
        rata_rata_program_studi_rupiah: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (fieldName === "jenis_penggunaan") {
          item[fieldName] = value ? String(value).trim() : ""
        } else {
          const num = parseFloat(value)
          item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table
        initialTableData[tableCode] = existingData[tableCode] || []
      })
    }

    return initialTableData
  },

  calculateScore(data) {
    console.log("=== DEBUG: No score calculation for Penggunaan Dana ===")
    return {
      scores: [
        {
          butir: 47, // Misalnya butir 47 adalah penggunaan dana, sesuaikan dengan dokumen aslinya
          nilai: 0,
        },
      ],
      scoreDetail: {
        note: "Tidak ada perhitungan skor otomatis untuk bagian ini.",
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      result.ts2 = !isNaN(parseFloat(result.ts2)) ? Math.max(0, parseFloat(result.ts2)) : 0
      result.ts1 = !isNaN(parseFloat(result.ts1)) ? Math.max(0, parseFloat(result.ts1)) : 0
      result.ts = !isNaN(parseFloat(result.ts)) ? Math.max(0, parseFloat(result.ts)) : 0

      return result
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.jenis_penggunaan || item.jenis_penggunaan.trim() === "") {
        errors.push(`Row ${index + 1}: Jenis Penggunaan harus diisi`)
      }

      ["ts2", "ts1", "ts"].forEach((field) => {
        const val = parseFloat(item[field])
        if (isNaN(val) || val < 0) {
          errors.push(`Row ${index + 1}: Nilai ${field.toUpperCase()} tidak valid`)
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => {
      return {
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }
    })
  },
}

export default penggunaanDanaPlugin
