import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { ExcelUtils } from "../../utils/ExcelUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class KaryaIlmiahDtpsYangDisitasiPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b6",
      name: "Karya Ilimiah DTPS yang Disitasi",
      description: "Plugin for processing Karya Ilimiah DTPS yang Disitasi",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKaryaIlmiahDisitasi: true,
    }
  }

  // This plugin doesn't have default data
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
        judul_artikel_yang_disitasi_jurnal_volume_tahun_nomor_halaman: "",
        jumlah_sitasi: 0,
      }

      // Map fields based on detected indices
      const fieldMapping = {
        nama_dosen: 1,
        judul_artikel_yang_disitasi_jurnal_volume_tahun_nomor_halaman: 2,
        jumlah_sitasi: 3,
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
          if (fieldName === "jumlah_sitasi") {
            item[fieldName] = PluginUtils.parseNumber(row[colIndex], 0)
          } else {
            item[fieldName] = PluginUtils.normalizeTextField(row[colIndex])
          }
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
    // NAS = jumlah artikel yang disitasi
    let NAS = 0

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
        isValidField(
          item.judul_artikel_yang_disitasi_jurnal_volume_tahun_nomor_halaman
        ) &&
        isValidField(item.jumlah_sitasi)
      ) {
        NAS += 1
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
        scores: [{ butir: 29, nilai: 0 }],
        scoreDetail: {},
      }
    }

    let NDTPS = Number(responseScoreDetail?.NDTPS || 0)
    let RS = 0

    if (NDTPS === 0) {
      return {
        scores: [{ butir: 29, nilai: 0 }],
        scoreDetail: { NAS, RS: 0 },
      }
    }

    RS = Math.round((NAS / NDTPS) * 100) / 100

    // Menghitung score
    let score = 0
    if (RS >= 0.5) {
      score = 4
    } else if (RS < 0.5) {
      score = 2 + 2 * RS
    }

    return {
      scores: [{ butir: 29, nilai: score }],
      scoreDetail: { NAS, RS },
    }
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_dosen?.trim()) {
        errors.push(`Row ${index + 1}: Nama Dosen harus diisi`)
      }
      if (
        !item.judul_artikel_yang_disitasi_jurnal_volume_tahun_nomor_halaman?.trim()
      ) {
        errors.push(`Row ${index + 1}: Judul Artikel yang Disitasi harus diisi`)
      }
      if (item.jumlah_sitasi === undefined || item.jumlah_sitasi === null) {
        errors.push(`Row ${index + 1}: Jumlah sitasi harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const karyaIlmiahDtpsYangDisitasiPlugin =
  new KaryaIlmiahDtpsYangDisitasiPlugin()
export default karyaIlmiahDtpsYangDisitasiPlugin
