import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class KepuasanPenggunaLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8e2",
      name: "Tingkat Kepuasan Pengguna Lulusan Plugin",
      description:
        "Plugin for processing graduate user satisfaction level data",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKepuasanPenggunaSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData() {
    const now = Date.now()
    return [
      {
        key: `default-kepuasan-${now}`,
        no: "1",
        selected: true,
        jenis_kemampuan: "Etika",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      },
      {
        key: `default-kepuasan-${now + 1}`,
        no: "2",
        selected: true,
        jenis_kemampuan: "Keahlian pada bidang ilmu (kompetensi utama)",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      },
      {
        key: `default-kepuasan-${now + 2}`,
        no: "3",
        selected: true,
        jenis_kemampuan: "Kemampuan berbahasa asing",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      },
      {
        key: `default-kepuasan-${now + 3}`,
        no: "4",
        selected: true,
        jenis_kemampuan: "Penggunaan teknologi informasi",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      },
      {
        key: `default-kepuasan-${now + 4}`,
        no: "5",
        selected: true,
        jenis_kemampuan: "Kemampuan berkomunikasi",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      },
      {
        key: `default-kepuasan-${now + 5}`,
        no: "6",
        selected: true,
        jenis_kemampuan: "Kerjasama tim",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      },
      {
        key: `default-kepuasan-${now + 6}`,
        no: "7",
        selected: true,
        jenis_kemampuan: "Pengembangan diri",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      },
    ]
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
        jenis_kemampuan: "",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        // Convert all values to string
        item[fieldName] = PluginUtils.normalizeTextField(value)

        // Remove % symbols from percentage fields if present
        if (
          fieldName === "tingkat_sangat_baik" ||
          fieldName === "tingkat_baik" ||
          fieldName === "tingkat_cukup" ||
          fieldName === "tingkat_kurang"
        ) {
          item[fieldName] = item[fieldName].replace(/%/g, "")
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
    console.log("Calculating kepuasan pengguna score with data:", data)

    const prodiId = additionalData.userData?.prodiId
    const scoreDetailsResponse = await fetchScoreDetails(
      "8e1",
      additionalData.projectId
    )
    console.log("Fetched score details from 8e1:", scoreDetailsResponse)

    // Extract the required values from the API response
    let NL = 0
    let NJ = 0
    let PJ = 0
    let Prmin = 0

    if (scoreDetailsResponse) {
      NL = parseFloat(scoreDetailsResponse.NL || "0")
      NJ = parseFloat(scoreDetailsResponse.NJ || "0")
      PJ = parseFloat(scoreDetailsResponse.PJ?.replace("%", "") || "0")
      Prmin = parseFloat(scoreDetailsResponse.Prmin?.replace("%", "") || "0")
    } else {
      NL = parseFloat(additionalData.jumlahLulusan || "0")
      NJ = parseFloat(additionalData.jumlahResponden || "0")
      PJ = NJ > 0 ? (NJ / NL) * 100 : 0
      Prmin = NL >= 300 ? 30 : 50 - (NL / 300) * 20
    }

    console.log(`Using values: NL=${NL}, NJ=${NJ}, PJ=${PJ}%, Prmin=${Prmin}%`)

    // Calculate TKi for each capability type
    const tkiValues = data.map((item) => {
      const tingkat_sangat_baik = parseFloat(item.tingkat_sangat_baik || "0")
      const tingkat_baik = parseFloat(item.tingkat_baik || "0")
      const tingkat_cukup = parseFloat(item.tingkat_cukup || "0")
      const tingkat_kurang = parseFloat(item.tingkat_kurang || "0")

      return (
        4 * tingkat_sangat_baik +
        3 * tingkat_baik +
        2 * tingkat_cukup +
        tingkat_kurang
      )
    })

    console.log("TKI values:", tkiValues)

    // Calculate average score
    const totalTKi = tkiValues.reduce((sum, tki) => sum + tki, 0)
    const avgScore = tkiValues.length > 0 ? totalTKi / tkiValues.length : 0

    // Apply adjustment if response percentage doesn't meet minimum requirement
    let finalScore = avgScore
    if (PJ < Prmin) {
      finalScore = (PJ / Prmin) * avgScore
    }

    return {
      scores: [
        {
          butir: 68,
          nilai: finalScore,
        },
      ],
      scoreDetail: {
        NL,
        NJ,
        PJ: PJ + "%",
        Prmin: Prmin + "%",
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const allFields = [
        "jenis_kemampuan",
        "tingkat_sangat_baik",
        "tingkat_baik",
        "tingkat_cukup",
        "tingkat_kurang",
        "rencana_tindak_lanjut_oleh_upps_ps",
      ]

      allFields.forEach((field) => {
        if (result[field] === undefined || result[field] === null) {
          result[field] = field.startsWith("tingkat_") ? "0" : ""
        } else if (typeof result[field] === "boolean") {
          result[field] = result[field]
            ? field.startsWith("tingkat_")
              ? "100"
              : "Ya"
            : field.startsWith("tingkat_")
            ? "0"
            : ""
        } else {
          result[field] = String(result[field])
        }

        if (field.startsWith("tingkat_") && result[field].includes("%")) {
          result[field] = result[field].replace(/%/g, "")
        }
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    const requiredCapabilities = [
      "Etika",
      "Keahlian pada bidang ilmu",
      "Kemampuan berbahasa asing",
      "Penggunaan teknologi informasi",
      "Kemampuan berkomunikasi",
      "Kerjasama tim",
      "Pengembangan diri",
    ]

    const capabilities = data.map((item) =>
      String(item.jenis_kemampuan).toLowerCase()
    )

    requiredCapabilities.forEach((capability) => {
      const found = capabilities.some((cap) =>
        cap.toLowerCase().includes(capability.toLowerCase())
      )

      if (!found) {
        errors.push(`Jenis kemampuan "${capability}" wajib diisi`)
      }
    })

    data.forEach((item, index) => {
      if (!item.jenis_kemampuan) {
        errors.push(`Row ${index + 1}: Jenis kemampuan harus diisi`)
      }

      const totalPercentage =
        parseFloat(item.tingkat_sangat_baik || "0") +
        parseFloat(item.tingkat_baik || "0") +
        parseFloat(item.tingkat_cukup || "0") +
        parseFloat(item.tingkat_kurang || "0")

      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(
          `Row ${
            index + 1
          }: Total persentase (${totalPercentage}%) harus sama dengan 100%`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const kepuasanPenggunaLulusanPlugin = new KepuasanPenggunaLulusanPlugin()

export default kepuasanPenggunaLulusanPlugin
