import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class DataPelaksanaanKegiatanMBKMPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5b3",
      name: "Data Pelaksanaan Kegiatan MBKM Plugin",
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
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        nama_kegiatan: PluginUtils.normalizeTextField(row[1]),
        periode_pelaksanaan_durasi: PluginUtils.parseNumber(row[2], 0),
        jenis_kegiatan_mbkm: PluginUtils.parseNumber(row[3], 0),
        mata_kuliah_yang_setara_kode_nama: PluginUtils.normalizeTextField(
          row[4]
        ),
        sks_mk_yang_setara: PluginUtils.parseNumber(row[5], 0),
        jumlah_mahasiswa_ps_yang_mengikuti: PluginUtils.parseNumber(row[6], 0),
        nama_lembaga_mitra: PluginUtils.normalizeTextField(row[7]),
        nama_dtps_yang_menjadi_pembimbing: PluginUtils.normalizeTextField(
          row[8]
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
            butir: 49,
            nilai: 0,
          },
        ],
        scoreDetail: {
          jumlah_total_mahasiswa_mengikuti_mbkm: 0,
        },
      }
    }

    let jumlahTotalMahasiswaMengikutiMBKM = 0
    data.forEach((item) => {
      jumlahTotalMahasiswaMengikutiMBKM +=
        item.jumlah_mahasiswa_ps_yang_mengikuti
    })

    // TODO: Implement actual scoring logic based on percentage
    let nilai = 0

    return {
      scores: [
        {
          butir: 49,
          nilai,
        },
      ],
      scoreDetail: {
        jumlah_total_mahasiswa_mengikuti_mbkm:
          jumlahTotalMahasiswaMengikutiMBKM,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_kegiatan",
        "mata_kuliah_yang_setara_kode_nama",
        "nama_lembaga_mitra",
        "nama_dtps_yang_menjadi_pembimbing",
      ]

      const numericFields = [
        "periode_pelaksanaan_durasi",
        "jenis_kegiatan_mbkm",
        "sks_mk_yang_setara",
        "jumlah_mahasiswa_ps_yang_mengikuti",
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

    data.forEach((item, index) => {
      if (!item.nama_kegiatan) {
        errors.push(`Row ${index + 1}: Nama kegiatan harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const dataPelaksanaanKegiatanMBKMPlugin =
  new DataPelaksanaanKegiatanMBKMPlugin()

export default dataPelaksanaanKegiatanMBKMPlugin
