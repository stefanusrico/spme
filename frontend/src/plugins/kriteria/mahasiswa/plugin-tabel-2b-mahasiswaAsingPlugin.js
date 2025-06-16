import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class MahasiswaAsingPlugin extends BasePlugin {
  constructor() {
    super({
      code: "2b",
      name: "Mahasiswa Asing Plugin",
      description: "Plugin for international student data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isMahasiswaAsingSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    console.log(
      `Processing Excel data for Mahasiswa Asing table (${tableCode})...`
    )

    try {
      const result = await processExcelDataBase(
        workbook,
        tableCode,
        config,
        prodiName
      )

      if (!result || !result.rawData) {
        console.warn("No data returned from processExcelDataBase")
        return {
          allRows: [],
          shouldReplaceExisting: false,
        }
      }

      const { rawData, detectedIndices } = result

      if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn("rawData is not a valid array or is empty")
        return {
          allRows: [],
          shouldReplaceExisting: false,
        }
      }

      const filteredData = PluginUtils.filterDataRows(rawData)

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

        // Map Excel data using detectedIndices
        Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
          if (colIndex === undefined || colIndex < 0) return

          const value = row[colIndex]

          if (fieldName === "program_studi" || fieldName === "no") {
            item[fieldName] = PluginUtils.normalizeTextField(value)
          } else if (this.getNumericFields().includes(fieldName)) {
            item[fieldName] = PluginUtils.parseNumber(value, 0)
          } else {
            item[fieldName] = PluginUtils.normalizeTextField(value)
          }
        })

        return item
      })

      return {
        allRows: processedData,
        shouldReplaceExisting: true,
      }
    } catch (error) {
      console.error("Error in processExcelData:", error)
      return {
        allRows: [],
        shouldReplaceExisting: false,
      }
    }
  }

  /**
   * Get list of numeric fields
   * @returns {Array} - Array of numeric field names
   */
  getNumericFields() {
    return [
      "no",
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
  }

  /**
   * Get list of text fields
   * @returns {Array} - Array of text field names
   */
  getTextFields() {
    return ["program_studi"]
  }

  /**
   * Process field values to ensure correct data types during data entry
   */
  processFieldValue(field, value, sectionCode) {
    const textFields = this.getTextFields()
    const numericFields = this.getNumericFields()

    if (textFields.includes(field)) {
      return PluginUtils.normalizeTextField(value)
    } else if (numericFields.includes(field)) {
      return PluginUtils.parseNumber(value, 0)
    }

    // Default behavior
    return value
  }

  async calculateScore(data, config, additionalData = {}) {
    let totalStudents = 0
    let totalInternationalStudents = 0

    data.forEach((item) => {
      // Total active students across all periods
      totalStudents +=
        parseFloat(item.ts_2_jumlah_mahasiswa_aktif || 0) +
        parseFloat(item.ts_1_jumlah_mahasiswa_aktif || 0) +
        parseFloat(item.ts_jumlah_mahasiswa_aktif || 0)

      // Total international students (full-time + part-time) across all periods
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

    // Calculate percentage
    const percentage =
      totalStudents > 0 ? (totalInternationalStudents / totalStudents) * 100 : 0

    // Calculate score based on percentage
    let score = 0
    if (percentage >= 1) {
      score = 4
    } else {
      score = (percentage / 1) * 4
    }

    return {
      scores: [
        {
          butir: 14,
          nilai: PluginUtils.roundToDecimal(score, 2),
        },
      ],
      scoreDetail: {
        totalStudents,
        totalInternationalStudents,
        percentageInternational: PluginUtils.roundToDecimal(percentage, 2),
        formula: "Skor = (Persentase Mahasiswa Asing / 1%) × 4, maksimal 4",
        calculationBreakdown: {
          "Total Mahasiswa Aktif": totalStudents,
          "Total Mahasiswa Asing": totalInternationalStudents,
          Persentase: `${PluginUtils.roundToDecimal(percentage, 2)}%`,
          Skor:
            percentage >= 1
              ? "4 (karena ≥ 1%)"
              : `(${PluginUtils.roundToDecimal(
                  percentage,
                  2
                )}% / 1%) × 4 = ${PluginUtils.roundToDecimal(score, 2)}`,
        },
      },
    }
  }

  normalizeData(data) {
    if (!Array.isArray(data)) return []

    return data.map((item) => {
      const numericFields = this.getNumericFields()
      const textFields = this.getTextFields()

      const result = {
        ...item,
        id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
      }

      // Process numeric fields
      numericFields.forEach((field) => {
        result[field] = PluginUtils.parseNumber(result[field], 0)
      })

      // Process text fields
      textFields.forEach((field) => {
        if (result[field] && typeof result[field] === "object") {
          result[field] = result[field].name || JSON.stringify(result[field])
        } else {
          result[field] = PluginUtils.normalizeTextField(result[field])
        }
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.program_studi) {
        errors.push(`Row ${index + 1}: Program Studi harus diisi`)
      }

      // Validate numeric fields are not negative
      this.getNumericFields().forEach((field) => {
        if (field !== "no" && parseFloat(item[field] || 0) < 0) {
          errors.push(`Row ${index + 1}: ${field} tidak boleh bernilai negatif`)
        }
      })

      // Validate TS: International students should not exceed active students
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

      // Validate TS-1: International students should not exceed active students
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

      // Validate TS-2: International students should not exceed active students
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
  }

  prepareDataForSaving(data) {
    if (!Array.isArray(data)) return []

    return data.map((item, index) => {
      const { id, key, _editing, _selected, ...cleanRow } = item

      const preparedItem = {
        ...cleanRow,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }

      // Ensure program_studi is a string
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
  }
}

export const mahasiswaAsingPlugin = new MahasiswaAsingPlugin()

export default mahasiswaAsingPlugin
