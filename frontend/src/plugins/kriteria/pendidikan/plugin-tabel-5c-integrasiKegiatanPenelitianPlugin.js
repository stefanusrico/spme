import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class IntegrasiKegiatanPenelitianPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5c",
      name: "Integrasi Kegiatan Penelitian Plugin",
      description:
        "Plugin for processing research integration data in learning",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isIntegrasiKegiatanPenelitianSection: true,
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
        nama_dosen: PluginUtils.normalizeTextField(row[1]),
        judul_penelitian_pkm: PluginUtils.normalizeTextField(row[2]),
        mata_kuliah: PluginUtils.normalizeTextField(row[3]),
        bentuk_integrasi: PluginUtils.normalizeTextField(row[4]),
        ts_2_tahun_penelitian_pkm: PluginUtils.normalizeTextField(row[5]),
        ts_1_tahun_penelitian_pkm: PluginUtils.normalizeTextField(row[6]),
        ts_tahun_penelitian_pkm: PluginUtils.normalizeTextField(row[7]),
        tingkat_internasional: PluginUtils.normalizeTextField(row[8]),
        tingkat_nasional: PluginUtils.normalizeTextField(row[9]),
        tingkat_pt_wilayah: PluginUtils.normalizeTextField(row[10]),
        sesuai_kesesuaian_penelitian_dengan_roadmap:
          PluginUtils.normalizeTextField(row[11]),
        kurang_sesuai_kesesuaian_penelitian_dengan_roadmap:
          PluginUtils.normalizeTextField(row[12]),
        tidak_sesuai_kesesuaian_penelitian_dengan_roadmap:
          PluginUtils.normalizeTextField(row[13]),
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
            butir: 50,
            nilai: 0,
          },
        ],
        scoreDetail: {
          NMKI: 0,
        },
      }
    }

    const NMKI = data.length
    let nilai = 0

    if (NMKI > 3) nilai = 4
    else if (NMKI >= 2 && NMKI <= 3) nilai = 3
    else if (NMKI === 1) nilai = 2
    else nilai = 0

    console.log("NMKI:", NMKI)
    console.log("Score:", nilai)

    return {
      scores: [
        {
          butir: 50,
          nilai,
        },
      ],
      scoreDetail: {
        NMKI,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_dosen",
        "judul_penelitian_pkm",
        "mata_kuliah",
        "bentuk_integrasi",
        "ts_2_tahun_penelitian_pkm",
        "ts_1_tahun_penelitian_pkm",
        "ts_tahun_penelitian_pkm",
        "tingkat_internasional",
        "tingkat_nasional",
        "tingkat_pt_wilayah",
        "sesuai_kesesuaian_penelitian_dengan_roadmap",
        "kurang_sesuai_kesesuaian_penelitian_dengan_roadmap",
        "tidak_sesuai_kesesuaian_penelitian_dengan_roadmap",
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
      if (!item.nama_dosen || !item.judul_penelitian_pkm || !item.mata_kuliah) {
        errors.push(
          `Row ${
            index + 1
          }: Nama dosen, judul penelitian, dan mata kuliah harus diisi`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const integrasiKegiatanPenelitianPlugin =
  new IntegrasiKegiatanPenelitianPlugin()

export default integrasiKegiatanPenelitianPlugin