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
        nama_dosen_2: "",
        ts_2_pada_ps_yang_diakreditasi_3: 0,
        ts_1_pada_ps_yang_diakreditasi_3: 0,
        ts_pada_ps_yang_diakreditasi_3: 0,
        rata_rata_pada_ps_yang_diakreditasi_3: 0,
        ts_2_pada_ps_lain_di_pt_4: 0,
        ts_1_pada_ps_lain_di_pt_4: 0,
        ts_pada_ps_lain_di_pt_4: 0,
        rata_rata_pada_ps_lain_di_pt_4: 0,
        rata_rata_jumlah_bimbingan_di_semua_program_semester_5: 0,
        ts_2_nomor_sk_penugasan_pembimbing: "",
        ts_1_nomor_sk_penugasan_pembimbing: "",
        ts_nomor_sk_penugasan_pembimbing: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName === "no" ||
          fieldName === "nama_dosen_2" ||
          fieldName === "ts_2_nomor_sk_penugasan_pembimbing" ||
          fieldName === "ts_1_nomor_sk_penugasan_pembimbing" ||
          fieldName === "ts_nomor_sk_penugasan_pembimbing"
        ) {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else if (
          [
            "ts_2_pada_ps_yang_diakreditasi_3",
            "ts_1_pada_ps_yang_diakreditasi_3",
            "ts_pada_ps_yang_diakreditasi_3",
            "rata_rata_pada_ps_yang_diakreditasi_3",
            "ts_2_pada_ps_lain_di_pt_4",
            "ts_1_pada_ps_lain_di_pt_4",
            "ts_pada_ps_lain_di_pt_4",
            "rata_rata_pada_ps_lain_di_pt_4",
            "rata_rata_jumlah_bimbingan_di_semua_program_semester_5",
          ].includes(fieldName)
        ) {
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
          nilai: PluginUtils.roundToDecimal(score),
        },
      ],
      scoreDetail: {
        RDPU: PluginUtils.roundToDecimal(Math.round(RDPU * 100) / 100),
      },
    }
  }

  /**
   * Define calculated fields and their formulas
   * @returns {Object} - Map of field names to calculation functions
   */
  getCalculatedFields() {
    return {
      rata_rata_pada_ps_yang_diakreditasi_3: (row) => {
        const ts2 = parseFloat(row.ts_2_pada_ps_yang_diakreditasi_3 || 0)
        const ts1 = parseFloat(row.ts_1_pada_ps_yang_diakreditasi_3 || 0)
        const ts = parseFloat(row.ts_pada_ps_yang_diakreditasi_3 || 0)
        return Number(((ts2 + ts1 + ts) / 3).toFixed(2))
      },

      // Average for PS lain di PT (columns from TS-2, TS-1, TS)
      rata_rata_pada_ps_lain_di_pt_4: (row) => {
        const ts2 = parseFloat(row.ts_2_pada_ps_lain_di_pt_4 || 0)
        const ts1 = parseFloat(row.ts_1_pada_ps_lain_di_pt_4 || 0)
        const ts = parseFloat(row.ts_pada_ps_lain_di_pt_4 || 0)
        return Number(((ts2 + ts1 + ts) / 3).toFixed(2))
      },

      // Total average across both PS types
      rata_rata_jumlah_bimbingan_di_semua_program_semester_5: (row) => {
        const avgPS = parseFloat(row.rata_rata_pada_ps_yang_diakreditasi_3 || 0)
        const avgOther = parseFloat(row.rata_rata_pada_ps_lain_di_pt_4 || 0)
        return Number(((avgPS + avgOther) / 2).toFixed(2))
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
          // Your existing normalization code
          const result = { ...item }

          const numericFields = [
            "no",
            "ts_2_pada_ps_yang_diakreditasi_3",
            "ts_1_pada_ps_yang_diakreditasi_3",
            "ts_pada_ps_yang_diakreditasi_3",
            "ts_2_pada_ps_lain_di_pt_4",
            "ts_1_pada_ps_lain_di_pt_4",
            "ts_pada_ps_lain_di_pt_4",
          ]

          const textFields = [
            "nama_dosen_2",
            "ts_2_nomor_sk_penugasan_pembimbing",
            "ts_1_nomor_sk_penugasan_pembimbing",
            "ts_nomor_sk_penugasan_pembimbing",
          ]

          textFields.forEach((field) => {
            result[field] = PluginUtils.normalizeTextField(result[field])
          })

          numericFields.forEach((field) => {
            result[field] = PluginUtils.parseNumber(result[field], 0)
          })

          return result
        })

    return this.recalculateData(normalizedData)
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      // Daftar field wajib isi
      if (!item.nama_dosen_2) {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }
      if (!item.ts_2_nomor_sk_penugasan_pembimbing) {
        errors.push(`Row ${index + 1}: Nomor SK TS-2 harus diisi`)
      }
      if (!item.ts_1_nomor_sk_penugasan_pembimbing) {
        errors.push(`Row ${index + 1}: Nomor SK TS-1 harus diisi`)
      }
      if (!item.ts_nomor_sk_penugasan_pembimbing) {
        errors.push(`Row ${index + 1}: Nomor SK TS harus diisi`)
      }

      // Helper untuk cek jumlah mahasiswa dibimbing
      const validateJumlahMahasiswa = (rataRata, ts2, ts1, ts) => {
        const tolerance = 0.0001
        const total =
          parseFloat(ts2 || 0) + parseFloat(ts1 || 0) + parseFloat(ts || 0)
        const avg = total / 3
        return Math.abs(parseFloat(rataRata || 0) - avg) <= tolerance
      }

      // Validasi PS yang diakreditasi
      if (
        !validateJumlahMahasiswa(
          item.rata_rata_pada_ps_yang_diakreditasi_3,
          item.ts_2_pada_ps_yang_diakreditasi_3,
          item.ts_1_pada_ps_yang_diakreditasi_3,
          item.ts_pada_ps_yang_diakreditasi_3
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
          item.rata_rata_pada_ps_lain_di_pt_4,
          item.ts_2_pada_ps_lain_di_pt_4,
          item.ts_1_pada_ps_lain_di_pt_4,
          item.ts_pada_ps_lain_di_pt_4
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
