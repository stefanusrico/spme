import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class CapstoneDesignProsesPembelajaranPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a4",
      name: "Capstone Design Proses Pembelajaran Plugin",
      description:
        "Plugin untuk tracking capstone design dalam proses pembelajaran",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isCapstoneDesignSection: true,
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
        nama_mata_kuliah: PluginUtils.normalizeTextField(
          row[detectedIndices.nama_mata_kuliah] || ""
        ),
        semester: PluginUtils.normalizeTextField(
          row[detectedIndices.semester] || ""
        ),
        cakupan_bahasan: PluginUtils.normalizeTextField(
          row[detectedIndices.cakupan_bahasan] || ""
        ),
        aspek_1: !!row[detectedIndices.aspek_1],
        aspek_2: !!row[detectedIndices.aspek_2],
        aspek_3: !!row[detectedIndices.aspek_3],
        aspek_4: !!row[detectedIndices.aspek_4],
      }
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    return {
      scores: [
        {
          butir: 48,
          nilai: 0,
        },
      ],
      scoreDetail: {},
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = ["nama_mata_kuliah", "semester", "cakupan_bahasan"]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      // Normalize boolean fields
      result.aspek_1 = !!result.aspek_1
      result.aspek_2 = !!result.aspek_2
      result.aspek_3 = !!result.aspek_3
      result.aspek_4 = !!result.aspek_4

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_mata_kuliah) {
        errors.push(`Row ${index + 1}: Nama Mata Kuliah wajib diisi`)
      }

      if (!item.semester) {
        errors.push(`Row ${index + 1}: Semester wajib diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const capstoneDesignProsesPembelajaranPlugin =
  new CapstoneDesignProsesPembelajaranPlugin()

export default capstoneDesignProsesPembelajaranPlugin
