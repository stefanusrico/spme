import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class MasaStudiLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8c",
      name: "Masa Studi Lulusan Plugin",
      description:
        "Plugin untuk mendata masa studi lulusan dari tabel 8.c LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isMasaStudiLulusanSection: true,
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
        key: `excel-masa-studi-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        tahun_masuk: "",
        jumlah_mhs_ts6: 0,
        jumlah_mhs_ts5: 0,
        jumlah_mhs_ts4: 0,
        jumlah_mhs_ts3: 0,
        jumlah_mhs_ts2: 0,
        jumlah_mhs_ts1: 0,
        jumlah_mhs_ts: 0,
        jumlah_lulusan_sd_ts: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (fieldName === "tahun_masuk") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else if (
          fieldName.startsWith("jumlah_mhs_ts") ||
          fieldName === "jumlah_lulusan_sd_ts"
        ) {
          item[fieldName] = PluginUtils.parseNumber(value, 0)
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
    // TODO: Implement actual scoring logic
    return {
      scores: [
        {
          butir: 0,
          nilai: 0,
        },
      ],
      scoreDetail: {},
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = ["tahun_masuk"]
      const numericFields = [
        "jumlah_mhs_ts6",
        "jumlah_mhs_ts5",
        "jumlah_mhs_ts4",
        "jumlah_mhs_ts3",
        "jumlah_mhs_ts2",
        "jumlah_mhs_ts1",
        "jumlah_mhs_ts",
        "jumlah_lulusan_sd_ts",
      ]

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
      if (!item.tahun_masuk) {
        errors.push(`Baris ${index + 1}: Tahun Masuk harus diisi`)
      }

      const tahunMasuk = String(item.tahun_masuk).trim()
      if (tahunMasuk.length !== 4 || isNaN(parseInt(tahunMasuk))) {
        errors.push(`Baris ${index + 1}: Format Tahun Masuk tidak valid (YYYY)`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const masaStudiLulusanPlugin = new MasaStudiLulusanPlugin()

export default masaStudiLulusanPlugin
