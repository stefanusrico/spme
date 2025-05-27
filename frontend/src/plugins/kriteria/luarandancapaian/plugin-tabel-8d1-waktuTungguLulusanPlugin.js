import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class WaktuTungguLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8d1",
      name: "Waktu Tunggu Lulusan Plugin",
      description: "Plugin for graduate waiting time data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isWaktuTungguLulusanSection: true,
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
        tahun_lulus: "",
        jumlah_lulusan_yang_terlacak: 0,
        wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
        wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
        wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "tahun_lulus") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else {
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
    if (!data || data.length === 0) {
      return {
        scores: [
          {
            butir: 65,
            nilai: 0,
          },
        ],
        scoreDetail: {
          NL: 0,
          NJ: 0,
          PJ: 0,
        },
      }
    }

    let totalLulusan = 0
    let totalTerlacak = 0

    data.forEach((row) => {
      const lulusan = Number(row.jumlah_lulusan || 0)
      const terlacak = Number(row.jumlah_lulusan_yang_terlacak || 0)

      totalLulusan += lulusan
      totalTerlacak += terlacak
    })

    const percentage =
      totalLulusan > 0 ? (totalTerlacak / totalLulusan) * 100 : 0

    let nilai
    if (percentage >= 50) {
      nilai = 4
    } else if (percentage >= 40) {
      nilai = 3
    } else if (percentage >= 30) {
      nilai = 2
    } else if (percentage >= 20) {
      nilai = 1
    } else {
      nilai = 0
    }

    console.log("NL:", totalLulusan)
    console.log("NJ:", totalTerlacak)
    console.log("PJ:", percentage)
    console.log("Score:", nilai)

    return {
      scores: [
        {
          butir: 65,
          nilai,
        },
      ],
      scoreDetail: {
        NL: totalLulusan,
        NJ: totalTerlacak,
        PJ: Math.round(percentage * 100) / 100,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = ["tahun_lulus"]
      const numericFields = [
        "jumlah_lulusan_yang_terlacak",
        "wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
        "wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
        "wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
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
      if (!item.tahun_lulus) {
        errors.push(`Row ${index + 1}: Tahun Lulus harus diisi`)
      }

      const tracked = parseFloat(item.jumlah_lulusan_yang_terlacak || 0)
      const totalWait =
        parseFloat(
          item.wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan ||
            0
        ) +
        parseFloat(
          item.wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan ||
            0
        ) +
        parseFloat(
          item.wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan ||
            0
        )

      if (totalWait > tracked) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah total waktu tunggu tidak boleh melebihi jumlah lulusan terlacak`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const waktuTungguLulusanPlugin = new WaktuTungguLulusanPlugin()

export default waktuTungguLulusanPlugin
