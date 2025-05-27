import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { ExcelUtils } from "../../utils/ExcelUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class DosenIndustriPraktisiPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a5",
      name: "Dosen Industri/Praktisi",
      description: "Plugin for processing Practitioner/Industry Lecturer",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDosenIndustriPraktisi: true,
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
        nama_dosen_industri_praktisi: "",
        nidk: "",
        perusahaan_industri: "",
        pendidikan_tertinggi: "",
        bidang_keahlian: "",
        bidang_sertifikasi_sertifikat_profesi_kompetensi_industri: "",
        lembaga_penerbit_sertifikat_profesi_kompetensi_industri: "",
        mata_kuliah_yang_diampu: "",
        bobot_kredit_sks: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "bobot_kredit_sks") {
          item[fieldName] = PluginUtils.parseNumber(value, 0)
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
    // MKKI = Jumlah mata kuliah kompetensi yang diampu oleh dosen industri/praktisi.
    let uniqueMatkul = new Set()

    data.forEach((item) => {
      const matkul = item.mata_kuliah_yang_diampu
      if (matkul && matkul.trim() !== "") {
        uniqueMatkul.add(matkul.trim())
      }
    })

    const MKKI = uniqueMatkul.size

    // MKK = Jumlah mata kuliah kompetensi
    const responseScoreDetail = await fetchScoreDetails(
      "5a-1",
      additionalData.projectId
    )

    if (!responseScoreDetail) {
      console.warn('fetchScoreDetails("5a-1") did not return any data')
      return {
        scores: [
          {
            butir: 24,
            nilai: 0,
          },
        ],
        scoreDetail: {},
      }
    }

    const MKK = responseScoreDetail?.jumlah_mata_kuliah_kompetensi || 0

    // PMKI = (MKKI / MKK) x 100%
    const PMKI = MKK > 0 ? (MKKI / MKK) * 100 : 0

    // Hitung skor
    let score = 0
    if (PMKI >= 20) {
      score = 4
    } else if (PMKI < 20) {
      score = 2 + (10 * PMKI) / 100
    }

    score = Math.round(score * 100) / 100

    console.log("Hasil PMKI :", PMKI, "%")
    console.log("Score : ", score)

    return {
      scores: [
        {
          butir: 24,
          nilai: PluginUtils.roundToDecimal(score),
        },
      ],
      scoreDetail: {
        MKK: PluginUtils.roundToDecimal(MKK),
        MKKI: PluginUtils.roundToDecimal(MKKI),
        PMKI: PluginUtils.roundToDecimal(PMKI),
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_dosen_industri_praktisi",
        "nidk",
        "perusahaan_industri",
        "pendidikan_tertinggi",
        "bidang_keahlian",
        "bidang_sertifikasi_sertifikat_profesi_kompetensi_industri",
        "lembaga_penerbit_sertifikat_profesi_kompetensi_industri",
        "mata_kuliah_yang_diampu",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      // Pastikan bobot_kredit_sks adalah angka
      result.bobot_kredit_sks = PluginUtils.parseNumber(
        result.bobot_kredit_sks,
        0
      )

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const requiredFields = [
        {
          field: item.nama_dosen_industri_praktisi,
          message: `Row ${index + 1}: Nama dosen harus diisi`,
        },
        { field: item.nidk, message: `Row ${index + 1}: NIDK harus diisi` },
        {
          field: item.perusahaan_industri,
          message: `Row ${index + 1}: Perusahaan industri harus diisi`,
        },
        {
          field: item.pendidikan_tertinggi,
          message: `Row ${index + 1}: Pendidikan tertinggi harus diisi`,
        },
        {
          field: item.bidang_keahlian,
          message: `Row ${index + 1}: Bidang keahlian harus diisi`,
        },
        {
          field: item.bidang_sertifikasi_sertifikat_profesi_kompetensi_industri,
          message: `Row ${index + 1}: Bidang sertifikasi harus diisi`,
        },
        {
          field: item.lembaga_penerbit_sertifikat_profesi_kompetensi_industri,
          message: `Row ${index + 1}: Lembaga penerbit sertifikat harus diisi`,
        },
        {
          field: item.mata_kuliah_yang_diampu,
          message: `Row ${index + 1}: Mata kuliah harus diisi`,
        },
      ]

      requiredFields.forEach(({ field, message }) => {
        if (!field || field.trim() === "") errors.push(message)
      })

      if (
        item.bobot_kredit_sks === undefined ||
        item.bobot_kredit_sks === null ||
        item.bobot_kredit_sks === 0
      ) {
        errors.push(
          `Row ${index + 1}: Bobot kredit SKS harus diisi dan tidak boleh 0`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Export
export const dosenIndustriPraktisiPlugin = new DosenIndustriPraktisiPlugin()
export default dosenIndustriPraktisiPlugin
