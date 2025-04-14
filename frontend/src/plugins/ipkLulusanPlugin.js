/**
 * Plugin khusus untuk section IPK Lulusan
 */
import { processExcelDataBase } from "../utils/tableUtils"

const ipkLulusanPlugin = {
  getInfo() {
    return {
      code: "8a",
      name: "IPK Lulusan Plugin",
      description: "Plugin for graduate GPA (IPK) data processing",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isIpkLulusanSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices, jsonData, headerRowIndex } =
      await processExcelDataBase(workbook, tableCode, config, prodiName)

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      const allNumbers = nonEmptyValues.every((val) => {
        return (
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(val) && val.trim() !== "")
        )
      })
      if (allNumbers && nonEmptyValues.length > 0) return false

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
        selected: true,
        tahun_lulus: "",
        jumlah_lulusan: 0,
        indeks_prestasi_kumulatif_min: 0,
        indeks_prestasi_kumulatif_rata_rata: 0,
        indeks_prestasi_kumulatif_maks: 0,
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
        } else if (fieldName.includes("indeks_prestasi_kumulatif")) {
          // Handle IPK values (usually between 0-4.00)
          const num = parseFloat(value)
          item[fieldName] = !isNaN(num) ? Math.min(4, Math.max(0, num)) : 0
        } else {
          // Handle other numeric values like jumlah_lulusan
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
          averageIPK: 0,
          ipkPoints: 0,
        },
      }
    }

    // Calculate weighted average IPK across all years
    let totalWeightedIPK = 0
    let totalGraduates = 0

    data.forEach((item) => {
      const graduates = parseFloat(item.jumlah_lulusan || 0)
      const avgIPK = parseFloat(item.indeks_prestasi_kumulatif_rata_rata || 0)

      if (graduates > 0 && avgIPK > 0) {
        totalWeightedIPK += avgIPK * graduates
        totalGraduates += graduates
      }
    })

    const averageIPK =
      totalGraduates > 0 ? totalWeightedIPK / totalGraduates : 0

    // Scoring formula based on average IPK
    let score
    if (averageIPK >= 3.25) {
      score = 4
    } else if (averageIPK >= 3.0) {
      score = 3 + (averageIPK - 3.0) / 0.25
    } else if (averageIPK >= 2.75) {
      score = 2 + (averageIPK - 2.75) / 0.25
    } else if (averageIPK >= 2.5) {
      score = 1 + (averageIPK - 2.5) / 0.25
    } else {
      score = averageIPK / 2.5
    }

    return {
      score: Math.min(4, Math.max(0, score)),
      scoreDetail: {
        averageIPK: averageIPK.toFixed(2),
        totalGraduates,
        ipkPoints: score.toFixed(2),
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const numericFields = [
        "jumlah_lulusan",
        "indeks_prestasi_kumulatif_min",
        "indeks_prestasi_kumulatif_rata_rata",
        "indeks_prestasi_kumulatif_maks",
      ]

      const result = { ...item }

      numericFields.forEach((field) => {
        // For IPK fields, ensure values are between 0 and 4
        if (field.includes("indeks_prestasi_kumulatif")) {
          result[field] = !isNaN(parseFloat(result[field]))
            ? Math.min(4, Math.max(0, parseFloat(result[field])))
            : 0
        } else {
          result[field] = !isNaN(parseFloat(result[field]))
            ? Math.max(0, parseFloat(result[field]))
            : 0
        }
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

      const min = parseFloat(item.indeks_prestasi_kumulatif_min || 0)
      const avg = parseFloat(item.indeks_prestasi_kumulatif_rata_rata || 0)
      const max = parseFloat(item.indeks_prestasi_kumulatif_maks || 0)

      if (min > avg) {
        errors.push(
          `Row ${
            index + 1
          }: IPK Minimum tidak boleh lebih besar dari IPK Rata-rata`
        )
      }

      if (avg > max) {
        errors.push(
          `Row ${
            index + 1
          }: IPK Rata-rata tidak boleh lebih besar dari IPK Maksimum`
        )
      }

      if (min > 4 || avg > 4 || max > 4) {
        errors.push(`Row ${index + 1}: Nilai IPK tidak boleh melebihi 4.00`)
      }

      const graduates = parseFloat(item.jumlah_lulusan || 0)
      if (graduates <= 0 && (min > 0 || avg > 0 || max > 0)) {
        errors.push(
          `Row ${index + 1}: Jumlah Lulusan harus diisi jika ada data IPK`
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
      const preparedItem = {
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }

      return preparedItem
    })
  },
}

export default ipkLulusanPlugin
