import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class PagelaranPameranPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8f2",
      name: "Pagelaran Pameran Plugin",
      description:
        "Plugin untuk mendata pagelaran/pameran/presentasi mahasiswa",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPagelaranPameranSection: true,
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
      return {
        key: `excel-pagelaran-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        jenis_publikasi: PluginUtils.normalizeTextField(row[1]),
        ts_2_jumlah_judul: PluginUtils.parseNumber(row[2], 0),
        ts_1_jumlah_judul: PluginUtils.parseNumber(row[3], 0),
        ts_jumlah_judul: PluginUtils.parseNumber(row[4], 0),
        jumlah: PluginUtils.parseNumber(row[5], 0),
      }
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    const allRows =
      data && data.allRows ? data.allRows : Array.isArray(data) ? data : []
    const NM = additionalData.jumlahMahasiswaTS || 50

    let NC1 = 0,
      NC2 = 0,
      NC3 = 0 // Wilayah, Nasional, Internasional

    allRows.forEach((item) => {
      const jenis = String(item.jenis_publikasi).toLowerCase()
      if (jenis.includes("wilayah")) NC1 += item.jumlah || 0
      else if (jenis.includes("nasional")) NC2 += item.jumlah || 0
      else if (jenis.includes("internasional")) NC3 += item.jumlah || 0
    })

    const RL = (NC1 / NM) * 100
    const RN = (NC2 / NM) * 100
    const RI = (NC3 / NM) * 100

    const a = 1 // 1%
    const b = 10 // 10%
    const c = 50 // 50%

    let skor = 0

    if (RI > a && RN > b) {
      skor = 4
    } else {
      const RI_calc = RI >= a && RN < b ? a : RI
      const RN_calc = RI < a && RN >= b ? b : RN
      const RL_calc = RL >= c ? c : RL

      const A_calc = RI_calc / a
      const B_calc = RN_calc / b
      const C_calc = RL_calc / c

      skor =
        3.75 *
        (A_calc +
          B_calc +
          C_calc / 2 -
          A_calc * B_calc -
          (A_calc * C_calc) / 2 -
          (B_calc * C_calc) / 2 +
          (A_calc * B_calc * C_calc) / 2)

      skor = Math.max(0, skor)
    }

    const skorFinal = parseFloat(Math.max(0, Math.min(4, skor)).toFixed(2))

    console.log("NC1:", NC1, "NC2:", NC2, "NC3:", NC3, "NM:", NM)
    console.log("RL:", RL, "RN:", RN, "RI:", RI)
    console.log("Score:", skorFinal)

    return {
      scores: [{ butir: 69, nilai: skorFinal }],
      scoreDetail: {
        RL: parseFloat(RL.toFixed(2)),
        RN: parseFloat(RN.toFixed(2)),
        RI: parseFloat(RI.toFixed(2)),
        NM,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      result.jenis_publikasi = PluginUtils.normalizeTextField(
        result.jenis_publikasi
      )

      const numericFields = [
        "ts_2_jumlah_judul",
        "ts_1_jumlah_judul",
        "ts_jumlah_judul",
        "jumlah",
      ]

      numericFields.forEach((field) => {
        result[field] = PluginUtils.parseNumber(result[field], 0)
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.jenis_publikasi || String(item.jenis_publikasi).trim() === "") {
        errors.push(`Baris ${index + 1}: Jenis Publikasi harus diisi.`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const pagelaranPameranPlugin = new PagelaranPameranPlugin()

export default pagelaranPameranPlugin
