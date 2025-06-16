import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class KepuasanMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5d",
      name: "Kepuasan Mahasiswa Plugin",
      description: "Plugin for student satisfaction data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKepuasanMahasiswaSection: true,
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
      const getValue = (fieldName, columnIndex, isNumeric = false) => {
        const value =
          detectedIndices && detectedIndices[fieldName] !== undefined
            ? row[detectedIndices[fieldName]]
            : row[columnIndex]

        if (isNumeric) {
          return PluginUtils.parseNumber(value, 0)
        }
        return PluginUtils.normalizeTextField(value)
      }

      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        aspek_yang_diukur: getValue("aspek_yang_diukur", 1),
        tingkat_sangat_baik: getValue("tingkat_sangat_baik", 2, true),
        tingkat_baik: getValue("tingkat_baik", 3, true),
        tingkat_cukup: getValue("tingkat_cukup", 4, true),
        tingkat_kurang: getValue("tingkat_kurang", 5, true),
        rencana_tindak_lanjut_oleh_upps_ps: getValue(
          "rencana_tindak_lanjut_oleh_upps_ps",
          6
        ),
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

    if (!allRows || allRows.length === 0) {
      console.warn("Kepuasan Mahasiswa: Tidak ada data untuk dihitung skornya.")
      return {
        scores: [{ butir: 52, nilai: 0 }],
        scoreDetail: {
          TKMi: [],
          TKM: 0,
        },
      }
    }

    const TKMiValues = []
    let totalNilaiTKM_i = 0
    const JUMLAH_ASPEK_SEHARUSNYA = 5

    allRows.forEach((item) => {
      const sangatBaik = Number(item.tingkat_sangat_baik || 0)
      const baik = Number(item.tingkat_baik || 0)
      const cukup = Number(item.tingkat_cukup || 0)
      const kurang = Number(item.tingkat_kurang || 0)

      const totalRespondenAspek = sangatBaik + baik + cukup + kurang

      let ai = 0,
        bi = 0,
        ci = 0,
        di = 0
      let TKMi = 0

      if (totalRespondenAspek > 0) {
        ai = sangatBaik / totalRespondenAspek
        bi = baik / totalRespondenAspek
        ci = cukup / totalRespondenAspek
        di = kurang / totalRespondenAspek
        TKMi = parseFloat((4 * ai + 3 * bi + 2 * ci + 1 * di).toFixed(3))
        totalNilaiTKM_i += TKMi
        TKMiValues.push(TKMi)
      } else {
        TKMiValues.push(0)
      }
    })

    const TKM_avg_skala_1_4 = totalNilaiTKM_i / JUMLAH_ASPEK_SEHARUSNYA
    const TKM_persen_final =
      TKM_avg_skala_1_4 > 0 ? ((TKM_avg_skala_1_4 - 1) / 3) * 100 : 0
    const skorAkhir =
      TKM_persen_final >= 75
        ? 4
        : TKM_persen_final >= 25
        ? 8 * (TKM_persen_final / 100) - 2
        : 0

    console.log("TKM:", TKM_persen_final)
    console.log("Score:", skorAkhir)

    return {
      scores: [
        {
          butir: 52,
          nilai: Math.max(0, Math.min(4, parseFloat(skorAkhir.toFixed(2)))),
        },
      ],
      scoreDetail: {
        TKMi: TKMiValues,
        TKM: parseFloat(TKM_persen_final.toFixed(2)),
        details: [
          {
            no: 52,
            sub: "A",
            nilai: parseFloat(skorAkhir),
          },
        ],
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "aspek_yang_diukur",
        "rencana_tindak_lanjut_oleh_upps_ps",
      ]
      const numericFields = [
        "tingkat_sangat_baik",
        "tingkat_baik",
        "tingkat_cukup",
        "tingkat_kurang",
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

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      if (
        !item.aspek_yang_diukur ||
        String(item.aspek_yang_diukur).trim() === ""
      ) {
        errors.push(`Baris ${index + 1}: 'aspek_yang_diukur' harus diisi.`)
      }

      const satisfactionLevels = [
        "tingkat_sangat_baik",
        "tingkat_baik",
        "tingkat_cukup",
        "tingkat_kurang",
      ]

      satisfactionLevels.forEach((level) => {
        const val = item[level]
        if (typeof val !== "number" || val < 0) {
          errors.push(
            `Baris ${
              index + 1
            }: '${level}' harus berupa angka non-negatif. Ditemukan: ${val}`
          )
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const kepuasanMahasiswaPlugin = new KepuasanMahasiswaPlugin()

export default kepuasanMahasiswaPlugin
