import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class BebanTotalPaket20SKSPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5b1",
      name: "Beban Total Paket 20 SKS Plugin",
      description:
        "Plugin for processing research integration data in learning",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isBebanTotalPaket20SKSSection: true,
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
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        kode_mata_kuliah: PluginUtils.normalizeTextField(row[1]),
        nama_mata_kuliah: PluginUtils.normalizeTextField(row[2]),
        posisi_semester_kurikulum: PluginUtils.parseNumber(row[3], 0),
        beban_sks: PluginUtils.parseNumber(row[4], 0),
        jenis_kegiatan_mbkm_yang_disetarakan: PluginUtils.normalizeTextField(
          row[5]
        ),
      }
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
            butir: 57,
            nilai: 0,
          },
        ],
        scoreDetail: {},
      }
    }

    // TODO: Implement actual scoring logic
    const nilai = 0

    return {
      scores: [
        {
          butir: 49,
          nilai,
        },
      ],
      scoreDetail: {},
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "kode_mata_kuliah",
        "nama_mata_kuliah",
        "jenis_kegiatan_mbkm_yang_disetarakan",
      ]
      const numericFields = ["posisi_semester_kurikulum", "beban_sks"]

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

    data.forEach((item, index) => {
      if (!item.nama_mata_kuliah) {
        errors.push(`Row ${index + 1}: Nama mata kuliah harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const bebanTotalPaket20SKSPlugin = new BebanTotalPaket20SKSPlugin()

export default bebanTotalPaket20SKSPlugin
