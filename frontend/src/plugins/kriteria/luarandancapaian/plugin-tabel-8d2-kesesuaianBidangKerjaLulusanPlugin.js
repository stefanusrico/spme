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

    let totalLulusan = 0
    let totalTerlacak = 0
    let totalTingkatTinggi = 0

    data.forEach((row) => {
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

    console.log("NL:", totalLulusan)
    console.log("NJ:", totalTerlacak)
    console.log("PJ:", PJ)
    console.log("PBS:", PBS)
    console.log("Prmin:", Prmin)
    console.log("Score:", skorAkhir)

    return {
      scores: [{ butir: 66, nilai: Math.round(skorAkhir) }],
      scoreDetail: {
        NL: totalLulusan,
        NJ: totalTerlacak,
        PJ: Math.round(PJ),
        PBS: Math.round(PBS),
        Prmin: Math.round(Prmin),
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
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
