import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { ExcelUtils } from "../../utils/ExcelUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PengabdianKepadaMasyarakatDtpsPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b3",
      name: "Pengabdian Kepada Masyarakat DTPS",
      description: "Plugin for processing Pengabdian Kepada Masyarakat DTPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPengabdianDtps: true,
    }
  }

  // Override to indicate this plugin has default data
  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    return [
      {
        key: `default-pkm-1-${Date.now()}`,
        no: 1,
        selected: true,
        sumber_pembiayaan: "a) Perguruan tinggi atau mandiri",
        ts_2_jumlah_judul_pkm: 0,
        ts_1_jumlah_judul_pkm: 0,
        ts_jumlah_judul_pkm: 0,
        jumlah: 0,
      },
      {
        key: `default-pkm-2-${Date.now()}`,
        no: 2,
        selected: true,
        sumber_pembiayaan: "b) Lembaga dalam negeri (diluar PT)",
        ts_2_jumlah_judul_pkm: 0,
        ts_1_jumlah_judul_pkm: 0,
        ts_jumlah_judul_pkm: 0,
        jumlah: 0,
      },
      {
        key: `default-pkm-3-${Date.now()}`,
        no: 3,
        selected: true,
        sumber_pembiayaan: "c) Lembaga luar negeri",
        ts_2_jumlah_judul_pkm: 0,
        ts_1_jumlah_judul_pkm: 0,
        ts_jumlah_judul_pkm: 0,
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
        ts_2_jumlah_judul_pkm: 0,
        ts_1_jumlah_judul_pkm: 0,
        ts_jumlah_judul_pkm: 0,
        jumlah: 0,
      }

      // Map fields based on detected indices
      const fieldMapping = {
        sumber_pembiayaan: 1,
        ts_2_jumlah_judul_pkm: 2,
        ts_1_jumlah_judul_pkm: 3,
        ts_jumlah_judul_pkm: 4,
        jumlah: 5,
      }

      Object.entries(fieldMapping).forEach(([fieldName, defaultIndex]) => {
        const colIndex =
          detectedIndices[fieldName] !== undefined
            ? detectedIndices[fieldName]
            : defaultIndex
        if (
          colIndex !== undefined &&
          colIndex >= 0 &&
          row[colIndex] !== undefined
        ) {
          if (fieldName === "sumber_pembiayaan") {
            item[fieldName] = PluginUtils.normalizeTextField(row[colIndex])
          } else {
            item[fieldName] = PluginUtils.parseNumber(row[colIndex], 0)
          }
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
        Number(item.ts_2_jumlah_judul_pkm || 0) +
        Number(item.ts_1_jumlah_judul_pkm || 0) +
        Number(item.ts_jumlah_judul_pkm || 0)

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
        scores: [{ butir: 27, nilai: 0 }],
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

    score = score > 4 ? 4 : score
    score = Math.round(score * 100) / 100

    return {
      scores: [{ butir: 27, nilai: score }],
      scoreDetail: { NI, NL, NN, NDTPS, RI, RL, RN, A, B, C, a, b, c },
    }
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.ts_2_jumlah_judul_pkm && item.ts_2_jumlah_judul_pkm !== 0) {
        errors.push(`Row ${index + 1}: TS-2 Jumlah Judul PkM harus diisi`)
      }
      if (!item.ts_1_jumlah_judul_pkm && item.ts_1_jumlah_judul_pkm !== 0) {
        errors.push(`Row ${index + 1}: TS-1 Jumlah Judul PkM harus diisi`)
      }
      if (!item.ts_jumlah_judul_pkm && item.ts_jumlah_judul_pkm !== 0) {
        errors.push(`Row ${index + 1}: TS Jumlah Judul PkM harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const pengabdianKepadaMasyarakatDtpsPlugin =
  new PengabdianKepadaMasyarakatDtpsPlugin()
export default pengabdianKepadaMasyarakatDtpsPlugin
