import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { ExcelUtils } from "../../utils/ExcelUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class DosenTidakTetapPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a4",
      name: "Dosen Tidak Tetap",
      description: "Plugin for processing Non-Permanent Lecturers",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDosenTidakTetap: true,
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
        nidn_nidk: "",
        magister_magister_terapan_pendidikan_pasca_sarjana: "",
        doktor_doktor_terapan_pendidikan_pasca_sarjana: "",
        bidang_keahlian: "",
        jabatan_akademik: "",
        nomor_sertifikat_pendidik_profesional: "",
        bidang_sertifikasi_sertifikat_kompetensi_profesi_industri: "",
        lembaga_penerbit_sertifikat_kompetensi_profesi_industri: "",
        mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi: "",
        kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName ===
          "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu"
        ) {
          item[fieldName] = PluginUtils.parseBoolean(value)
        } else {
          item[fieldName] = PluginUtils.normalizeTextField(value)
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
    let NDTT = 0

    const responseScoreDetail = await fetchScoreDetails(
      "3a1",
      additionalData.projectId
    )

    let NDT = responseScoreDetail?.NDT || 0

    data.forEach((item) => {
      if (
        item.nama_dosen !== null &&
        item.nama_dosen !== undefined &&
        item.nama_dosen !== ""
      ) {
        NDTT += 1
      }
    })

    // PDTT = (NDTT / (NDT + NDTT)) x 100%
    const PDTT = NDT + NDTT > 0 ? (NDTT / (NDT + NDTT)) * 100 : 0

    // Hitung skor
    let score = 0
    if (PDTT === 0 && responseScoreDetail.NDTPS >= 5) {
      score = 4
    } else if (PDTT > 0 && PDTT <= 40 && responseScoreDetail.NDTPS >= 5) {
      score = 4 - (5 * PDTT) / 100
    } else if (PDTT > 40 && PDTT <= 60 && responseScoreDetail.NDTPS >= 5) {
      score = 1
    } else if (PDTT > 60) {
      score = 0
    }

    score = Math.round(score * 100) / 100

    console.log("Hasil PDTT :", PDTT, "%")
    console.log("Score : ", score)

    return {
      scores: [
        {
          butir: 23,
          nilai: PluginUtils.roundToDecimal(score),
        },
      ],
      scoreDetail: {
        PDTT: PluginUtils.roundToDecimal(PDTT),
        NDTT: PluginUtils.roundToDecimal(NDTT),
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_dosen",
        "nidn_nidk",
        "magister_magister_terapan_pendidikan_pasca_sarjana",
        "doktor_doktor_terapan_pendidikan_pasca_sarjana",
        "bidang_keahlian",
        "jabatan_akademik",
        "nomor_sertifikat_pendidik_profesional",
        "bidang_sertifikasi_sertifikat_kompetensi_profesi_industri",
        "lembaga_penerbit_sertifikat_kompetensi_profesi_industri",
        "mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi",
        "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu",
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
      // Daftar field wajib isi
      const requiredFields = [
        {
          field: item.nama_dosen,
          message: `Row ${index + 1}: Nama dosen harus diisi`,
        },
        {
          field: item.nidn_nidk,
          message: `Row ${index + 1}: NIDN/NIDK harus diisi`,
        },
        {
          field: item.magister_magister_terapan_pendidikan_pasca_sarjana,
          message: `Row ${index + 1}: Magister harus diisi`,
        },
        {
          field: item.doktor_doktor_terapan_pendidikan_pasca_sarjana,
          message: `Row ${index + 1}: Doktor harus diisi`,
        },
        {
          field: item.bidang_keahlian,
          message: `Row ${index + 1}: Bidang keahlian harus diisi`,
        },
        {
          field: item.jabatan_akademik,
          message: `Row ${index + 1}: Jabatan akademik harus diisi`,
        },
        {
          field: item.nomor_sertifikat_pendidik_profesional,
          message: `Row ${index + 1}: Nomor sertifikat pendidik harus diisi`,
        },
        {
          field: item.bidang_sertifikasi_sertifikat_kompetensi_profesi_industri,
          message: `Row ${index + 1}: Bidang sertifikasi harus diisi`,
        },
        {
          field: item.lembaga_penerbit_sertifikat_kompetensi_profesi_industri,
          message: `Row ${index + 1}: Lembaga penerbit sertifikat harus diisi`,
        },
        {
          field: item.mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi,
          message: `Row ${index + 1}: Mata kuliah yang diampu harus diisi`,
        },
        {
          field: item.kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu,
          message: `Row ${index + 1}: Kesesuaian bidang keahlian harus diisi`,
        },
      ]

      requiredFields.forEach(({ field, message }) => {
        if (!field) errors.push(message)
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Export
export const dosenTidakTetapPlugin = new DosenTidakTetapPlugin()
export default dosenTidakTetapPlugin
