import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b7",
      name: "Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat",
      description:
        "Plugin for processing Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isProdukJasaDtps: true,
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
        nama_dosen: "",
        nama_produk_jasa: "",
        deskripsi_produk_jasa: "",
        bukti: "",
      }

      // Map fields based on detected indices
      const fieldMapping = {
        nama_dosen: 1,
        nama_produk_jasa: 2,
        deskripsi_produk_jasa: 3,
        bukti: 4,
      }

      Object.entries(fieldMapping).forEach(([fieldName, defaultIndex]) => {
        const colIndex =
          detectedIndices[fieldName] !== undefined
            ? detectedIndices[fieldName]
            : defaultIndex
        if (
          colIndex !== undefined &&
          colIndex >= 0 &&
          row[colIndex] !== undefined
        ) {
          item[fieldName] = PluginUtils.normalizeTextField(row[colIndex])
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
    // NAPJ = Jumlah produk/jasa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir.
    let NAPJ = 0

    const isValidField = (value) => {
      if (typeof value === "string") {
        return value.trim() !== ""
      }
      if (typeof value === "number") {
        return !isNaN(value)
      }
      return false
    }

    data.forEach((item) => {
      if (
        isValidField(item.nama_dosen) &&
        isValidField(item.nama_produk_jasa) &&
        isValidField(item.deskripsi_produk_jasa) &&
        isValidField(item.bukti)
      ) {
        NAPJ += 1
      }
    })

    // Mendapatkan nilai NDTPS
    const responseScoreDetail = await fetchScoreDetails(
      "3a1",
      additionalData.projectId
    )
    if (!responseScoreDetail) {
      console.warn('fetchScoreDetails("3a1") did not return any data')
      return {
        scores: [{ butir: 30, nilai: 0 }],
        scoreDetail: {},
      }
    }

    let NDTPS = Number(responseScoreDetail?.NDTPS || 0)
    let RS = 0

    if (NDTPS === 0) {
      return {
        scores: [{ butir: 30, nilai: 0 }],
        scoreDetail: { NAPJ, RS: 0 },
      }
    }

    // Menghitung RS
    RS = Math.round((NAPJ / NDTPS) * 100) / 100

    // Menghitung score
    let score = 0
    if (RS >= 1) {
      score = 4
    } else if (RS < 1) {
      score = 2 + 2 * RS
    }

    return {
      scores: [{ butir: 30, nilai: score }],
      scoreDetail: { NAPJ, RS },
    }
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_dosen?.trim()) {
        errors.push(`Row ${index + 1}: Nama Dosen harus diisi`)
      }
      if (!item.nama_produk_jasa?.trim()) {
        errors.push(`Row ${index + 1}: Nama produk/jasa harus diisi`)
      }
      if (!item.deskripsi_produk_jasa?.trim()) {
        errors.push(`Row ${index + 1}: Deskripsi produk/jasa harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const produkJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin =
  new ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin()
export default produkJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin
