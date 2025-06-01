import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class DataPrasaranaUPPSPlugin extends BasePlugin {
  constructor() {
    super({
      code: "4c",
      name: "Data Prasarana UPPS Plugin",
      description: "Plugin untuk mendata prasarana di UPPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDataPrasaranaUPPSSection: true,
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
        nama_prasarana: PluginUtils.normalizeTextField(row[1]),
        fungsi: PluginUtils.normalizeTextField(row[2]),
        jumlah_unit: PluginUtils.parseNumber(row[3], 0),
        total_luas_m2: PluginUtils.parseNumber(row[4], 0),
        milik_sendiri_sewa: PluginUtils.normalizeTextField(row[5]),
        terawat_kondisi: row[6] === "V" ? "V" : "",
        tidak_terawat_kondisi: row[7] === "V" ? "V" : "",
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
          butir: 37,
          nilai: 0, // Penilaian manual
        },
      ],
      scoreDetail: {},
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const numericFields = ["jumlah_unit", "total_luas_m2"]
      const textFields = ["nama_prasarana", "fungsi", "milik_sendiri_sewa"]

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
      if (!item.nama_prasarana) {
        errors.push(`Row ${index + 1}: Nama prasarana harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const dataPrasaranaUPPSPlugin = new DataPrasaranaUPPSPlugin()

export default dataPrasaranaUPPSPlugin
