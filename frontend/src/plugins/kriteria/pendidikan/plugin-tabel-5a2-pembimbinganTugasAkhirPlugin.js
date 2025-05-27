import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class PembimbinganTugasAkhirPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a2",
      name: "Pembimbingan Tugas Akhir Plugin",
      description:
        "Plugin untuk mendata pembimbingan tugas akhir dari tabel 5.a.2 LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPembimbinganTugasAkhirSection: true,
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
        nama_dosen_pembimbing: PluginUtils.normalizeTextField(row[1]),
        strata_pendidikan_status_dosen_pembimbing:
          PluginUtils.normalizeTextField(row[2]),
        jabatan_akademik_status_dosen_pembimbing:
          PluginUtils.normalizeTextField(row[3]),
        ts_2_jumlah_mahasiswa: PluginUtils.parseNumber(row[4], 0),
        ts_1_jumlah_mahasiswa: PluginUtils.parseNumber(row[5], 0),
        ts_jumlah_mahasiswa: PluginUtils.parseNumber(row[6], 0),
        ts_2_jumlah_pertemuan_dengan_mahasiswa: PluginUtils.parseNumber(
          row[7],
          0
        ),
        ts_1_jumlah_pertemuan_dengan_mahasiswa: PluginUtils.parseNumber(
          row[8],
          0
        ),
        ts_jumlah_pertemuan_dengan_mahasiswa: PluginUtils.parseNumber(
          row[9],
          0
        ),
        ts_2_lama_penyelesaian_tugas_akhir_bulan: PluginUtils.parseNumber(
          row[10],
          0
        ),
        ts_1_lama_penyelesaian_tugas_akhir_bulan: PluginUtils.parseNumber(
          row[11],
          0
        ),
        ts_lama_penyelesaian_tugas_akhir_bulan: PluginUtils.parseNumber(
          row[12],
          0
        ),
      }
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    // TODO: Implement actual scoring logic
    return {
      scores: [
        {
          butir: 0, // Akan diisi setelah ada aturan scoring
          nilai: 0,
        },
      ],
      scoreDetail: {},
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const numericFields = [
        "ts_2_jumlah_mahasiswa",
        "ts_1_jumlah_mahasiswa",
        "ts_jumlah_mahasiswa",
        "ts_2_jumlah_pertemuan_dengan_mahasiswa",
        "ts_1_jumlah_pertemuan_dengan_mahasiswa",
        "ts_jumlah_pertemuan_dengan_mahasiswa",
        "ts_2_lama_penyelesaian_tugas_akhir_bulan",
        "ts_1_lama_penyelesaian_tugas_akhir_bulan",
        "ts_lama_penyelesaian_tugas_akhir_bulan",
      ]

      const textFields = [
        "nama_dosen_pembimbing",
        "strata_pendidikan_status_dosen_pembimbing",
        "jabatan_akademik_status_dosen_pembimbing",
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
      if (!item.nama_dosen_pembimbing) {
        errors.push(`Baris ${index + 1}: Nama Dosen Pembimbing harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const pembimbinganTugasAkhirPlugin = new PembimbinganTugasAkhirPlugin()

export default pembimbinganTugasAkhirPlugin
