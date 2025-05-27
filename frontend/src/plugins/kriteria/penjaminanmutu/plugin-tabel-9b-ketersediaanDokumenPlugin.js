import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class KetersediaanDokumenPlugin extends BasePlugin {
  constructor() {
    super({
      code: "9b",
      name: "Ketersediaan Dokumen SPMI Plugin",
      description:
        "Plugin for evaluating availability and implementation of SPMI documents",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKetersediaanDokumenSection: true,
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
        jenis_dokumen_penjaminan_mutu: PluginUtils.normalizeTextField(row[1]),
        no_dokumen: PluginUtils.normalizeTextField(row[2]),
        tanggal_dokumen: PluginUtils.normalizeTextField(row[3]),
      }

      return item
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
      return {
        scores: [{ butir: 73, nilai: 0 }],
        scoreDetail: {
          kebijakan_spmi: false,
          manual_spmi: false,
          standar_spmi: false,
          formulir_spmi: false,
        },
      }
    }

    const kebijakanSPMI = allRows.some((row) =>
      row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes("kebijakan spmi")
    )
    const manualSPMI = allRows.some((row) =>
      row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes("manual spmi")
    )
    const standarSPMI = allRows.some((row) =>
      row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes("standar spmi")
    )
    const formulirSPMI = allRows.some((row) =>
      row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes("formulir spmi")
    )

    let nilai = 0
    if (kebijakanSPMI && manualSPMI && standarSPMI && formulirSPMI) {
      nilai = 4
    } else if (kebijakanSPMI && manualSPMI && standarSPMI) {
      nilai = 3
    } else if (kebijakanSPMI && manualSPMI) {
      nilai = 2
    } else if (kebijakanSPMI) {
      nilai = 1
    }

    console.log("Kebijakan SPMI:", kebijakanSPMI)
    console.log("Manual SPMI:", manualSPMI)
    console.log("Standar SPMI:", standarSPMI)
    console.log("Formulir SPMI:", formulirSPMI)
    console.log("Score:", nilai)

    return {
      scores: [{ butir: 73, nilai }],
      scoreDetail: {
        kebijakan_spmi: kebijakanSPMI,
        manual_spmi: manualSPMI,
        standar_spmi: standarSPMI,
        formulir_spmi: formulirSPMI,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "jenis_dokumen_penjaminan_mutu",
        "no_dokumen",
        "tanggal_dokumen",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (
        !item.jenis_dokumen_penjaminan_mutu ||
        item.jenis_dokumen_penjaminan_mutu.trim() === ""
      ) {
        errors.push(`Row ${index + 1}: Jenis Dokumen Penjaminan harus diisi.`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const ketersediaanDokumenPlugin = new KetersediaanDokumenPlugin()

export default ketersediaanDokumenPlugin
