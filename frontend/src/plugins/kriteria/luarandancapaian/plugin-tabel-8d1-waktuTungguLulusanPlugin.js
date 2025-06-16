import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

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
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()
    const years = ["TS-4", "TS-3", "TS-2"]

    return years.map((year, index) => ({
      key: `default-${index + 1}-${now}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      selected: true,
      tahun_lulus: year,
      jumlah_lulusan_yang_terlacak: 0,
      wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
      wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
      wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
    }))
  }

  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    if (!existingData || existingData.length === 0) {
      return defaultData
    }

    const existingYears = existingData.map((row) => row.tahun_lulus)
    const requiredYears = ["TS-4", "TS-3", "TS-2"]

    const missingYears = requiredYears.filter(
      (year) => !existingYears.includes(year)
    )

    if (missingYears.length === 0) {
      // All required years exist, return existing data with updated row numbers
      return existingData.map((row, index) => ({
        ...row,
        no: index + 1,
      }))
    }

    // Add missing years
    const missingDefaults = defaultData.filter((row) =>
      missingYears.includes(row.tahun_lulus)
    )

    // Combine existing data with missing defaults
    const combined = [...existingData, ...missingDefaults]

    // Update row numbers
    return combined.map((row, index) => ({
      ...row,
      no: index + 1,
    }))
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
        jumlah_lulusan: "",
        jumlah_lulusan_yang_terlacak: 0,
        wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
        wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
        wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
      }

      // Extract tahun_lulus value - check first or second column for TS-n format
      const firstCol = String(row[0] || "").trim()
      const secondCol = String(row[1] || "").trim()
      if (/^TS-\d+$/i.test(firstCol)) {
        item.tahun_lulus = firstCol
      } else if (/^TS-\d+$/i.test(secondCol)) {
        item.tahun_lulus = secondCol
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
    console.log("Calculating waktu tunggu score with data:", data)

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
          PJ: "0%",
          Prmin: "0%",
        },
      }
    }

    // Calculate NL and NJ directly from table data
    let NL = 0 // Total lulusan dalam 3 tahun (TS-4, TS-3, TS-2) dari kolom jumlah_lulusan
    let NJ = 0 // Total lulusan yang terlacak dalam 3 tahun
    let totalWeightedTime = 0

    data.forEach((item) => {
      // NL dari kolom jumlah_lulusan
      const jumlahLulusan = PluginUtils.parseNumber(item.jumlah_lulusan, 0)
      const terlacak = PluginUtils.parseNumber(
        item.jumlah_lulusan_yang_terlacak,
        0
      )
      const wt1 = PluginUtils.parseNumber(
        item.wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan,
        0
      )
      const wt2 = PluginUtils.parseNumber(
        item.wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan,
        0
      )
      const wt3 = PluginUtils.parseNumber(
        item.wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan,
        0
      )

      // Add to totals
      NL += jumlahLulusan // Total lulusan dari kolom jumlah_lulusan
      NJ += terlacak // Total yang terlacak

      // Calculate weighted time for this year
      // Assumptions: WT1 = 2 months, WT2 = 4.5 months, WT3 = 7 months
      totalWeightedTime += wt1 * 2 + wt2 * 4.5 + wt3 * 7
    })

    // Calculate PJ (Persentase lulusan yang terlacak)
    const PJ = NL > 0 ? PluginUtils.roundToDecimal((NJ / NL) * 100, 2) : 0

    // Calculate Prmin (Persentase responden minimum)
    let Prmin
    if (NL >= 300) {
      Prmin = 30
    } else {
      Prmin = PluginUtils.roundToDecimal(50 - (NL / 300) * 20, 2)
    }

    // Calculate average waiting time (WT) in months
    const WT =
      NJ > 0 ? PluginUtils.roundToDecimal(totalWeightedTime / NJ, 2) : 0

    // Scoring based on average waiting time according to the matrix
    let originalScore = 0
    if (WT < 3) {
      originalScore = 4
    } else if (WT >= 3 && WT <= 6) {
      originalScore = (24 - 4 * WT) / 3
    } else {
      originalScore = 0 // WT > 6 months
    }

    // Round original score with 2 decimal precision
    originalScore = PluginUtils.roundToDecimal(
      Math.max(0, Math.min(4, originalScore)),
      2
    )

    // Apply adjustment if response percentage doesn't meet minimum requirement
    let finalScore = originalScore
    if (PJ < Prmin) {
      finalScore = PluginUtils.roundToDecimal((PJ / Prmin) * originalScore, 2)
    }

    finalScore = PluginUtils.roundToDecimal(
      Math.max(0, Math.min(4, finalScore)),
      2
    )

    console.log("Waktu Tunggu Score Details:")
    console.log("- NL (Total Lulusan 3 tahun):", NL)
    console.log("- NJ (Total Terlacak 3 tahun):", NJ)
    console.log("- PJ (Persentase Terlacak):", PJ + "%")
    console.log("- Prmin:", Prmin + "%")
    console.log("- WT (Rata-rata Waktu Tunggu):", WT, "bulan")
    console.log("- Original Score:", originalScore)
    console.log("- Final Score:", finalScore)

    return {
      scores: [
        {
          butir: 65,
          nilai: finalScore,
        },
      ],
      scoreDetail: {
        NL,
        NJ,
        PJ: PJ + "%",
        Prmin: Prmin + "%",
      },
    }
  }

  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        // Filter out any invalid rows
        if (!item.tahun_lulus) return true
        const normalized = String(item.tahun_lulus).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => {
        const result = {
          ...item,
          id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
          key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
          no: index + 1,
        }

        result.tahun_lulus = PluginUtils.normalizeTextField(result.tahun_lulus)

        const numericFields = [
          "jumlah_lulusan", // Tambahkan field ini
          "jumlah_lulusan_yang_terlacak",
          "wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
          "wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
          "wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
        ]

        numericFields.forEach((field) => {
          result[field] = PluginUtils.parseNumber(result[field], 0, false, 0) // Integer values
        })

        return result
      })
  }

  prepareDataForSaving(data, config = {}) {
    return data
      .filter((item) => {
        if (!item.tahun_lulus) return true
        const normalized = String(item.tahun_lulus).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => {
        const { id, key, _editing, _selected, ...cleanRow } = item
        return {
          ...cleanRow,
          no: index + 1,
          selected: true,
        }
      })
  }

  validateData(data) {
    const errors = []
    const requiredYears = ["TS-4", "TS-3", "TS-2"]

    // Check if all required years are present
    const existingYears = data.map((item) =>
      String(item.tahun_lulus || "")
        .trim()
        .toUpperCase()
    )

    requiredYears.forEach((year) => {
      if (!existingYears.includes(year)) {
        errors.push(`Tahun lulus "${year}" wajib diisi`)
      }
    })

    data.forEach((item, index) => {
      if (!item.tahun_lulus) {
        errors.push(`Baris ${index + 1}: Tahun Lulus harus diisi`)
      } else if (!requiredYears.includes(item.tahun_lulus)) {
        errors.push(
          `Baris ${index + 1}: Tahun lulus harus TS-4, TS-3, atau TS-2`
        )
      }

      const tracked = PluginUtils.parseNumber(
        item.jumlah_lulusan_yang_terlacak,
        0
      )
      const wt1 = PluginUtils.parseNumber(
        item.wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan,
        0
      )
      const wt2 = PluginUtils.parseNumber(
        item.wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan,
        0
      )
      const wt3 = PluginUtils.parseNumber(
        item.wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan,
        0
      )

      const totalWait = wt1 + wt2 + wt3

      if (totalWait > tracked) {
        errors.push(
          `Baris ${
            index + 1
          }: Jumlah total waktu tunggu (${totalWait}) tidak boleh melebihi jumlah lulusan terlacak (${tracked})`
        )
      }

      if (tracked < 0 || wt1 < 0 || wt2 < 0 || wt3 < 0) {
        errors.push(`Baris ${index + 1}: Nilai tidak boleh negatif`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Add method to handle field value processing
  processFieldValue(field, value, sectionCode) {
    // For tahun_lulus, ensure it's from valid options
    if (field === "tahun_lulus") {
      const validYears = ["TS-4", "TS-3", "TS-2"]
      const normalizedValue = PluginUtils.normalizeTextField(value)

      // If empty, return first option as default
      if (!normalizedValue) {
        return validYears[0]
      }

      // Check if value is valid
      const upperValue = normalizedValue.toUpperCase()
      const match = validYears.find((year) => year === upperValue)

      return match || normalizedValue
    }

    // For all numeric fields, parse as integers (no decimals for count data)
    const numericFields = [
      "jumlah_lulusan", // Tambahkan field ini
      "jumlah_lulusan_yang_terlacak",
      "wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
      "wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
      "wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
    ]

    if (numericFields.includes(field)) {
      return PluginUtils.parseNumber(value, 0, false, 0) // Integer values
    }

    return value
  }
}

export const waktuTungguLulusanPlugin = new WaktuTungguLulusanPlugin()

export default waktuTungguLulusanPlugin
