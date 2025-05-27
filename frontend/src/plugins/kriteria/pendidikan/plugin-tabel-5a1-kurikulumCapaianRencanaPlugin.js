import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class KurikulumCapaianRencanaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a1",
      name: "Kurikulum Capaian Rencana Plugin",
      description:
        "Plugin untuk mentrackt capaian pembelajaran dari tabel 5.a.1 LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isCapaianPembelajaranSection: true,
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
        semester: "",
        kode_mata_kuliah: "",
        nama_mata_kuliah: "",
        mata_kuliah_kompetensi: "",
        kuliah_responsi_tutorial_bobot_kredit_sks: 0,
        seminar_bobot_kredit_sks: 0,
        praktikum_praktik_praktik_lapangan_bobot_kredit_sks: 0,
        konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi: 0,
        sikap_capaian_pembelajaran: "",
        pengetahuan_capaian_pembelajaran: "",
        keterampilan_umum_capaian_pembelajaran: "",
        keterampilan_khusus_capaian_pembelajaran: "",
        dokumen_rencana_pembelajaran: "",
        unit_penyeleng_gara: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (
          [
            "semester",
            "kode_mata_kuliah",
            "nama_mata_kuliah",
            "mata_kuliah_kompetensi",
            "sikap_capaian_pembelajaran",
            "pengetahuan_capaian_pembelajaran",
            "keterampilan_umum_capaian_pembelajaran",
            "keterampilan_khusus_capaian_pembelajaran",
            "dokumen_rencana_pembelajaran",
            "unit_penyeleng_gara",
          ].includes(fieldName)
        ) {
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
        scores: [
          {
            butir: 43,
            nilai: 0,
          },
        ],
        scoreDetail: {
          JP: 0,
          JB: 0,
          PJP: 0,
        },
      }
    }

    let JP = 0 // Praktikum/praktek
    let JB = 0 // Total

    data.forEach((item) => {
      const konversi = parseFloat(
        item.konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi || 0
      )
      const kuliah = parseFloat(
        item.kuliah_responsi_tutorial_bobot_kredit_sks || 0
      )
      const seminar = parseFloat(item.seminar_bobot_kredit_sks || 0)
      const praktikum = parseFloat(
        item.praktikum_praktik_praktik_lapangan_bobot_kredit_sks || 0
      )

      const totalBobot = kuliah + seminar + praktikum

      JB += totalBobot * konversi
      JP += praktikum * konversi
    })

    const PJP = JB > 0 ? (JP / JB) * 100 : 0
    const nilai = PJP >= 50 ? 4 : Math.round(8 * PJP) / 100

    console.log("JP:", JP)
    console.log("JB:", JB)
    console.log("PJP:", PJP)
    console.log("Score:", nilai)

    return {
      scores: [
        {
          butir: 43,
          nilai: PluginUtils.roundToDecimal(nilai),
        },
      ],
      scoreDetail: {
        JP: Math.round(JP * 100) / 100,
        JB: Math.round(JB * 100) / 100,
        PJP: Math.round(PJP * 100) / 100,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const numericFields = [
        "kuliah_responsi_tutorial_bobot_kredit_sks",
        "seminar_bobot_kredit_sks",
        "praktikum_praktik_praktik_lapangan_bobot_kredit_sks",
        "konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi",
      ]

      const textFields = [
        "semester",
        "kode_mata_kuliah",
        "nama_mata_kuliah",
        "mata_kuliah_kompetensi",
        "sikap_capaian_pembelajaran",
        "pengetahuan_capaian_pembelajaran",
        "keterampilan_umum_capaian_pembelajaran",
        "keterampilan_khusus_capaian_pembelajaran",
        "dokumen_rencana_pembelajaran",
        "unit_penyeleng_gara",
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
      if (!item.nama_mata_kuliah || !item.semester) {
        errors.push(`Row ${idx + 1}: Nama mata kuliah dan semester wajib diisi`)
      }

      const totalBobot =
        parseFloat(item.kuliah_responsi_tutorial_bobot_kredit_sks || 0) +
        parseFloat(item.seminar_bobot_kredit_sks || 0) +
        parseFloat(
          item.praktikum_praktik_praktik_lapangan_bobot_kredit_sks || 0
        )

      if (totalBobot <= 0) {
        errors.push(`Row ${idx + 1}: Bobot kredit total harus lebih dari 0`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const kurikulumCapaianRencanaPlugin = new KurikulumCapaianRencanaPlugin()

export default kurikulumCapaianRencanaPlugin
