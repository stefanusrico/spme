import { processExcelDataBase } from "../utils/tableUtils"
import { calculateStudentSelectionScore } from "../utils/studentUtils"

const seleksiMahasiswaD3Plugin = {
  getInfo() {
    return {
      code: "2a2",
      name: "Student Selection Plugin",
      description: "Plugin for student selection section 2a2",
    }
  },

  configureSection(config) {
    return { ...config, isStudentSection: true }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    // Filter and process data
    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      // Filter out rows with only numbers
      const allNumbers = nonEmptyValues.every((val) => {
        return (
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(val) && val.trim() !== "")
        )
      })

      // Skip rows that are sums or totals
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

      return !allNumbers || nonEmptyValues.length === 0
    })

    // Create data objects
    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        tahun_akademik: "",
        daya_tampung: 0,
        pendaftar_jumlah_calon_mahasiswa: 0,
        lulus_seleksi_jumlah_calon_mahasiswa: 0,
        reguler_jumlah_mahasiswa_baru: 0,
        transfer_jumlah_mahasiswa_baru: 0,
        reguler_jumlah_mahasiswa_aktif: 0,
        transfer_jumlah_mahasiswa_aktif: 0,
      }

      // Fill values from detected columns
      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "tahun_akademik") {
          const normalizedValue = String(value || "")
            .toLowerCase()
            .trim()
          if (
            ["jumlah", "total", "sum", "rata-rata", "average"].includes(
              normalizedValue
            )
          ) {
            return
          }
          item[fieldName] = value ? String(value).trim() : ""
        } else if (
          [
            "daya_tampung",
            "pendaftar_jumlah_calon_mahasiswa",
            "lulus_seleksi_jumlah_calon_mahasiswa",
            "reguler_jumlah_mahasiswa_baru",
            "transfer_jumlah_mahasiswa_baru",
            "reguler_jumlah_mahasiswa_aktif",
            "transfer_jumlah_mahasiswa_aktif",
          ].includes(fieldName)
        ) {
          const num = parseFloat(value)
          item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
        } else {
          item[fieldName] = value ? String(value).trim() : ""
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
          const years = ["TS-3", "TS-2", "TS-1", "TS"]

          initialTableData[tableCode] = years.map((year) => ({
            key: `default-${year}-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 5)}`,
            tahun_akademik: year,
            daya_tampung: 0,
            pendaftar_jumlah_calon_mahasiswa: 0,
            lulus_seleksi_jumlah_calon_mahasiswa: 0,
            reguler_jumlah_mahasiswa_baru: 0,
            transfer_jumlah_mahasiswa_baru: 0,
            reguler_jumlah_mahasiswa_aktif: 0,
            transfer_jumlah_mahasiswa_aktif: 0,
            selected: true,
          }))
        }
      })
    }

    return initialTableData
  },

  /**
   * Calculate score using formula 13.B from API
   */
  async calculateScore(data, config, additionalData = {}) {
    const forceCalculation = additionalData.forcedCalculation === true

    if (!forceCalculation) {
      return {
        score: null,
        scoreDetail: null,
        message: "Calculations only performed on save",
      }
    }

    try {
      // Use utility function from studentUtils.js
      const result = await calculateStudentSelectionScore(data, true)

      if (result && !result.skipped) {
        return {
          score: result.score,
          scoreDetail: result.scoreDetail,
          log: result.calculationLog,
        }
      } else if (result && result.skipped) {
        return {
          score: {
            butir : '',
            nilai : null
          },
          scoreDetail: null,
          message: result.message || "Calculation skipped",
        }
      }

      // Fallback if utility fails
      return this.fallbackCalculateScore(data)
    } catch (error) {
      console.error("Error calculating score:", error)
      return this.fallbackCalculateScore(data)
    }
  },

  /**
   * Fallback calculation method
   */
  fallbackCalculateScore(data) {
    const pendaftar = data.reduce((sum, item) => {
      if (
        item.tahun_akademik &&
        String(item.tahun_akademik).toLowerCase().includes("jumlah")
      ) {
        return sum
      }
      return sum + (parseFloat(item.pendaftar_jumlah_calon_mahasiswa) || 0)
    }, 0)

    const lulusSeleksi = data.reduce((sum, item) => {
      if (
        item.tahun_akademik &&
        String(item.tahun_akademik).toLowerCase().includes("jumlah")
      ) {
        return sum
      }
      return sum + (parseFloat(item.lulus_seleksi_jumlah_calon_mahasiswa) || 0)
    }, 0)

    const ratio = lulusSeleksi > 0 ? pendaftar / lulusSeleksi : 0
    let score = ratio >= 3 ? 4 : (4 * ratio) / 3

    return {
      score: score || 0,
      scoreDetail: {
        pendaftar: pendaftar || 0,
        lulusSeleksi: lulusSeleksi || 0,
        ratio: ratio || 0,
        formula: "Fallback calculation used",
      },
    }
  },

  normalizeData(data) {
    return data
      .filter((item) => {
        if (!item.tahun_akademik) return true
        const normalized = String(item.tahun_akademik).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item) => {
        const numericFields = [
          "daya_tampung",
          "pendaftar_jumlah_calon_mahasiswa",
          "lulus_seleksi_jumlah_calon_mahasiswa",
          "reguler_jumlah_mahasiswa_baru",
          "transfer_jumlah_mahasiswa_baru",
          "reguler_jumlah_mahasiswa_aktif",
          "transfer_jumlah_mahasiswa_aktif",
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

    const filteredData = data.filter((item) => {
      if (!item.tahun_akademik) return true
      const normalized = String(item.tahun_akademik).toLowerCase().trim()
      return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
        normalized
      )
    })

    filteredData.forEach((item, index) => {
      if (!item.tahun_akademik) {
        errors.push(`Row ${index + 1}: Tahun akademik harus diisi`)
      }

      if (
        item.pendaftar_jumlah_calon_mahasiswa <
        item.lulus_seleksi_jumlah_calon_mahasiswa
      ) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah pendaftar tidak boleh lebih kecil dari jumlah yang lulus seleksi`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data
      .filter((item) => {
        if (!item.tahun_akademik) return true
        const normalized = String(item.tahun_akademik).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => ({
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }))
  },
}

export default seleksiMahasiswaD3Plugin
