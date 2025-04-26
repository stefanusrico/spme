/**
 * Plugin khusus untuk section Kesesuaian Bidang Kerja
 */
import { processExcelDataBase } from "../utils/tableUtils"

const kesesuaianBidangKerjaPlugin = {
  getInfo() {
    return {
      code: "8b",
      name: "Kesesuaian Bidang Kerja Plugin",
      description: "Plugin for employment field conformity data processing",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isKesesuaianBidangKerjaSection: true,
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

      // Cek apakah isinya angka urutan (1, 2, 3, dst)
      const isSequentialNumbersRow = nonEmptyValues.every((val, idx) => {
        const num = parseInt(val)
        return !isNaN(num) && num === idx + 1
      })
      if (isSequentialNumbersRow) return false

      // Cek apakah ada label summary kayak "Jumlah"
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
        tahun_lulus: "",
        jumlah_bekerja_sesuai_bidang: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName === "program_studi" ||
          fieldName === "tahun_lulus" ||
          fieldName === "no"
        ) {
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

        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          initialTableData[tableCode] = existingData[tableCode]
        } else {
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  },

  calculateScore(data) {
    if (!data || data.length === 0) {
      return {
        score: 0,
        scoreDetail: {
          percentage: 0,
          fieldConformityPoints: 0,
        },
      }
    }

    let totalTracked = 0
    let totalFieldConform = 0

    data.forEach((item) => {
      const tracked = parseFloat(item.jumlah_lulusan_terlacak || 0)
      const conform = parseFloat(item.jumlah_bekerja_sesuai_bidang || 0)

      if (tracked > 0) {
        totalTracked += tracked
        totalFieldConform += conform
      }
    })

    const percentage =
      totalTracked > 0 ? (totalFieldConform / totalTracked) * 100 : 0

    let score
    if (percentage >= 80) {
      score = 4
    } else if (percentage >= 60) {
      score = 3
    } else if (percentage >= 40) {
      score = 2
    } else if (percentage >= 20) {
      score = 1
    } else {
      score = 0
    }

    return {
      score,
      scoreDetail: {
        percentage: percentage.toFixed(2),
        totalTracked,
        totalFieldConform,
        fieldConformityPoints: score,
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const numericFields = [
        "jumlah_lulusan_terlacak",
        "jumlah_bekerja_sesuai_bidang",
      ]

      const result = { ...item }

      numericFields.forEach((field) => {
        result[field] = !isNaN(parseFloat(result[field]))
          ? Math.max(0, parseFloat(result[field]))
          : 0
      })

      return result
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.tahun_lulus) {
        errors.push(`Row ${index + 1}: Tahun Lulus harus diisi`)
      }

      const tracked = parseFloat(item.jumlah_lulusan_terlacak || 0)
      const conform = parseFloat(item.jumlah_bekerja_sesuai_bidang || 0)

      if (conform > tracked) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah yang bekerja sesuai bidang tidak boleh melebihi jumlah lulusan yang terlacak`
        )
      }
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

export default kesesuaianBidangKerjaPlugin
