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

    const calculatedData = processedData.map((row) => this.recalculateRow(row))

    return {
      allRows: calculatedData,
      shouldReplaceExisting: true,
    }
  }

  // FIX: Add calculated fields configuration
  getCalculatedFields() {
    return {
      jumlah: (row) => {
        const ts2 = parseFloat(row.ts_2_jumlah_judul_pkm) || 0
        const ts1 = parseFloat(row.ts_1_jumlah_judul_pkm) || 0
        const ts = parseFloat(row.ts_jumlah_judul_pkm) || 0

        return ts2 + ts1 + ts
      },
    }
  }

  // FIX: Add method to recalculate row with auto-calculated fields
  recalculateRow(row) {
    const calculatedFields = this.getCalculatedFields()
    const updatedRow = { ...row }

    // Calculate jumlah automatically
    if (calculatedFields.jumlah) {
      updatedRow.jumlah = calculatedFields.jumlah(updatedRow)
    }

    return updatedRow
  }

  normalizeData(data) {
    const normalizedData = data.map((item) => {
      const result = { ...item }

      const textFields = ["sumber_pembiayaan"]
      const numericFields = [
        "ts_2_jumlah_judul_pkm",
        "ts_1_jumlah_judul_pkm",
        "ts_jumlah_judul_pkm",
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

    // Then recalculate auto-calculated fields
    return normalizedData.map((row) => this.recalculateRow(row))
  }

  async calculateScore(data, config, additionalData = {}) {
    let NL = 0,
      NN = 0,
      NI = 0

    // Mendapatkan nilai NI, NN, dan NL
    data.forEach((item) => {
      // FIX: Use auto-calculated jumlah field
      const jumlah = item.jumlah || 0
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

    if (NDTPS === 0) {
      console.warn("NDTPS is 0, cannot calculate ratios")
      return {
        scores: [{ butir: 27, nilai: 0 }],
        scoreDetail: {
          NI,
          NL,
          NN,
          NDTPS: 0,
          RI: 0,
          RL: 0,
          RN: 0,
          A: 0,
          B: 0,
          C: 0,
        },
      }
    }

    // Calculate initial ratios
    let RI = Math.round((NI / 3 / NDTPS) * 10000) / 10000
    let RN = Math.round((NN / 3 / NDTPS) * 10000) / 10000
    let RL = Math.round((NL / 3 / NDTPS) * 10000) / 10000

    // Constants
    const a = 0.05
    const b = 0.3
    const c = 1

    // FIX: Apply capping rules before calculating A, B, C
    // Jika RI ≥ a dan RN < b, maka RI = a
    if (RI >= a && RN < b) {
      RI = a
    }
    // Jika RI < a dan RN ≥ b, maka RN = b
    if (RI < a && RN >= b) {
      RN = b
    }
    // Jika RL ≥ c , maka RL = c
    if (RL >= c) {
      RL = c
    }

    // Calculate A, B, C after applying capping
    let A = Math.round((RI / a) * 10000) / 10000
    let B = Math.round((RN / b) * 10000) / 10000
    let C = Math.round((RL / c) * 10000) / 10000

    // FIX: Apply correct scoring formula
    let score = 0

    // Jika RI > a dan RN > b maka Skor = 4
    if (RI > a && RN > b) {
      score = 4
    }
    // Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RL ≤ c
    // maka Skor = 3.75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
    else if (
      (RI > 0 && RI <= a) ||
      (RN > 0 && RN <= b) ||
      (RL > 0 && RL <= c)
    ) {
      score =
        3.75 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
    }
    // Jika semua 0, maka score = 0 (default)

    // Ensure score doesn't exceed 4
    score = score > 4 ? 4 : score
    score = Math.round(score * 100) / 100

    console.log("=== Pengabdian Kepada Masyarakat DTPS Calculation Debug ===")
    console.log("Raw values:", { NI, NN, NL, NDTPS })
    console.log("Initial ratios:", {
      RI_initial: NI / 3 / NDTPS,
      RN_initial: NN / 3 / NDTPS,
      RL_initial: NL / 3 / NDTPS,
    })
    console.log("After capping:", { RI, RN, RL })
    console.log("Factors:", { A, B, C })
    console.log("Constants:", { a, b, c })
    console.log("Score conditions:")
    console.log(`  RI > a (${RI} > ${a}): ${RI > a}`)
    console.log(`  RN > b (${RN} > ${b}): ${RN > b}`)
    console.log(`  Both conditions met: ${RI > a && RN > b}`)
    console.log("Final score:", score)

    return {
      scores: [{ butir: 27, nilai: score }],
      scoreDetail: {
        NI,
        NL,
        NN,
        NDTPS,
        RI: Math.round(RI * 10000) / 10000,
        RL: Math.round(RL * 10000) / 10000,
        RN: Math.round(RN * 10000) / 10000,
        A: Math.round(A * 10000) / 10000,
        B: Math.round(B * 10000) / 10000,
        C: Math.round(C * 10000) / 10000,
        a,
        b,
        c,
      },
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

  processFieldValue(field, value, sectionCode) {
    const numericFields = [
      "ts_2_jumlah_judul_pkm",
      "ts_1_jumlah_judul_pkm",
      "ts_jumlah_judul_pkm",
    ]

    if (numericFields.includes(field)) {
      return value === "" ? 0 : parseFloat(value) || 0
    }

    if (field === "jumlah") {
      return value === "" ? 0 : parseFloat(value) || 0
    }

    return value
  }
}

export const pengabdianKepadaMasyarakatDtpsPlugin =
  new PengabdianKepadaMasyarakatDtpsPlugin()
export default pengabdianKepadaMasyarakatDtpsPlugin
