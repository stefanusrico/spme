import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class DosenPembimbingTugasAkhirPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a2",
      name: "Dosen Pembimbing Tugas Akhir",
      description: "Plugin for processing final project supervisor",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDosenPembimbingTugasAkhir: true,
    }
  }

  hasDefaultData() {
    return false
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = PluginUtils.filterDataRows(rawData)

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        // Text fields
        if (
          fieldName === "nama_dosen_2" ||
          fieldName === "nomor_sk_penugasan_pembimbing_ts_2" ||
          fieldName === "nomor_sk_penugasan_pembimbing_ts_1" ||
          fieldName === "nomor_sk_penugasan_pembimbing_ts"
        ) {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        }
        // Numeric fields including calculated fields
        else if (
          [
            "pada_ps_yang_diakreditasi_3_ts_2",
            "pada_ps_yang_diakreditasi_3_ts_1",
            "pada_ps_yang_diakreditasi_3_ts",
            "pada_ps_lain_di_pt_4_ts_2",
            "pada_ps_lain_di_pt_4_ts_1",
            "pada_ps_lain_di_pt_4_ts",
            // ADD: Include calculated fields
            "pada_ps_yang_diakreditasi_3_rata_rata",
            "pada_ps_lain_di_pt_4_rata_rata",
            "rata_rata_jumlah_bimbingan_di_semua_program_semester_5",
          ].includes(fieldName)
        ) {
          // Parse and format numeric fields to 2 decimal places
          const numValue = PluginUtils.parseNumber(value, 0)
          item[fieldName] = parseFloat(PluginUtils.formatNumber(numValue, 2))
        }
        // Special handling for 'no' field as integer
        else if (fieldName === "no") {
          item[fieldName] = PluginUtils.parseInt(value, 0)
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
  }

  async calculateScore(data, config, additionalData = {}) {
    let RDPU = 0
    let index = 0
    let totalAverageFinalProjectSupervisor = 0

    // Fungsi pengecekan isi field
    data.forEach((item) => {
      const value = item.rata_rata_jumlah_bimbingan_di_semua_program_semester_5
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== 0
      ) {
        index += 1
        totalAverageFinalProjectSupervisor += parseFloat(value)
      }
    })

    RDPU = index > 0 ? totalAverageFinalProjectSupervisor / index : 0

    // Hitung skor
    let score = 0
    if (RDPU <= 6) {
      score = 4
    } else if (RDPU > 6 && RDPU <= 10) {
      score = 7 - RDPU / 2
    }

    console.log("Hasil RDPU:", RDPU)
    console.log("Score:", score)

    return {
      scores: [
        {
          butir: 21,
          nilai: parseFloat(PluginUtils.formatNumber(score, 2)),
        },
      ],
      scoreDetail: {
        RDPU: parseFloat(PluginUtils.formatNumber(RDPU, 2)),
      },
    }
  }

  /**
   * Define calculated fields and their formulas
   * @returns {Object} - Map of field names to calculation functions
   */
  getCalculatedFields() {
    return {
      // Average for PS yang diakreditasi (columns from TS-2, TS-1, TS)
      pada_ps_yang_diakreditasi_3_rata_rata: (row) => {
        const ts2 = PluginUtils.parseNumber(
          row.pada_ps_yang_diakreditasi_3_ts_2,
          0
        )
        const ts1 = PluginUtils.parseNumber(
          row.pada_ps_yang_diakreditasi_3_ts_1,
          0
        )
        const ts = PluginUtils.parseNumber(
          row.pada_ps_yang_diakreditasi_3_ts,
          0
        )
        const average = (ts2 + ts1 + ts) / 3
        return parseFloat(PluginUtils.formatNumber(average, 2))
      },

      // Average for PS lain di PT (columns from TS-2, TS-1, TS)
      pada_ps_lain_di_pt_4_rata_rata: (row) => {
        const ts2 = PluginUtils.parseNumber(row.pada_ps_lain_di_pt_4_ts_2, 0)
        const ts1 = PluginUtils.parseNumber(row.pada_ps_lain_di_pt_4_ts_1, 0)
        const ts = PluginUtils.parseNumber(row.pada_ps_lain_di_pt_4_ts, 0)
        const average = (ts2 + ts1 + ts) / 3
        return parseFloat(PluginUtils.formatNumber(average, 2))
      },

      // Total average across both PS types
      rata_rata_jumlah_bimbingan_di_semua_program_semester_5: (row) => {
        const avgPS = PluginUtils.parseNumber(
          row.pada_ps_yang_diakreditasi_3_rata_rata,
          0
        )
        const avgOther = PluginUtils.parseNumber(
          row.pada_ps_lain_di_pt_4_rata_rata,
          0
        )
        const totalAverage = avgPS + avgOther
        return parseFloat(PluginUtils.formatNumber(totalAverage, 2))
      },
    }
  }

  /**
   * Recalculate all calculated fields for a row
   * @param {Object} row - Data row
   * @returns {Object} - Updated row with calculated values
   */
  recalculateRow(row) {
    const calculatedFields = this.getCalculatedFields()
    const updatedRow = { ...row }

    Object.entries(calculatedFields).forEach(([fieldName, calcFunction]) => {
      updatedRow[fieldName] = calcFunction(updatedRow)
    })

    return updatedRow
  }

  /**
   * Update all calculated fields in the dataset
   * @param {Array} data - Array of data rows
   * @returns {Array} - Updated data with calculated fields
   */
  recalculateData(data) {
    if (!Array.isArray(data)) return []
    return data.map((row) => this.recalculateRow(row))
  }

  // Override the normalizeData method to include calculations
  normalizeData(data) {
    // First apply standard normalization
    const normalizedData = super.normalizeData
      ? super.normalizeData(data)
      : data.map((item) => {
          const result = { ...item }

          // Numeric fields that should be formatted to 2 decimal places
          const numericFields = [
            "pada_ps_yang_diakreditasi_3_ts_2",
            "pada_ps_yang_diakreditasi_3_ts_1",
            "pada_ps_yang_diakreditasi_3_ts",
            "pada_ps_lain_di_pt_4_ts_2",
            "pada_ps_lain_di_pt_4_ts_1",
            "pada_ps_lain_di_pt_4_ts",
            // ADD: Include calculated fields for normalization too
            "pada_ps_yang_diakreditasi_3_rata_rata",
            "pada_ps_lain_di_pt_4_rata_rata",
            "rata_rata_jumlah_bimbingan_di_semua_program_semester_5",
          ]

          // Text fields
          const textFields = [
            "nama_dosen_2",
            "nomor_sk_penugasan_pembimbing_ts_2",
            "nomor_sk_penugasan_pembimbing_ts_1",
            "nomor_sk_penugasan_pembimbing_ts",
          ]

          // Process text fields
          textFields.forEach((field) => {
            if (result[field] !== undefined) {
              result[field] = PluginUtils.normalizeTextField(result[field])
            }
          })

          // Process numeric fields with formatting
          numericFields.forEach((field) => {
            if (result[field] !== undefined) {
              const numValue = PluginUtils.parseNumber(result[field], 0)
              result[field] = parseFloat(PluginUtils.formatNumber(numValue, 2))
            }
          })

          // Handle 'no' field as integer
          if (result.no !== undefined) {
            result.no = PluginUtils.parseInt(result.no, 0)
          }

          return result
        })

    // Apply calculations after normalization
    return this.recalculateData(normalizedData)
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      // Daftar field wajib isi
      if (!item.nama_dosen_2) {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }
      if (!item.nomor_sk_penugasan_pembimbing_ts_2) {
        errors.push(`Row ${index + 1}: Nomor SK TS-2 harus diisi`)
      }
      if (!item.nomor_sk_penugasan_pembimbing_ts_1) {
        errors.push(`Row ${index + 1}: Nomor SK TS-1 harus diisi`)
      }
      if (!item.nomor_sk_penugasan_pembimbing_ts) {
        errors.push(`Row ${index + 1}: Nomor SK TS harus diisi`)
      }

      // Helper untuk cek jumlah mahasiswa dibimbing dengan increased tolerance
      const validateJumlahMahasiswa = (rataRata, ts2, ts1, ts) => {
        const tolerance = 0.01 // Increased tolerance for floating point precision
        const total =
          PluginUtils.parseNumber(ts2, 0) +
          PluginUtils.parseNumber(ts1, 0) +
          PluginUtils.parseNumber(ts, 0)
        const expectedAvg = total / 3
        const actualAvg = PluginUtils.parseNumber(rataRata, 0)
        return Math.abs(actualAvg - expectedAvg) <= tolerance
      }

      // Validasi PS yang diakreditasi
      if (
        !validateJumlahMahasiswa(
          item.pada_ps_yang_diakreditasi_3_rata_rata,
          item.pada_ps_yang_diakreditasi_3_ts_2,
          item.pada_ps_yang_diakreditasi_3_ts_1,
          item.pada_ps_yang_diakreditasi_3_ts
        )
      ) {
        errors.push(
          `Row ${
            index + 1
          }: Rata-rata PS yang diakreditasi tidak sesuai dengan data TS`
        )
      }

      // Validasi PS lain di PT
      if (
        !validateJumlahMahasiswa(
          item.pada_ps_lain_di_pt_4_rata_rata,
          item.pada_ps_lain_di_pt_4_ts_2,
          item.pada_ps_lain_di_pt_4_ts_1,
          item.pada_ps_lain_di_pt_4_ts
        )
      ) {
        errors.push(
          `Row ${
            index + 1
          }: Rata-rata PS lain di PT tidak sesuai dengan data TS`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Export as named export
export const dosenPembimbingTugasAkhirPlugin =
  new DosenPembimbingTugasAkhirPlugin()

// Export as default for legacy imports
export default dosenPembimbingTugasAkhirPlugin
