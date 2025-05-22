/**
 * Plugin khusus untuk section Prestasi Non-Akademik Mahasiswa
 */
import { processExcelDataBase } from "../utils/tableUtils"

const PrestasiNonAkademikMahasiswaPlugin = {
  getInfo: function () {
    return {
      code: "8b2",
      name: "Prestasi Non-Akademik Mahasiswa Plugin",
      description:
        "Plugin for student non-academic achievements data processing",
    }
  },

  configureSection: function (config) {
    return {
      ...config,
      isPrestasiNonAkademikMahasiswaSection: true,
    }
  },

  processExcelData: async function (
    workbook,
    tableCode,
    config,
    prodiName,
    sectionCode
  ) {
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
        nama_kegiatan: "",
        tingkat_lokal_wilayah: false,
        tingkat_nasional: false,
        tingkat_internasional: false,
        prestasi_yang_dicapai: "",
        waktu_perolehan_hh_bb_tttt: null,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName === "prestasi_yang_dicapai" ||
          fieldName === "nama_kegiatan" ||
          fieldName === "no"
        ) {
          item[fieldName] = value ? String(value).trim() : ""
        } else if (fieldName.includes("tingkat")) {
          // For tingkat fields, convert to boolean
          if (typeof value === "boolean") {
            item[fieldName] = value
          } else if (typeof value === "string") {
            const normalized = value.toLowerCase().trim()
            if (
              normalized === "ya" ||
              normalized === "yes" ||
              normalized === "V" ||
              normalized === "1" ||
              normalized === "true" ||
              normalized === "v" ||
              normalized === "√" ||
              normalized === "✓"
            ) {
              item[fieldName] = true
            } else {
              item[fieldName] = false
            }
          } else if (typeof value === "number") {
            item[fieldName] = value > 0
          } else {
            item[fieldName] = false
          }
        } else if (fieldName === "waktu_perolehan_hh_bb_tttt") {
          // Handle date values
          if (typeof value === "number") {
            // Excel dates are stored as numbers
            item[fieldName] = value
          } else if (value instanceof Date) {
            // Convert Date object to Excel serial number
            const excelEpoch = new Date(1899, 11, 30)
            const daysDiff = Math.floor(
              (value - excelEpoch) / (24 * 60 * 60 * 1000)
            )
            item[fieldName] = daysDiff
          } else if (typeof value === "string") {
            // Try to parse string date
            try {
              const date = new Date(value)
              if (!isNaN(date.getTime())) {
                const excelEpoch = new Date(1899, 11, 30)
                const daysDiff = Math.floor(
                  (date - excelEpoch) / (24 * 60 * 60 * 1000)
                )
                item[fieldName] = daysDiff
              } else {
                item[fieldName] = null
              }
            } catch (e) {
              item[fieldName] = null
            }
          } else {
            item[fieldName] = null
          }
        } else {
          // Handle other numeric values
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

  initializeData: function (config, prodiName, sectionCode, existingData = {}) {
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

  calculateScore: function (data) {
    if (!data || data.length === 0) {
      return {
        scores: [
          {
            butir : '',
            nilai : 0
          }
        ],
        scoreDetail: {
          totalAchievements: 0,
          internationalAchievements: 0,
          nationalAchievements: 0,
          localAchievements: 0,
        },
      }
    }

    // Count achievements by level
    let internationalCount = 0
    let nationalCount = 0
    let localCount = 0

    data.forEach((item) => {
      if (item.tingkat_internasional === true) {
        internationalCount++
      } else if (item.tingkat_nasional === true) {
        nationalCount++
      } else if (item.tingkat_lokal_wilayah === true) {
        localCount++
      }
    })

    const totalAchievements = internationalCount + nationalCount + localCount

    // Calculate score based on number of achievements and their levels
    // For non-academic achievements, the formula may be different
    let score = 0

    // Formula weights: international (4x), national (2x), local (1x)
    // with a cap at 4 points
    const weightedSum = internationalCount * 4 + nationalCount * 2 + localCount

    if (weightedSum >= 8) {
      score = 4
    } else {
      score = weightedSum / 2
    }

    return {
      score: Math.min(4, Math.max(0, score)),
      scoreDetail: {
        totalAchievements,
        internationalAchievements: internationalCount,
        nationalAchievements: nationalCount,
        localAchievements: localCount,
        weightedSum,
      },
    }
  },

  normalizeData: function (data) {
    return data.map((item) => {
      const result = { ...item }

      // Ensure tingkat fields are properly normalized to boolean values
      const booleanFields = [
        "tingkat_nasional",
        "tingkat_internasional",
        "tingkat_lokal_wilayah",
      ]
      booleanFields.forEach((field) => {
        if (result[field] !== undefined) {
          if (typeof result[field] === "number") {
            result[field] = result[field] > 0
          } else {
            result[field] = Boolean(result[field])
          }
        }
      })

      return result
    })
  },

  validateData: function (data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_kegiatan) {
        errors.push(`Row ${index + 1}: Nama Kegiatan harus diisi`)
      }

      if (!item.prestasi_yang_dicapai) {
        errors.push(`Row ${index + 1}: Prestasi Yang Dicapai harus diisi`)
      }

      const nasional = item.tingkat_nasional === true
      const internasional = item.tingkat_internasional === true
      const lokal = item.tingkat_lokal_wilayah === true

      if (!nasional && !internasional && !lokal) {
        errors.push(
          `Row ${
            index + 1
          }: Minimal satu tingkat (Lokal/Wilayah, Nasional, atau Internasional) harus dipilih`
        )
      }

      // Only one level should be selected
      if (
        (nasional && internasional) ||
        (nasional && lokal) ||
        (internasional && lokal)
      ) {
        errors.push(
          `Row ${
            index + 1
          }: Prestasi hanya boleh untuk satu tingkat (Lokal/Wilayah, Nasional, atau Internasional)`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving: function (data) {
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

export default PrestasiNonAkademikMahasiswaPlugin
