import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class IpkLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8a",
      name: "IPK Lulusan Plugin",
      description: "Plugin for graduate GPA (IPK) data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isIpkLulusanSection: true,
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
        jumlah_lulusan: 0,
        min_indeks_prestasi_kumulatif: 0,
        rata_rata_indeks_prestasi_kumulatif: 0,
        maks_indeks_prestasi_kumulatif: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "tahun_lulus") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else if (fieldName.includes("indeks_prestasi_kumulatif")) {
          // Handle IPK values (usually between 0-4.00)
          const num = PluginUtils.parseNumber(value, 0)
          item[fieldName] = Math.min(4, Math.max(0, num))
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
            butir: 58,
            nilai: 0,
          },
        ],
        scoreDetail: {
          RIPK: 0,
        },
      }
    }

    // Calculate weighted average IPK across all years
    let totalWeightedIPK = 0
    let totalGraduates = 0

    data.forEach((item) => {
      const graduates = parseFloat(item.jumlah_lulusan || 0)
      const avgIPK = parseFloat(item.rata_rata_indeks_prestasi_kumulatif || 0)

      if (graduates > 0 && avgIPK >= 2.0 && avgIPK <= 4.0) {
        totalWeightedIPK += avgIPK * graduates
        totalGraduates += graduates
      }
    })

    const RIPK = totalGraduates > 0 ? totalWeightedIPK / totalGraduates : 0

    // Scoring formula based on RIPK
    let nilai = 0
    if (RIPK >= 3.25) {
      nilai = 4
    } else if (RIPK >= 2.0 && RIPK < 3.25) {
      nilai = (8 * RIPK - 6) / 5
    } else {
      nilai = 0
    }

    console.log("RIPK:", RIPK)
    console.log("Score:", nilai)

    return {
      scores: [
        {
          butir: 58,
          nilai: Math.max(0, Math.min(4, parseFloat(nilai.toFixed(2)))),
        },
      ],
      scoreDetail: {
        RIPK: Math.round(RIPK * 100) / 100,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = ["tahun_lulus"]
      const ipkFields = [
        "min_indeks_prestasi_kumulatif",
        "rata_rata_indeks_prestasi_kumulatif",
        "maks_indeks_prestasi_kumulatif",
      ]
      const numericFields = ["jumlah_lulusan"]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      ipkFields.forEach((field) => {
        const value = PluginUtils.parseNumber(result[field], 0)
        result[field] = Math.min(4, Math.max(0, value))
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

      const min = parseFloat(item.min_indeks_prestasi_kumulatif || 0)
      const avg = parseFloat(item.rata_rata_indeks_prestasi_kumulatif || 0)
      const max = parseFloat(item.maks_indeks_prestasi_kumulatif || 0)

      if (min > avg) {
        errors.push(
          `Row ${
            index + 1
          }: IPK Minimum tidak boleh lebih besar dari IPK Rata-rata`
        )
      }

      if (avg > max) {
        errors.push(
          `Row ${
            index + 1
          }: IPK Rata-rata tidak boleh lebih besar dari IPK Maksimum`
        )
      }

      if (min > 4 || avg > 4 || max > 4) {
        errors.push(`Row ${index + 1}: Nilai IPK tidak boleh melebihi 4.00`)
      }

      const graduates = parseFloat(item.jumlah_lulusan || 0)
      if (graduates <= 0 && (min > 0 || avg > 0 || max > 0)) {
        errors.push(
          `Row ${index + 1}: Jumlah Lulusan harus diisi jika ada data IPK`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const ipkLulusanPlugin = new IpkLulusanPlugin()

export default ipkLulusanPlugin
