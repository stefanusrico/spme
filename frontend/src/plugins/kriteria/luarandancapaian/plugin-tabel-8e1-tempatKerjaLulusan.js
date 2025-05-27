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

  getDefaultData() {
    const now = Date.now()
    return [
      {
        key: `default-lulusan-${now}`,
        no: 1,
        selected: true,
        tahun_lulus: "TS-4",
        jumlah_lulusan: 0,
        jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
        jumlah_lulusan_yang_terlacak: 0,
        tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
        tingkat_nasional_berwirausaha_berizin: 0,
        tingkat_multinasional_internasional: 0,
      },
      {
        key: `default-lulusan-${now + 1}`,
        no: 2,
        selected: true,
        tahun_lulus: "TS-3",
        jumlah_lulusan: 0,
        jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
        jumlah_lulusan_yang_terlacak: 0,
        tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
        tingkat_nasional_berwirausaha_berizin: 0,
        tingkat_multinasional_internasional: 0,
      },
      {
        key: `default-lulusan-${now + 2}`,
        no: 3,
        selected: true,
        tahun_lulus: "TS-2",
        jumlah_lulusan: 0,
        jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
        jumlah_lulusan_yang_terlacak: 0,
        tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
        tingkat_nasional_berwirausaha_berizin: 0,
        tingkat_multinasional_internasional: 0,
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
      NL += item.jumlah_lulusan || 0
      NJ += item.jumlah_lulusan_yang_terlacak || 0
      NI += item.tingkat_multinasional_internasional || 0
      NN += item.tingkat_nasional_berwirausaha_berizin || 0
      NW += item.tingkat_lokal_wilayah_berwirausaha_tidak_berizin || 0
      PR += item.jumlah_pengguna_lulusan_yang_memberi_tanggapan || 0
    })

    const PJ = NJ > 0 ? (NL / NJ) * 100 : 0
    const RI = NL > 0 ? (NI / NL) * 100 : 0
    const RN = NL > 0 ? (NN / NL) * 100 : 0
    const RW = NL > 0 ? (NW / NL) * 100 : 0
    const persentaseResponden = NL > 0 ? (PR / NL) * 100 : 0

    // Faktor untuk perhitungan skor
    const a = 5 // 5%
    const b = 20 // 20%
    const c = 90 // 90%

    // Menentukan Persentase minimum responden (Prmin)
    let Prmin
    if (NL >= 300) {
      Prmin = 30
    } else {
      Prmin = 50 - (NL / 300) * 20
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
      const A = RI / a
      const B = RN / b
      const C = RW / c

      skor =
        4 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
    } else {
      skor = 0
    }

    // Pastikan skor maksimum 4
    skor = Math.min(skor, 4)

    // Penyesuaian skor jika persentase responden tidak memenuhi ketentuan
    let skorAkhir = skor
    if (persentaseResponden < Prmin) {
      skorAkhir = (PJ / Prmin) * skor
    }

    skorAkhir = Math.min(skorAkhir, 4)

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
          nilai: parseFloat(skorAkhir.toFixed(2)),
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
        skor: skor,
        skorAkhir: skorAkhir,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

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
        result[field] = PluginUtils.parseNumber(result[field], 0)
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.tahun_lulus) {
        errors.push(`Row ${index + 1}: Tahun lulus harus diisi`)
      }

      if (item.jumlah_lulusan < 0) {
        errors.push(`Row ${index + 1}: Jumlah lulusan tidak boleh negatif`)
      }

      if (item.jumlah_lulusan_yang_terlacak > item.jumlah_lulusan) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah lulusan yang terlacak tidak boleh lebih besar dari jumlah lulusan`
        )
      }

      const totalPenempatan =
        (item.tingkat_lokal_wilayah_berwirausaha_tidak_berizin || 0) +
        (item.tingkat_nasional_berwirausaha_berizin || 0) +
        (item.tingkat_multinasional_internasional || 0)

      if (totalPenempatan > item.jumlah_lulusan_yang_terlacak) {
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
}

export const lulusanTerlacakPlugin = new LulusanTerlacakPlugin()

export default lulusanTerlacakPlugin
