import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PrasaranaDanPeralatanUtamaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "4b",
      name: "Prasarana dan Peralatan Utama Plugin",
      description: "Plugin untuk mendata prasarana Utama di Laboratorium UPPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPrasaranaDanPeralatanUtamaSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = PluginUtils.filterDataRows(rawData)

    const isChecked = (val) => {
      const cleaned = typeof val === "string" ? val.trim().toLowerCase() : ""
      const isValid = ["v", "✔", "✓", "check", "ada", "terawat"].includes(
        cleaned
      )
      return isValid ? "V" : ""
    }

    const processedData = filteredData.map((row, index) => {
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        nama_laboratorium: PluginUtils.normalizeTextField(row[1]),
        jumlah_lab: PluginUtils.parseNumber(row[2], 0),
        nama_alat_peraga: PluginUtils.normalizeTextField(row[3]),
        standar_minimal_jumlah_alat: PluginUtils.parseNumber(row[4], 0),
        yang_dimiliki_upps_jumlah_alat: PluginUtils.parseNumber(row[5], 0),
        sendiri_kepemilikan: isChecked(row[6]),
        sewa_kepemilikan: isChecked(row[7]),
        terawat_kondisi: isChecked(row[8]),
        tidak_terawat_kondisi: isChecked(row[9]),
        ada_logbook_diisi_oleh_pengusul_vokasi: isChecked(row[10]),
        tidak_ada_logbook_diisi_oleh_pengusul_vokasi: isChecked(row[11]),
        rata_rata_waktu_penggunaan_jam_minggu_diisi_oleh_pengusul_vokasi:
          PluginUtils.parseNumber(row[12], 0),
      }
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    return {
      scores: [
        {
          butir: 39,
          nilai: 0, // Penilaian manual
        },
      ],
      scoreDetail: {},
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const numericFields = [
        "jumlah_lab",
        "standar_minimal_jumlah_alat",
        "yang_dimiliki_upps_jumlah_alat",
        "rata_rata_waktu_penggunaan_jam_minggu_diisi_oleh_pengusul_vokasi",
      ]

      const textFields = ["nama_laboratorium", "nama_alat_peraga"]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      numericFields.forEach((field) => {
        result[field] = PluginUtils.parseNumber(result[field], 0)
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_laboratorium) {
        errors.push(`Baris ${index + 1}: Nama laboratorium harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const prasaranaDanPeralatanUtamaPlugin =
  new PrasaranaDanPeralatanUtamaPlugin()

export default prasaranaDanPeralatanUtamaPlugin
