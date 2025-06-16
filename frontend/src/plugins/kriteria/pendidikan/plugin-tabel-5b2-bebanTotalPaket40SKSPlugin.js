import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class BebanTotalPaket40SKSPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5b2",
      name: "Beban Total Paket MBKM Plugin",
      description: "Plugin untuk mentrack beban total paket kegiatan MBKM",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isBebanTotalPaketSection: true,
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
        kode_mata_kuliah: "",
        nama_mata_kuliah: "",
        posisi_semester_kurikulum: 0,
        beban_sks: 0,
        jenis_kegiatan_mbkm_yang_disetarakan: "",
      }

      // Use direct indices first, then use detectedIndices if available
      item.kode_mata_kuliah = PluginUtils.normalizeTextField(row[1])
      item.nama_mata_kuliah = PluginUtils.normalizeTextField(row[2])
      item.posisi_semester_kurikulum = PluginUtils.parseNumber(row[3], 0)
      item.beban_sks = PluginUtils.parseNumber(row[4], 0)
      item.jenis_kegiatan_mbkm_yang_disetarakan =
        PluginUtils.normalizeTextField(row[5])

      // Override with detectedIndices if available
      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName === "nama_mata_kuliah" ||
          fieldName === "kode_mata_kuliah" ||
          fieldName === "jenis_kegiatan_mbkm_yang_disetarakan"
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
            butir: 60,
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
      if (
        !item.kode_mata_kuliah ||
        !item.nama_mata_kuliah ||
        !item.jenis_kegiatan_mbkm_yang_disetarakan
      ) {
        errors.push(
          `Row ${index + 1}: Kode MK, Nama MK, dan Jenis Kegiatan wajib diisi`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const bebanTotalPaket40SKSPlugin = new BebanTotalPaket40SKSPlugin()

export default bebanTotalPaket40SKSPlugin
