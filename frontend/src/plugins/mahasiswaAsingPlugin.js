import { processExcelDataBase } from "../utils/tableUtils"

const MahasiswaAsingPlugin = {
  getInfo() {
    return {
      code: "2b",
      name: "Mahasiswa Asing Plugin",
      description: "Plugin for international student data processing",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isMahasiswaAsingSection: true,
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
        program_studi: "",
        ts_2_jumlah_mahasiswa_aktif: 0,
        ts_1_jumlah_mahasiswa_aktif: 0,
        ts_jumlah_mahasiswa_aktif: 0,
        ts_2_jumlah_mahasiswa_asing_penuh_waktu_full_time: 0,
        ts_1_jumlah_mahasiswa_asing_penuh_waktu_full_time: 0,
        ts_jumlah_mahasiswa_asing_penuh_waktu_full_time: 0,
        ts_2_jumlah_mahasiswa_asing_paruh_waktu_part_time: 0,
        ts_1_jumlah_mahasiswa_asing_paruh_waktu_part_time: 0,
        ts_jumlah_mahasiswa_asing_paruh_waktu_part_time: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "program_studi" || fieldName === "no") {
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
    let totalStudents = 0
    let totalInternationalStudents = 0

    data.forEach((item) => {
      totalStudents +=
        parseFloat(item.ts_2_jumlah_mahasiswa_aktif || 0) +
        parseFloat(item.ts_1_jumlah_mahasiswa_aktif || 0) +
        parseFloat(item.ts_jumlah_mahasiswa_aktif || 0)

      totalInternationalStudents +=
        parseFloat(
          item.ts_2_jumlah_mahasiswa_asing_penuh_waktu_full_time || 0
        ) +
        parseFloat(
          item.ts_1_jumlah_mahasiswa_asing_penuh_waktu_full_time || 0
        ) +
        parseFloat(item.ts_jumlah_mahasiswa_asing_penuh_waktu_full_time || 0) +
        parseFloat(
          item.ts_2_jumlah_mahasiswa_asing_paruh_waktu_part_time || 0
        ) +
        parseFloat(
          item.ts_1_jumlah_mahasiswa_asing_paruh_waktu_part_time || 0
        ) +
        parseFloat(item.ts_jumlah_mahasiswa_asing_paruh_waktu_part_time || 0)
    })

    const percentage =
      totalStudents > 0 ? (totalInternationalStudents / totalStudents) * 100 : 0

    let score
    if (percentage >= 1) {
      score = 4
    } else {
      score = (percentage / 1) * 4
    }

    return {
      scores: [
        {
          butir: 14,
          nilai: score,
        },
      ],
      scoreDetail: {
        totalStudents,
        totalInternationalStudents,
        percentageInternational: percentage.toFixed(2) + "%",
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const numericFields = [
        "ts_2_jumlah_mahasiswa_aktif",
        "ts_1_jumlah_mahasiswa_aktif",
        "ts_jumlah_mahasiswa_aktif",
        "ts_2_jumlah_mahasiswa_asing_penuh_waktu_full_time",
        "ts_1_jumlah_mahasiswa_asing_penuh_waktu_full_time",
        "ts_jumlah_mahasiswa_asing_penuh_waktu_full_time",
        "ts_2_jumlah_mahasiswa_asing_paruh_waktu_part_time",
        "ts_1_jumlah_mahasiswa_asing_paruh_waktu_part_time",
        "ts_jumlah_mahasiswa_asing_paruh_waktu_part_time",
      ]

      const result = { ...item }

      numericFields.forEach((field) => {
        result[field] = !isNaN(parseFloat(result[field]))
          ? Math.max(0, parseFloat(result[field]))
          : 0
      })

      if (result.program_studi && typeof result.program_studi === "object") {
        result.program_studi =
          result.program_studi.name || JSON.stringify(result.program_studi)
      }

      return result
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.program_studi) {
        errors.push(`Row ${index + 1}: Program Studi harus diisi`)
      }

      const tsActiveStudents = parseFloat(item.ts_jumlah_mahasiswa_aktif || 0)
      const tsInternationalStudents =
        parseFloat(item.ts_jumlah_mahasiswa_asing_penuh_waktu_full_time || 0) +
        parseFloat(item.ts_jumlah_mahasiswa_asing_paruh_waktu_part_time || 0)

      if (tsInternationalStudents > tsActiveStudents) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah mahasiswa asing tidak boleh melebihi jumlah mahasiswa aktif untuk TS`
        )
      }

      const ts1ActiveStudents = parseFloat(
        item.ts_1_jumlah_mahasiswa_aktif || 0
      )
      const ts1InternationalStudents =
        parseFloat(
          item.ts_1_jumlah_mahasiswa_asing_penuh_waktu_full_time || 0
        ) +
        parseFloat(item.ts_1_jumlah_mahasiswa_asing_paruh_waktu_part_time || 0)

      if (ts1InternationalStudents > ts1ActiveStudents) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah mahasiswa asing tidak boleh melebihi jumlah mahasiswa aktif untuk TS-1`
        )
      }

      const ts2ActiveStudents = parseFloat(
        item.ts_2_jumlah_mahasiswa_aktif || 0
      )
      const ts2InternationalStudents =
        parseFloat(
          item.ts_2_jumlah_mahasiswa_asing_penuh_waktu_full_time || 0
        ) +
        parseFloat(item.ts_2_jumlah_mahasiswa_asing_paruh_waktu_part_time || 0)

      if (ts2InternationalStudents > ts2ActiveStudents) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah mahasiswa asing tidak boleh melebihi jumlah mahasiswa aktif untuk TS-2`
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

      if (
        preparedItem.program_studi &&
        typeof preparedItem.program_studi === "object"
      ) {
        preparedItem.program_studi =
          preparedItem.program_studi.name ||
          JSON.stringify(preparedItem.program_studi)
      }

      return preparedItem
    })
  },
}

export default MahasiswaAsingPlugin
