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
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()
    const years = ["TS-2", "TS-1", "TS"]

    return years.map((year, index) => ({
      key: `default-${index + 1}-${now}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      selected: true,
      tahun_lulus: year,
      jumlah_lulusan: 0,
      min_indeks_prestasi_kumulatif: 0,
      rata_rata_indeks_prestasi_kumulatif: 0,
      maks_indeks_prestasi_kumulatif: 0,
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
    const requiredYears = ["TS-2", "TS-1", "TS"]

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
        jumlah_lulusan: 0,
        min_indeks_prestasi_kumulatif: 0,
        rata_rata_indeks_prestasi_kumulatif: 0,
        maks_indeks_prestasi_kumulatif: 0,
      }

      // Extract tahun_lulus value - check first or second column for TS-n format
      const firstCol = String(row[0] || "").trim()
      const secondCol = String(row[1] || "").trim()
      if (/^TS(-\d+)?$/i.test(firstCol)) {
        item.tahun_lulus = firstCol
      } else if (/^TS(-\d+)?$/i.test(secondCol)) {
        item.tahun_lulus = secondCol
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "tahun_lulus") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else if (fieldName.includes("indeks_prestasi_kumulatif")) {
          // Handle IPK values (usually between 0-4.00) with 2 decimal places
          const num = PluginUtils.parseNumber(value, 0, true, 2)
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
          jumlahLulusan: 0,
          bobotIPK: 0,
        },
      }
    }

    // Calculate weighted average IPK across all years
    let bobotIPK = 0
    let jumlahLulusan = 0

    data.forEach((item) => {
      const graduates = parseFloat(item.jumlah_lulusan || 0)
      const avgIPK = parseFloat(item.rata_rata_indeks_prestasi_kumulatif || 0)

      // Only include valid data (graduates > 0 and IPK in valid range)
      if (graduates > 0 && avgIPK >= 2.0 && avgIPK <= 4.0) {
        bobotIPK += avgIPK * graduates
        jumlahLulusan += graduates
      }
    })

    // Calculate RIPK (Rata-rata IPK lulusan dalam 3 tahun terakhir)
    const RIPK = jumlahLulusan > 0 ? bobotIPK / jumlahLulusan : 0

    // Scoring formula based on RIPK
    let nilai = 0
    if (RIPK >= 3.25) {
      nilai = 4
    } else if (RIPK >= 2.0 && RIPK < 3.25) {
      nilai = (8 * RIPK - 6) / 5
    } else {
      nilai = 0 // Tidak ada skor kurang dari 2 yang berarti jika RIPK < 2.0 maka skor = 0
    }

    // Use PluginUtils.roundToDecimal for consistency
    const finalRIPK = PluginUtils.roundToDecimal(RIPK, 2)
    const finalScore = PluginUtils.roundToDecimal(nilai, 2)

    console.log("IPK Calculation Details:")
    console.log("- Total Graduates:", jumlahLulusan)
    console.log(
      "- Total Weighted IPK:",
      PluginUtils.roundToDecimal(bobotIPK, 2)
    )
    console.log("- RIPK:", finalRIPK)
    console.log("- Score:", finalScore)

    return {
      scores: [
        {
          butir: 58,
          nilai: Math.max(0, Math.min(4, finalScore)),
        },
      ],
      scoreDetail: {
        RIPK: finalRIPK,
        jumlahLulusan,
        bobotIPK: PluginUtils.roundToDecimal(bobotIPK, 2),
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
          const value = PluginUtils.parseNumber(result[field], 0, true, 2)
          result[field] = Math.min(4, Math.max(0, value))
        })

        numericFields.forEach((field) => {
          result[field] = PluginUtils.parseNumber(result[field], 0, false, 0)
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
    const requiredYears = ["TS-2", "TS-1", "TS"]

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
        errors.push(`Baris ${index + 1}: Tahun lulus harus TS-2, TS-1, atau TS`)
      }

      const min = parseFloat(item.min_indeks_prestasi_kumulatif || 0)
      const avg = parseFloat(item.rata_rata_indeks_prestasi_kumulatif || 0)
      const max = parseFloat(item.maks_indeks_prestasi_kumulatif || 0)

      if (min > avg) {
        errors.push(
          `Baris ${
            index + 1
          }: IPK Minimum tidak boleh lebih besar dari IPK Rata-rata`
        )
      }

      if (avg > max) {
        errors.push(
          `Baris ${
            index + 1
          }: IPK Rata-rata tidak boleh lebih besar dari IPK Maksimum`
        )
      }

      if (min > 4 || avg > 4 || max > 4) {
        errors.push(`Baris ${index + 1}: Nilai IPK tidak boleh melebihi 4.00`)
      }

      if (min < 0 || avg < 0 || max < 0) {
        errors.push(`Baris ${index + 1}: Nilai IPK tidak boleh negatif`)
      }

      const graduates = parseFloat(item.jumlah_lulusan || 0)
      if (graduates < 0) {
        errors.push(`Baris ${index + 1}: Jumlah lulusan tidak boleh negatif`)
      }

      if (graduates <= 0 && (min > 0 || avg > 0 || max > 0)) {
        errors.push(
          `Baris ${index + 1}: Jumlah Lulusan harus diisi jika ada data IPK`
        )
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
      const validYears = ["TS-2", "TS-1", "TS"]
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

    // For IPK fields with 2 decimal places and range 0-4
    if (
      [
        "min_indeks_prestasi_kumulatif",
        "rata_rata_indeks_prestasi_kumulatif",
        "maks_indeks_prestasi_kumulatif",
      ].includes(field)
    ) {
      const parsed = PluginUtils.parseNumber(value, 0, true, 2)
      return Math.min(4, Math.max(0, parsed))
    }

    // For jumlah_lulusan (integer)
    if (field === "jumlah_lulusan") {
      return PluginUtils.parseNumber(value, 0, false, 0)
    }

    return value
  }
}

export const ipkLulusanPlugin = new IpkLulusanPlugin()

export default ipkLulusanPlugin
