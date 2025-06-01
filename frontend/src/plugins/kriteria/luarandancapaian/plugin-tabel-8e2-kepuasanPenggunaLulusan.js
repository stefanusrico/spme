import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class KepuasanPenggunaLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8e2",
      name: "Tingkat Kepuasan Pengguna Lulusan Plugin",
      description:
        "Plugin for processing graduate user satisfaction level data",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKepuasanPenggunaSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()
    const jenisKemampuanList = this.getJenisKemampuanOptions()

    return jenisKemampuanList.map((jenis, index) => ({
      key: `default-${index + 1}-${now}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      selected: true,
      jenis_kemampuan: jenis,
      tingkat_sangat_baik: 0,
      tingkat_baik: 0,
      tingkat_cukup: 0,
      tingkat_kurang: 0,
      rencana_tindak_lanjut_oleh_upps_ps: "",
    }))
  }

  getJenisKemampuanOptions() {
    return [
      "Etika",
      "Keahlian pada bidang ilmu (kompetensi utama)",
      "Kemampuan berbahasa asing",
      "Penggunaan teknologi informasi",
      "Kemampuan berkomunikasi",
      "Kerjasama tim",
      "Pengembangan diri",
    ]
  }

  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    if (!existingData || existingData.length === 0) {
      return defaultData
    }

    const existingJenisKemampuan = existingData.map(
      (row) => row.jenis_kemampuan
    )
    const requiredJenisKemampuan = this.getJenisKemampuanOptions()

    const missingJenisKemampuan = requiredJenisKemampuan.filter(
      (jenis) =>
        !existingJenisKemampuan.some(
          (existing) =>
            existing && existing.toLowerCase().includes(jenis.toLowerCase())
        )
    )

    if (missingJenisKemampuan.length === 0) {
      // All required jenis kemampuan exist, return existing data with updated row numbers
      return existingData.map((row, index) => ({
        ...row,
        no: index + 1,
      }))
    }

    // Add missing jenis kemampuan
    const missingDefaults = defaultData.filter((row) =>
      missingJenisKemampuan.includes(row.jenis_kemampuan)
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
        jenis_kemampuan: "",
        tingkat_sangat_baik: 0,
        tingkat_baik: 0,
        tingkat_cukup: 0,
        tingkat_kurang: 0,
        rencana_tindak_lanjut_oleh_upps_ps: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName === "jenis_kemampuan" ||
          fieldName === "rencana_tindak_lanjut_oleh_upps_ps"
        ) {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else {
          // For percentage fields, parse as number with 2 decimal places
          item[fieldName] = PluginUtils.parseNumber(value, 0, true, 2)
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
    console.log("Calculating kepuasan pengguna score with data:", data)

    // Fetch data from 8e1 plugin
    const scoreDetailsResponse = await fetchScoreDetails(
      "8e1",
      additionalData.projectId
    )
    console.log("Fetched score details from 8e1:", scoreDetailsResponse)

    let NL = 0
    let NJ = 0

    if (scoreDetailsResponse) {
      NL = PluginUtils.parseNumber(scoreDetailsResponse.NL, 0)
      NJ = PluginUtils.parseNumber(scoreDetailsResponse.PR, 0) // PR from 8e1 is the number of respondents
    } else {
      NL = PluginUtils.parseNumber(additionalData.jumlahLulusan, 0)
      NJ = PluginUtils.parseNumber(additionalData.jumlahResponden, 0)
    }

    // Calculate PJ using PluginUtils.roundToDecimal with 2 digits
    const PJ = NL > 0 ? PluginUtils.roundToDecimal((NJ / NL) * 100, 2) : 0

    // Calculate Prmin using PluginUtils.roundToDecimal with 2 digits
    let Prmin
    if (NL >= 300) {
      Prmin = 30
    } else {
      Prmin = PluginUtils.roundToDecimal(50 - (NL / 300) * 20, 2)
    }

    console.log(`Using values: NL=${NL}, NJ=${NJ}, PJ=${PJ}%, Prmin=${Prmin}%`)

    // Calculate TKi for each capability type according to the correct formula
    const tkiValues = data.map((item, index) => {
      const a = PluginUtils.parseNumber(item.tingkat_sangat_baik, 0) // Persentase Sangat Baik
      const b = PluginUtils.parseNumber(item.tingkat_baik, 0) // Persentase Baik
      const c = PluginUtils.parseNumber(item.tingkat_cukup, 0) // Persentase Cukup
      const d = PluginUtils.parseNumber(item.tingkat_kurang, 0) // Persentase Kurang

      // TKi = (4 × a) + (3 × b) + (2 × c) + (1 × d)
      // Ini menghasilkan skor tertimbang dalam bentuk persentase
      const tki = PluginUtils.roundToDecimal(4 * a + 3 * b + 2 * c + 1 * d, 2)

      console.log(
        `TKi ${index + 1} (${
          item.jenis_kemampuan
        }): 4×${a} + 3×${b} + 2×${c} + 1×${d} = ${tki}`
      )

      return tki
    })

    console.log("TKI values (percentage weighted scores):", tkiValues)

    // Calculate sum of all TKi values
    const totalTKi = tkiValues.reduce((sum, tki) => sum + tki, 0)

    // Calculate average TKi and convert to 4-point scale by dividing by (7 × 100)
    // 7 = number of aspects, 100 = to convert percentage to scale
    const avgTKi =
      tkiValues.length > 0
        ? PluginUtils.roundToDecimal(totalTKi / (tkiValues.length * 100), 2)
        : 0

    console.log(
      `Total TKi: ${totalTKi}, Average TKi (on 4-point scale): ${avgTKi}`
    )

    // Apply adjustment if response percentage doesn't meet minimum requirement
    let finalScore = avgTKi
    if (PJ < Prmin) {
      finalScore = PluginUtils.roundToDecimal((PJ / Prmin) * avgTKi, 2)
      console.log(
        `Adjusted score due to low response rate: (${PJ}/${Prmin}) × ${avgTKi} = ${finalScore}`
      )
    }

    // Ensure score is between 0 and 4
    finalScore = PluginUtils.roundToDecimal(
      Math.max(0, Math.min(4, finalScore)),
      2
    )

    console.log("Score Detail:", {
      NL,
      NJ,
      PJ,
      Prmin,
      totalTKi,
      avgTKi,
      finalScore,
    })

    return {
      scores: [
        {
          butir: 68,
          nilai: finalScore,
        },
      ],
      scoreDetail: {
        NL,
        NJ,
        PJ: PJ + "%",
        Prmin: Prmin + "%",
        totalTKi: totalTKi,
        avgTKi: avgTKi,
      },
    }
  }

  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        // Filter out any invalid rows
        if (!item.jenis_kemampuan) return true
        const normalized = String(item.jenis_kemampuan).toLowerCase().trim()
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

        result.jenis_kemampuan = PluginUtils.normalizeTextField(
          result.jenis_kemampuan
        )
        result.rencana_tindak_lanjut_oleh_upps_ps =
          PluginUtils.normalizeTextField(
            result.rencana_tindak_lanjut_oleh_upps_ps
          )

        // Parse percentage fields with 2 decimal places
        const percentageFields = [
          "tingkat_sangat_baik",
          "tingkat_baik",
          "tingkat_cukup",
          "tingkat_kurang",
        ]

        percentageFields.forEach((field) => {
          result[field] = PluginUtils.parseNumber(result[field], 0, true, 2)
        })

        return result
      })
  }

  prepareDataForSaving(data, config = {}) {
    return data
      .filter((item) => {
        if (!item.jenis_kemampuan) return true
        const normalized = String(item.jenis_kemampuan).toLowerCase().trim()
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
    const requiredCapabilities = this.getJenisKemampuanOptions()

    // Check if all required capabilities are present
    const existingCapabilities = data.map((item) =>
      String(item.jenis_kemampuan || "")
        .toLowerCase()
        .trim()
    )

    requiredCapabilities.forEach((capability) => {
      const found = existingCapabilities.some(
        (existing) =>
          existing.includes(capability.toLowerCase()) ||
          capability.toLowerCase().includes(existing)
      )

      if (!found) {
        errors.push(`Jenis kemampuan "${capability}" wajib diisi`)
      }
    })

    // Validate each row
    data.forEach((item, index) => {
      if (!item.jenis_kemampuan || String(item.jenis_kemampuan).trim() === "") {
        errors.push(`Baris ${index + 1}: Jenis kemampuan harus diisi`)
      }

      const sangat_baik = PluginUtils.parseNumber(item.tingkat_sangat_baik, 0)
      const baik = PluginUtils.parseNumber(item.tingkat_baik, 0)
      const cukup = PluginUtils.parseNumber(item.tingkat_cukup, 0)
      const kurang = PluginUtils.parseNumber(item.tingkat_kurang, 0)

      // Validate percentage values are non-negative
      if (sangat_baik < 0 || baik < 0 || cukup < 0 || kurang < 0) {
        errors.push(`Baris ${index + 1}: Nilai persentase tidak boleh negatif`)
      }

      // Validate total percentage equals 100%
      const totalPercentage = PluginUtils.roundToDecimal(
        sangat_baik + baik + cukup + kurang,
        2
      )
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(
          `Baris ${
            index + 1
          }: Total persentase (${totalPercentage}%) harus sama dengan 100%`
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
    // For jenis_kemampuan, ensure it's from valid options
    if (field === "jenis_kemampuan") {
      const validOptions = this.getJenisKemampuanOptions()
      const normalizedValue = PluginUtils.normalizeTextField(value)

      // If empty, return first option as default
      if (!normalizedValue) {
        return validOptions[0]
      }

      // Check if value is valid or similar
      const match = validOptions.find(
        (option) =>
          option.toLowerCase().includes(normalizedValue.toLowerCase()) ||
          normalizedValue.toLowerCase().includes(option.toLowerCase())
      )

      return match || normalizedValue
    }

    // For percentage fields with 2 decimal places
    if (
      [
        "tingkat_sangat_baik",
        "tingkat_baik",
        "tingkat_cukup",
        "tingkat_kurang",
      ].includes(field)
    ) {
      return PluginUtils.parseNumber(value, 0, true, 2)
    }

    // For text fields
    if (field === "rencana_tindak_lanjut_oleh_upps_ps") {
      return PluginUtils.normalizeTextField(value)
    }

    return value
  }
}

export const kepuasanPenggunaLulusanPlugin = new KepuasanPenggunaLulusanPlugin()

export default kepuasanPenggunaLulusanPlugin
