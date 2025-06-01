import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class LulusanTerlacakPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8e1",
      name: "Lulusan Terlacak Plugin",
      description: "Plugin for processing tracked graduate employment data",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLulusanTerlacakSection: true,
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
      jumlah_lulusan: 0,
      jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
      jumlah_lulusan_yang_terlacak: 0,
      tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
      tingkat_nasional_berwirausaha_berizin: 0,
      tingkat_multinasional_internasional: 0,
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
        jumlah_lulusan: 0,
        jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
        jumlah_lulusan_yang_terlacak: 0,
        tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
        tingkat_nasional_berwirausaha_berizin: 0,
        tingkat_multinasional_internasional: 0,
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
    console.log("Calculating lulusan terlacak score with data:", data)

    // Hanya mempertimbangkan data 3 tahun terakhir (TS-4 s.d. TS-2)
    const validData = data.filter((item) => {
      const tahun = String(item.tahun_lulus).trim().toUpperCase()
      return tahun === "TS-4" || tahun === "TS-3" || tahun === "TS-2"
    })

    let NL = 0 // Jumlah lulusan total
    let NJ = 0 // Jumlah lulusan yang terlacak
    let NI = 0 // Jumlah lulusan di tingkat internasional
    let NN = 0 // Jumlah lulusan di tingkat nasional
    let NW = 0 // Jumlah lulusan di tingkat wilayah/lokal
    let PR = 0 // Jumlah pengguna lulusan yang memberi tanggapan

    validData.forEach((item) => {
      NL += PluginUtils.parseNumber(item.jumlah_lulusan, 0)
      NJ += PluginUtils.parseNumber(item.jumlah_lulusan_yang_terlacak, 0)
      NI += PluginUtils.parseNumber(item.tingkat_multinasional_internasional, 0)
      NN += PluginUtils.parseNumber(
        item.tingkat_nasional_berwirausaha_berizin,
        0
      )
      NW += PluginUtils.parseNumber(
        item.tingkat_lokal_wilayah_berwirausaha_tidak_berizin,
        0
      )
      PR += PluginUtils.parseNumber(
        item.jumlah_pengguna_lulusan_yang_memberi_tanggapan,
        0
      )
    })

    // Gunakan roundToDecimal untuk semua perhitungan persentase
    const PJ = NJ > 0 ? PluginUtils.roundToDecimal((NJ / NL) * 100, 2) : 0
    const RI = NL > 0 ? PluginUtils.roundToDecimal((NI / NL) * 100, 2) : 0
    const RN = NL > 0 ? PluginUtils.roundToDecimal((NN / NL) * 100, 2) : 0
    const RW = NL > 0 ? PluginUtils.roundToDecimal((NW / NL) * 100, 2) : 0
    const persentaseResponden =
      NL > 0 ? PluginUtils.roundToDecimal((PR / NL) * 100, 2) : 0

    // Faktor untuk perhitungan skor
    const a = 5 // 5%
    const b = 20 // 20%
    const c = 90 // 90%

    // Menentukan Persentase minimum responden (Prmin)
    let Prmin
    if (NL >= 300) {
      Prmin = 30
    } else {
      Prmin = PluginUtils.roundToDecimal(50 - (NL / 300) * 20, 2)
    }

    // Menghitung skor berdasarkan matriks penilaian
    let skor = 0
    if (RI >= a && RN >= b) {
      skor = 4
    } else if (
      (0 < RI && RI < a) ||
      (0 < RN && RN < b) ||
      (0 < RW && RW <= c)
    ) {
      const A = PluginUtils.roundToDecimal(RI / a, 4) // Gunakan 4 digit untuk perhitungan intermediate
      const B = PluginUtils.roundToDecimal(RN / b, 4)
      const C = PluginUtils.roundToDecimal(RW / c, 4)

      skor =
        4 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
      skor = PluginUtils.roundToDecimal(skor, 2)
    } else {
      skor = 0
    }

    // Pastikan skor maksimum 4
    skor = Math.min(skor, 4)

    // Penyesuaian skor jika persentase responden tidak memenuhi ketentuan
    let skorAkhir = skor
    if (persentaseResponden < Prmin) {
      skorAkhir = PluginUtils.roundToDecimal((PJ / Prmin) * skor, 2)
    }

    skorAkhir = PluginUtils.roundToDecimal(Math.min(skorAkhir, 4), 2)

    console.log("Score Detail:", {
      NL,
      NJ,
      NI,
      NN,
      NW,
      PR,
      RI,
      RN,
      RW,
      PJ,
      Prmin,
      persentaseResponden,
      skor,
      skorAkhir,
    })

    return {
      scores: [
        {
          butir: 67,
          nilai: skorAkhir,
        },
      ],
      scoreDetail: {
        NL,
        NJ,
        NI,
        NN,
        NW,
        PR,
        RI: RI + "%",
        RN: RN + "%",
        RW: RW + "%",
        PJ: PJ + "%",
        Prmin: Prmin + "%",
        persentaseResponden: persentaseResponden + "%",
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
          "jumlah_lulusan",
          "jumlah_pengguna_lulusan_yang_memberi_tanggapan",
          "jumlah_lulusan_yang_terlacak",
          "tingkat_lokal_wilayah_berwirausaha_tidak_berizin",
          "tingkat_nasional_berwirausaha_berizin",
          "tingkat_multinasional_internasional",
        ]

        numericFields.forEach((field) => {
          result[field] = PluginUtils.parseNumber(result[field], 0, false, 0) // Integer values, no decimals
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
    const validYears = ["TS-4", "TS-3", "TS-2"]

    data.forEach((item, index) => {
      if (!item.tahun_lulus) {
        errors.push(`Row ${index + 1}: Tahun lulus harus diisi`)
      } else if (!validYears.includes(item.tahun_lulus)) {
        errors.push(`Row ${index + 1}: Tahun lulus harus TS-4, TS-3, atau TS-2`)
      }

      const jumlahLulusan = PluginUtils.parseNumber(item.jumlah_lulusan, 0)
      const jumlahTerlacak = PluginUtils.parseNumber(
        item.jumlah_lulusan_yang_terlacak,
        0
      )
      const respondenCount = PluginUtils.parseNumber(
        item.jumlah_pengguna_lulusan_yang_memberi_tanggapan,
        0
      )

      if (jumlahLulusan < 0) {
        errors.push(`Row ${index + 1}: Jumlah lulusan tidak boleh negatif`)
      }

      if (jumlahTerlacak > jumlahLulusan) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah lulusan yang terlacak tidak boleh lebih besar dari jumlah lulusan`
        )
      }

      if (respondenCount > jumlahLulusan) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah responden tidak boleh lebih besar dari jumlah lulusan`
        )
      }

      const totalPenempatan =
        PluginUtils.parseNumber(
          item.tingkat_lokal_wilayah_berwirausaha_tidak_berizin,
          0
        ) +
        PluginUtils.parseNumber(item.tingkat_nasional_berwirausaha_berizin, 0) +
        PluginUtils.parseNumber(item.tingkat_multinasional_internasional, 0)

      if (totalPenempatan > jumlahTerlacak) {
        errors.push(
          `Row ${
            index + 1
          }: Total lulusan berdasarkan tempat kerja tidak boleh lebih besar dari jumlah lulusan yang terlacak`
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
      const validYears = ["TS-4", "TS-3", "TS-2"]
      const normalizedValue = PluginUtils.normalizeTextField(value)

      // If empty, return first option as default
      if (!normalizedValue) {
        return validYears[0]
      }

      // Check if value is valid
      if (validYears.includes(normalizedValue)) {
        return normalizedValue
      }

      // Try to find closest match
      const upperValue = normalizedValue.toUpperCase()
      const match = validYears.find((year) => year.toUpperCase() === upperValue)

      return match || validYears[0]
    }

    // For all numeric fields, parse as integers (no decimals)
    const numericFields = [
      "jumlah_lulusan",
      "jumlah_pengguna_lulusan_yang_memberi_tanggapan",
      "jumlah_lulusan_yang_terlacak",
      "tingkat_lokal_wilayah_berwirausaha_tidak_berizin",
      "tingkat_nasional_berwirausaha_berizin",
      "tingkat_multinasional_internasional",
    ]

    if (numericFields.includes(field)) {
      return PluginUtils.parseNumber(value, 0, false, 0) // No decimals for count data
    }

    return value
  }
}

export const lulusanTerlacakPlugin = new LulusanTerlacakPlugin()

export default lulusanTerlacakPlugin
