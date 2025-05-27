import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { ExcelUtils } from "../../utils/ExcelUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PenelitianDtpsPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b2",
      name: "Penelitian DTPS",
      description: "Plugin for processing DTPS research data",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPenelitianDtps: true,
    }
  }

  // Override to indicate this plugin has default data
  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    return [
      {
        key: `default-penelitian-1-${Date.now()}`,
        no: 1,
        selected: true,
        sumber_pembiayaan: "a) Perguruan tinggi atau mandiri",
        ts_2_jumlah_judul_penelitian: 0,
        ts_1_jumlah_judul_penelitian: 0,
        ts_jumlah_judul_penelitian: 0,
        jumlah: 0,
      },
      {
        key: `default-penelitian-2-${Date.now()}`,
        no: 2,
        selected: true,
        sumber_pembiayaan: "b) Lembaga dalam negeri (diluar PT)",
        ts_2_jumlah_judul_penelitian: 0,
        ts_1_jumlah_judul_penelitian: 0,
        ts_jumlah_judul_penelitian: 0,
        jumlah: 0,
      },
      {
        key: `default-penelitian-3-${Date.now()}`,
        no: 3,
        selected: true,
        sumber_pembiayaan: "c) Lembaga luar negeri",
        ts_2_jumlah_judul_penelitian: 0,
        ts_1_jumlah_judul_penelitian: 0,
        ts_jumlah_judul_penelitian: 0,
        jumlah: 0,
      },
    ]
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
        sumber_pembiayaan: "",
        ts_2_jumlah_judul_penelitian: 0,
        ts_1_jumlah_judul_penelitian: 0,
        ts_jumlah_judul_penelitian: 0,
        jumlah: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "no" || fieldName === "sumber_pembiayaan") {
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
    let NL = 0,
      NN = 0,
      NI = 0

    // Mendapatkan nilai NI, NN, dan NL
    data.forEach((item) => {
      const jumlah =
        (item.ts_2_jumlah_judul_penelitian || 0) +
        (item.ts_1_jumlah_judul_penelitian || 0) +
        (item.ts_jumlah_judul_penelitian || 0)
      const sumber = item.sumber_pembiayaan.toLowerCase()

      if (sumber.includes("mandiri") || sumber.includes("perguruan tinggi")) {
        NL += jumlah
      } else if (sumber.includes("luar negeri")) {
        NI += jumlah
      } else {
        NN += jumlah
      }
    })

    // Mendapatkan nilai NDTPS
    const responseScoreDetail = await fetchScoreDetails(
      "3a1",
      additionalData.projectId
    )
    if (!responseScoreDetail) {
      console.warn('fetchScoreDetails("3a1") did not return any data')
      return {
        scores: [{ butir: 26, nilai: 0 }],
        scoreDetail: {},
      }
    }
    let NDTPS = responseScoreDetail?.NDTPS || 0

    // Mendapatkan nilai RI, RN, dan RL
    let RI = Math.round((NI / 3 / NDTPS) * 100) / 100
    let RN = Math.round((NN / 3 / NDTPS) * 100) / 100
    let RL = Math.round((NL / 3 / NDTPS) * 100) / 100

    // Dengan Faktor:
    const a = 0.05
    const b = 0.3
    const c = 1

    // Mendapatkan nilai A, B, dan C
    let A = Math.round((RI / a) * 100) / 100
    let B = Math.round((RN / b) * 100) / 100
    let C = Math.round((RL / c) * 100) / 100

    // Menghitung score
    let score = 0
    if (RI >= a && RN >= b) {
      score = 4
    } else if (
      (RI > 0 && RI < a) ||
      (RN > 0 && RN < b) ||
      (RL > 0 && RL <= c)
    ) {
      score =
        4 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
    }

    score = Math.round(score * 100) / 100

    return {
      scores: [{ butir: 26, nilai: score }],
      scoreDetail: { NI, NL, NN, NDTPS, RI, RL, RN, A, B, C, a, b, c },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = ["sumber_pembiayaan"]
      const numericFields = [
        "ts_2_jumlah_judul_penelitian",
        "ts_1_jumlah_judul_penelitian",
        "ts_jumlah_judul_penelitian",
        "jumlah",
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
      if (
        !item.sumber_pembiayaan ||
        String(item.sumber_pembiayaan).trim() === ""
      ) {
        errors.push(`Row ${index + 1}: Sumber pembiayaan harus diisi`)
      }

      const tahunFields = [
        { field: item.ts_2_jumlah_judul_penelitian, label: "TS-2" },
        { field: item.ts_1_jumlah_judul_penelitian, label: "TS-1" },
        { field: item.ts_jumlah_judul_penelitian, label: "TS" },
      ]

      tahunFields.forEach(({ field, label }) => {
        const num = parseFloat(field)
        if (isNaN(num) || num < 0) {
          errors.push(
            `Row ${index + 1}: Nilai tahun ${label} harus berupa angka >= 0`
          )
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Export
export const penelitianDtpsPlugin = new PenelitianDtpsPlugin()
export default penelitianDtpsPlugin
