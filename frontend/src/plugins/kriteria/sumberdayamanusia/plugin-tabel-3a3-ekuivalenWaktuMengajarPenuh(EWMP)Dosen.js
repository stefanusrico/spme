import { processExcelDataBase } from "../../../utils/tableUtils"
import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class EkuivalenWaktuMengajarPenuhDosenPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a3",
      name: "Ekuivalen Waktu Mengajar Penuh (EWMP) Dosen",
      description:
        "Plugin for processing Lecturer Full Teaching Time Equivalent",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isEkuivalenWaktuMengajarPenuhDosen: true,
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
        nama_dosen_dt: "",
        dtps: "",
        ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan: 0,
        ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan: 0,
        ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan: 0,
        penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks: 0,
        pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks: 0,
        tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks: 0,
        jumlah_per_tahun_sks: 0,
        jumlah_per_semester_sks: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "no" || fieldName === "nama_dosen_dt") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else if (
          [
            "ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan",
            "ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan",
            "ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan",
            "penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
            "pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
            "tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
            "jumlah_per_tahun_sks",
            "jumlah_per_semester_sks",
          ].includes(fieldName)
        ) {
          item[fieldName] = PluginUtils.parseNumber(value, 0)
        } else if (fieldName === "dtps") {
          item[fieldName] = PluginUtils.parseBoolean(value)
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
    let EWMP = 0
    let index = 0
    let totalEWMP = 0

    data.forEach((item) => {
      if (
        item.jumlah_per_semester_sks !== null &&
        item.jumlah_per_semester_sks !== undefined &&
        item.jumlah_per_semester_sks !== ""
      ) {
        index += 1
        totalEWMP += item.jumlah_per_semester_sks
      }
    })

    EWMP = index > 0 ? Math.round((totalEWMP / index) * 100) / 100 : 0

    let score = 0
    if (EWMP === 14) {
      score = 4
    } else if (EWMP >= 12 && EWMP < 14) {
      score = ((3 * EWMP) - 34) / 2
    } else if (EWMP > 14 && EWMP <= 16) {
      score = (50 - (3 * EWMP)) / 2
    }

    score = Math.round(score * 100) / 100

    console.log("Hasil EWMP :", EWMP)
    console.log("Score : ", score)

    return {
      scores: [
        {
          butir: 22,
          nilai: PluginUtils.roundToDecimal(score),
        },
      ],
      scoreDetail: {
        EWMP: PluginUtils.roundToDecimal(EWMP),
      },
    }
  }

  getCalculatedFields() {
    return {
      jumlah_per_tahun_sks: (row) => {
        // Check if DTPS is marked
        if (row.dtps !== "V") return 0

        const total =
          (parseFloat(
            row.ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan
          ) || 0) +
          (parseFloat(
            row.ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan
          ) || 0) +
          (parseFloat(
            row.ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan
          ) || 0) +
          (parseFloat(
            row.penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks
          ) || 0) +
          (parseFloat(
            row.pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks
          ) || 0) +
          (parseFloat(
            row.tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks
          ) || 0)

        return parseFloat(total.toFixed(2))
      },

      // SKS per semester (year total divided by 2)
      jumlah_per_semester_sks: (row) => {
        // Check if DTPS is marked
        if (row.dtps !== "V") return 0

        const yearTotal = parseFloat(row.jumlah_per_tahun_sks) || 0
        return parseFloat((yearTotal / 2).toFixed(2))
      },
    }
  }

  /**
   * Recalculate row with calculated fields
   */
  recalculateRow(row) {
    const calculatedFields = this.getCalculatedFields()
    const updatedRow = { ...row }

    // Calculate jumlah_per_tahun_sks first
    if (calculatedFields.jumlah_per_tahun_sks) {
      updatedRow.jumlah_per_tahun_sks =
        calculatedFields.jumlah_per_tahun_sks(updatedRow)
    }

    // Then calculate jumlah_per_semester_sks which depends on jumlah_per_tahun_sks
    if (calculatedFields.jumlah_per_semester_sks) {
      updatedRow.jumlah_per_semester_sks =
        calculatedFields.jumlah_per_semester_sks(updatedRow)
    }

    return updatedRow
  }

  /**
   * Normalize data and ensure calculated fields are up to date
   */
  normalizeData(data) {
    // First apply base normalization
    const normalizedData = data.map((item) => {
      const result = { ...item }

      const textFields = ["nama_dosen_dt", "dtps"]

      const numericFields = [
        "ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan",
        "ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan",
        "ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan",
        "penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
        "pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
        "tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      numericFields.forEach((field) => {
        // Use parseFloat instead of PluginUtils.parseNumber to preserve decimals
        const rawValue = result[field]
        result[field] =
          rawValue === null || rawValue === undefined || rawValue === ""
            ? 0
            : parseFloat(rawValue)
      })

      return result
    })

    return normalizedData.map((row) => this.recalculateRow(row))
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const requiredFields = [
        {
          field: item.nama_dosen_dt,
          message: `Row ${index + 1}: Nama dosen harus diisi`,
        },
        { field: item.dtps, message: `Row ${index + 1}: DTPS harus diisi` },
      ]

      requiredFields.forEach(({ field, message }) => {
        if (!field) errors.push(message)
      })

      // Validasi konsistensi
      if (item.dtps === "V" && item.jumlah_per_tahun_sks > 0) {
        const tolerance = 0.0001
        if (
          Math.abs(
            item.jumlah_per_semester_sks * 2 - item.jumlah_per_tahun_sks
          ) > tolerance
        ) {
          errors.push(
            `Row ${
              index + 1
            }: Jumlah per tahun SKS dan jumlah per semester SKS tidak konsisten`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Add this method to the EkuivalenWaktuMengajarPenuhDosenPlugin class
  processFieldValue(field, value, sectionCode) {
    // Process numeric fields to preserve decimal places
    const numericFields = [
      "ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan",
      "ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan",
      "ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan",
      "penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
      "pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
      "tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
    ]

    if (numericFields.includes(field)) {
      // Convert to float instead of int, preserving decimal places
      return value === "" ? 0 : parseFloat(value)
    }

    // Handle DTPS field specially
    if (field === "dtps") {
      return value || ""
    }

    // Default behavior for other fields
    return value
  }
}

// Export
export const ekuivalenWaktuMengajarPenuhDosenPlugin =
  new EkuivalenWaktuMengajarPenuhDosenPlugin()
export default ekuivalenWaktuMengajarPenuhDosenPlugin
