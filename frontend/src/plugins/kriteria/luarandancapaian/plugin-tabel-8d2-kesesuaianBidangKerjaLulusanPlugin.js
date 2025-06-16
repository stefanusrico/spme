import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class KesesuaianBidangKerjaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8d2",
      name: "Kesesuaian Bidang Kerja Plugin",
      description: "Plugin for employment field conformity data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKesesuaianBidangKerjaSection: true,
    }
  }

  // Override to indicate this plugin has default data
  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const years = ["TS-4", "TS-3", "TS-2"]

    return years.map((year) => ({
      key: `default-${year}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      tahun_lulus: year,
      jumlah_lulusan: 0,
      jumlah_lulusan_yang_terlacak: 0,
      jumlah_bekerja_sesuai_bidang: 0,
      tingkat_rendah: 0,
      tingkat_sedang: 0,
      tingkat_tinggi: 0,
      selected: true,
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
      return existingData
    }

    // Add missing years
    const missingDefaults = defaultData.filter((row) =>
      missingYears.includes(row.tahun_lulus)
    )

    // Combine and sort
    const combined = [...existingData, ...missingDefaults]

    const yearOrder = { "TS-4": 0, "TS-3": 1, "TS-2": 2 }
    combined.sort((a, b) => {
      const orderA = yearOrder[a.tahun_lulus] ?? 999
      const orderB = yearOrder[b.tahun_lulus] ?? 999
      return orderA - orderB
    })

    return combined
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
        jumlah_lulusan_yang_terlacak: 0,
        jumlah_bekerja_sesuai_bidang: 0,
        tingkat_rendah: 0,
        tingkat_sedang: 0,
        tingkat_tinggi: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (["tahun_lulus"].includes(fieldName)) {
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
        scores: [{ butir: 66, nilai: 0 }],
        scoreDetail: { NL: 0, NJ: 0, PJ: 0, PBS: 0, Prmin: 0 },
      }
    }

    // Filter valid data (exclude totals/summaries)
    const validData = this.getValidData(data)

    let totalLulusan = 0
    let totalTerlacak = 0
    let totalTingkatTinggi = 0

    validData.forEach((row) => {
      totalLulusan += Number(row.jumlah_lulusan || 0)
      totalTerlacak += Number(row.jumlah_lulusan_yang_terlacak || 0)
      totalTingkatTinggi += Number(row.tingkat_tinggi || 0)
    })

    // PJ = Persentase lulusan yang terlacak
    const PJ = totalLulusan > 0 ? (totalTerlacak / totalLulusan) * 100 : 0

    // PBS = Kesesuaian bidang kerja lulusan
    const PBS =
      totalTerlacak > 0 ? (totalTingkatTinggi / totalTerlacak) * 100 : 0

    // Skor awal
    let skor = 0
    if (PBS >= 60) {
      skor = 4
    } else {
      skor = (20 * (PBS / 100)) / 3
    }

    // Hitung Prmin
    let Prmin = 0
    if (totalLulusan >= 300) {
      Prmin = 30
    } else {
      Prmin = 50 - (totalLulusan / 300) * 20
    }

    // Skor akhir dengan penyesuaian
    let skorAkhir = skor
    if (PJ < Prmin) {
      skorAkhir = (PJ / Prmin) * skor
    }

    // Pastikan skor tidak melebihi 4
    skorAkhir = Math.min(4, skorAkhir)

    return {
      scores: [{ butir: 66, nilai: PluginUtils.roundToDecimal(skorAkhir, 2) }],
      scoreDetail: {
        NL: totalLulusan,
        NJ: totalTerlacak,
        PJ: PluginUtils.roundToDecimal(PJ, 2),
        PBS: PluginUtils.roundToDecimal(PBS, 2),
        Prmin: PluginUtils.roundToDecimal(Prmin, 2),
        skor: PluginUtils.roundToDecimal(skorAkhir, 2),
        formula:
          "Skor = PBS >= 60 ? 4 : (20 × PBS/100) / 3, dengan penyesuaian PJ",
        calculationBreakdown: {
          "Total Lulusan (NL)": totalLulusan,
          "Total Terlacak (NJ)": totalTerlacak,
          "Persentase Terlacak (PJ)": `${PluginUtils.roundToDecimal(PJ, 2)}%`,
          "Persentase Bidang Sesuai (PBS)": `${PluginUtils.roundToDecimal(
            PBS,
            2
          )}%`,
          Prmin: PluginUtils.roundToDecimal(Prmin, 2),
          "Skor Awal":
            PBS >= 60
              ? "4 (karena PBS ≥ 60%)"
              : `(20 × ${PluginUtils.roundToDecimal(
                  PBS,
                  2
                )}/100) / 3 = ${PluginUtils.roundToDecimal(skor, 2)}`,
          "Skor Akhir":
            PJ < Prmin
              ? `(${PluginUtils.roundToDecimal(
                  PJ,
                  2
                )} / ${PluginUtils.roundToDecimal(
                  Prmin,
                  2
                )}) × ${PluginUtils.roundToDecimal(
                  skor,
                  2
                )} = ${PluginUtils.roundToDecimal(skorAkhir, 2)}`
              : PluginUtils.roundToDecimal(skorAkhir, 2),
        },
      },
    }
  }

  getValidData(data) {
    return data.filter((item) => {
      if (!item.tahun_lulus) return false
      const normalized = String(item.tahun_lulus).toLowerCase().trim()
      return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
        normalized
      )
    })
  }

  normalizeData(data) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        if (!item.tahun_lulus) return true
        const normalized = String(item.tahun_lulus).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item) => {
        const result = { ...item }

        const textFields = ["tahun_lulus"]
        const numericFields = [
          "jumlah_lulusan",
          "jumlah_lulusan_yang_terlacak",
          "jumlah_bekerja_sesuai_bidang",
          "tingkat_rendah",
          "tingkat_sedang",
          "tingkat_tinggi",
        ]

        // Add id and key if missing
        result.id =
          result.id || `row-${Math.random().toString(36).substring(2, 9)}`
        result.key =
          result.key || `row-${Math.random().toString(36).substring(2, 9)}`

        textFields.forEach((field) => {
          result[field] = PluginUtils.normalizeTextField(result[field])
        })

        numericFields.forEach((field) => {
          result[field] = PluginUtils.parseNumber(result[field], 0)
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

    data.forEach((item, idx) => {
      if (!item.tahun_lulus) {
        errors.push(`Row ${idx + 1}: Tahun Lulus harus diisi`)
      }

      const lulusan = parseFloat(item.jumlah_lulusan || 0)
      const terlacak = parseFloat(item.jumlah_lulusan_yang_terlacak || 0)
      const tingkatRendah = parseFloat(item.tingkat_rendah || 0)
      const tingkatSedang = parseFloat(item.tingkat_sedang || 0)
      const tingkatTinggi = parseFloat(item.tingkat_tinggi || 0)
      const totalTingkat = tingkatRendah + tingkatSedang + tingkatTinggi

      if (terlacak > lulusan) {
        errors.push(
          `Row ${
            idx + 1
          }: Jumlah lulusan yang terlacak tidak boleh melebihi jumlah lulusan`
        )
      }

      if (totalTingkat > terlacak) {
        errors.push(
          `Row ${
            idx + 1
          }: Total tingkat kesesuaian tidak boleh melebihi jumlah lulusan yang terlacak`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const kesesuaianBidangKerjaPlugin = new KesesuaianBidangKerjaPlugin()

export default kesesuaianBidangKerjaPlugin
