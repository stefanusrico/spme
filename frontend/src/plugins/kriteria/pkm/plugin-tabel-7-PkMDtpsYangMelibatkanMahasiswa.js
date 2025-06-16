import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PkmDtpsYangMelibatkanMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "7",
      name: "PkM DTPS yang Melibatkan Mahasiswa",
      description: "Plugin for processing PkM DTPS yang Melibatkan Mahasiswa",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPkmDtpsMahasiswaSection: true,
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
        tema_pkm_sesuai_roadmap: "",
        nama_mahasiswa: "",
        judul_kegiatan_pkm_selain_kkn: "",
        tahun_yyyy: "",
      }

      // Map based on column indices
      if (row[1] !== undefined)
        item.nama_dosen = PluginUtils.normalizeTextField(row[1])
      if (row[2] !== undefined)
        item.tema_pkm_sesuai_roadmap = PluginUtils.normalizeTextField(row[2])
      if (row[3] !== undefined)
        item.nama_mahasiswa = PluginUtils.normalizeTextField(row[3])
      if (row[4] !== undefined)
        item.judul_kegiatan_pkm_selain_kkn = PluginUtils.normalizeTextField(
          row[4]
        )
      if (row[5] !== undefined)
        item.tahun_yyyy = PluginUtils.normalizeTextField(row[5])

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    let NPkMM = 0
    const seen = new Set()
    const currentYear = new Date().getFullYear()


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
        isValidField(item.nama_mahasiswa) &&
        isValidField(item.judul_kegiatan_pkm_selain_kkn) &&
        isValidField(item.tahun_yyyy)
      ) {
        const year = parseInt(item.tahun_yyyy)
        const uniqueKey = [
          item.nama_dosen,
          item.tema_pkm_sesuai_roadmap,
          item.nama_mahasiswa,
          item.judul_kegiatan_pkm_selain_kkn,
          item.tahun_yyyy,
        ].join("|")

        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey)

          if (year >= currentYear - 2 && year <= currentYear) {
            NPkMM += 1
          }
        }
      }
    })

    const responseScoreDetail = await fetchScoreDetails(
      "3b3",
      additionalData.projectId
    )

    if (!responseScoreDetail) {
      console.warn("Masukan data dari tabel 3b3")
      return {
        scores: [
          {
            butir: 56,
            nilai: 0,
          },
        ],
        scoreDetail: {},
      }
    }

    const NPkMD =
      Number(responseScoreDetail?.NI || 0) +
      Number(responseScoreDetail?.NN || 0) +
      Number(responseScoreDetail?.NL || 0)

    if (NPkMD === 0) {
      return {
        scores: [
          {
            butir: 56,
            nilai: 0,
          },
        ],
        scoreDetail: {
          NPkMM,
          NPkMD,
          PPkMDM: 0,
        },
      }
    }

    const PPkMDM = Math.round((NPkMM / NPkMD) * 100) / 100

    let score = 0
    if (PPkMDM >= 0.25) {
      score = 4
    } else {
      score = 2 + 8 * PPkMDM
    }

    console.log("NPkMM:", NPkMM)
    console.log("NPkMD:", NPkMD)
    console.log("PPkMDM:", PPkMDM)
    console.log("Score:", score)

    return {
      scores: [
        {
          butir: 56,
          nilai: score,
        },
      ],
      scoreDetail: {
        NPkMM,
        NPkMD,
        PPkMDM,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_dosen",
        "tema_pkm_sesuai_roadmap",
        "nama_mahasiswa",
        "judul_kegiatan_pkm_selain_kkn",
        "tahun_yyyy",
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
      if (!item.nama_dosen) {
        errors.push(`Row ${index + 1}: Nama Dosen harus diisi`)
      }
      if (!item.tema_pkm_sesuai_roadmap) {
        errors.push(`Row ${index + 1}: Tema Penelitian harus diisi`)
      }
      if (!item.nama_mahasiswa) {
        errors.push(`Row ${index + 1}: Nama mahasiswa harus diisi`)
      }
      if (!item.judul_kegiatan_pkm_selain_kkn) {
        errors.push(`Row ${index + 1}: Judul kegiatan harus diisi`)
      }
      if (!item.tahun_yyyy) {
        errors.push(`Row ${index + 1}: Tahun harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}


export const pkmDtpsYangMelibatkanMahasiswaPlugin =
  new PkmDtpsYangMelibatkanMahasiswaPlugin()

export default pkmDtpsYangMelibatkanMahasiswaPlugin
