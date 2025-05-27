import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { ExcelUtils } from "../../utils/ExcelUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PengakuanRekognisiDtpsPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b1",
      name: "Pengakuan/Rekognisi DTPS",
      description: "Plugin for processing rekognisi",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPengakuanRekognisiDtps: true,
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
        bidang_keahlian: "",
        rekognisi_rekognisi_dan_bukti_pendukung: "",
        bukti_pendukung_rekognisi_dan_bukti_pendukung: "",
        tingkat_wilayah: "",
        tingkat_nasional: "",
        tingkat_interna_sional: "",
        tahun_yyyy: "",
      }

      // Map fields based on detected indices
      const fieldMapping = {
        nama_dosen: 0,
        bidang_keahlian: 1,
        rekognisi_rekognisi_dan_bukti_pendukung: 2,
        bukti_pendukung_rekognisi_dan_bukti_pendukung: 3,
        tingkat_wilayah: 4,
        tingkat_nasional: 5,
        tingkat_interna_sional: 6,
        tahun_yyyy: 7,
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
    let NRD = 0
    data.forEach((item) => {
      if (
        item.nama_dosen?.trim() &&
        item.rekognisi_rekognisi_dan_bukti_pendukung?.trim()
      ) {
        NRD++
      }
    })

    const response = await fetchScoreDetails("3a1", additionalData.projectId)
    const NDTPS = response?.NDTPS || 0
    const RRD = NDTPS ? NRD / NDTPS : 0

    let score = 0
    if (strata === "D-3") {
      score = RRD >= 0.25 ? 4 : 2 + 8 * RRD
    } else {
      score = RRD >= 0.5 ? 4 : 2 + 4 * RRD
    }

    score = Math.round(score * 100) / 100

    return {
      scores: [
        {
          butir: 25,
          nilai: score,
        },
      ],
      scoreDetail: { RRD, NRD, NDTPS },
    }
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_dosen?.trim()) {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }
      if (!item.bidang_keahlian?.trim()) {
        errors.push(`Row ${index + 1}: Bidang keahlian harus diisi`)
      }
      if (!item.rekognisi_rekognisi_dan_bukti_pendukung?.trim()) {
        errors.push(`Row ${index + 1}: Rekognisi harus diisi`)
      }
      if (!item.bukti_pendukung_rekognisi_dan_bukti_pendukung?.trim()) {
        errors.push(`Row ${index + 1}: Bukti pendukung harus diisi`)
      }
      if (!item.tahun_yyyy?.trim()) {
        errors.push(`Row ${index + 1}: Tahun harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const pengakuanRekognisiDtpsPlugin = new PengakuanRekognisiDtpsPlugin()
export default pengakuanRekognisiDtpsPlugin
