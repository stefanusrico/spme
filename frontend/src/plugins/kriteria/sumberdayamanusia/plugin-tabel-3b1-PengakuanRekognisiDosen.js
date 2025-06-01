import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
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

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        item[fieldName] = PluginUtils.normalizeTextField(value)
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    // FIX: Count NRD based on valid rekognisi data
    let NRD = 0
    data.forEach((item) => {
      if (
        item.nama_dosen?.trim() &&
        item.rekognisi_rekognisi_dan_bukti_pendukung?.trim() &&
        this.hasValidRekognisi(item)
      ) {
        NRD++
      }
    })

    // Get NDTPS from 3a1
    const response = await fetchScoreDetails("3a1", additionalData.projectId)
    if (!response) {
      console.warn('fetchScoreDetails("3a1") did not return any data')
      return {
        scores: [{ butir: 25, nilai: 0 }],
        scoreDetail: { RRD: 0, NRD: 0, NDTPS: 0 },
      }
    }

    const NDTPS = response?.NDTPS || 0

    if (NDTPS === 0) {
      console.warn("NDTPS is 0, cannot calculate RRD")
      return {
        scores: [{ butir: 25, nilai: 0 }],
        scoreDetail: { RRD: 0, NRD, NDTPS: 0 },
      }
    }

    // Calculate RRD
    const RRD = Math.round((NRD / NDTPS) * 10000) / 10000

    // FIX: Apply correct scoring formula without strata conditions
    let score = 0

    // Jika RRD ≥ 0,5, maka Skor = 4
    if (RRD >= 0.5) {
      score = 4
    }
    // Jika RRD < 0,5, maka Skor = 2 + (4 x RRD)
    else {
      score = 2 + 4 * RRD
    }

    // Ensure minimum score is 2
    if (score < 2) {
      score = 2
    }

    // Ensure maximum score is 4
    if (score > 4) {
      score = 4
    }

    score = Math.round(score * 100) / 100

    console.log("=== Pengakuan/Rekognisi DTPS Calculation Debug ===")
    console.log("Raw values:", { NRD, NDTPS })
    console.log("RRD calculation:", { RRD })
    console.log("Score conditions:")
    console.log(`  RRD >= 0.5 (${RRD} >= 0.5): ${RRD >= 0.5}`)
    console.log(`  Formula used: ${RRD >= 0.5 ? "4" : "2 + (4 x RRD)"}`)
    console.log("Final score:", score)

    return {
      scores: [
        {
          butir: 25,
          nilai: score,
        },
      ],
      scoreDetail: {
        RRD: Math.round(RRD * 10000) / 10000,
        NRD,
        NDTPS,
      },
    }
  }

  // FIX: Add method to validate rekognisi type
  hasValidRekognisi(item) {
    const rekognisi =
      item.rekognisi_rekognisi_dan_bukti_pendukung?.toLowerCase() || ""
    const bukti =
      item.bukti_pendukung_rekognisi_dan_bukti_pendukung?.toLowerCase() || ""

    // Check for valid rekognisi types based on criteria
    const validTypes = [
      "visiting lecturer",
      "visiting scholar",
      "keynote speaker",
      "invited speaker",
      "editor",
      "mitra bestari",
      "reviewer",
      "staf ahli",
      "narasumber",
      "tenaga ahli",
      "konsultan",
      "penghargaan",
      "prestasi",
    ]

    const hasValidType = validTypes.some(
      (type) => rekognisi.includes(type) || bukti.includes(type)
    )

    // Check for tingkat (level)
    const hasValidLevel =
      item.tingkat_wilayah?.trim() ||
      item.tingkat_nasional?.trim() ||
      item.tingkat_interna_sional?.trim()

    return hasValidType && hasValidLevel
  }

  // FIX: Add method to get detailed rekognisi analysis
  getRekognisiAnalysis(data) {
    const analysis = {
      total_entries: data.length,
      valid_rekognisi: 0,
      invalid_rekognisi: 0,
      by_level: {
        wilayah: 0,
        nasional: 0,
        internasional: 0,
      },
      by_type: {
        visiting: 0,
        speaker: 0,
        editor_reviewer: 0,
        expert_consultant: 0,
        award: 0,
        other: 0,
      },
    }

    data.forEach((item) => {
      if (
        item.nama_dosen?.trim() &&
        item.rekognisi_rekognisi_dan_bukti_pendukung?.trim()
      ) {
        if (this.hasValidRekognisi(item)) {
          analysis.valid_rekognisi++

          // Count by level
          if (item.tingkat_wilayah?.trim()) analysis.by_level.wilayah++
          if (item.tingkat_nasional?.trim()) analysis.by_level.nasional++
          if (item.tingkat_interna_sional?.trim())
            analysis.by_level.internasional++

          // Count by type
          const rekognisi =
            item.rekognisi_rekognisi_dan_bukti_pendukung?.toLowerCase() || ""
          if (rekognisi.includes("visiting")) {
            analysis.by_type.visiting++
          } else if (rekognisi.includes("speaker")) {
            analysis.by_type.speaker++
          } else if (
            rekognisi.includes("editor") ||
            rekognisi.includes("reviewer") ||
            rekognisi.includes("mitra bestari")
          ) {
            analysis.by_type.editor_reviewer++
          } else if (
            rekognisi.includes("ahli") ||
            rekognisi.includes("konsultan") ||
            rekognisi.includes("narasumber")
          ) {
            analysis.by_type.expert_consultant++
          } else if (
            rekognisi.includes("penghargaan") ||
            rekognisi.includes("prestasi")
          ) {
            analysis.by_type.award++
          } else {
            analysis.by_type.other++
          }
        } else {
          analysis.invalid_rekognisi++
        }
      }
    })

    return analysis
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

      // FIX: Validate rekognisi type and level
      if (
        item.nama_dosen?.trim() &&
        item.rekognisi_rekognisi_dan_bukti_pendukung?.trim()
      ) {
        if (!this.hasValidRekognisi(item)) {
          errors.push(
            `Row ${
              index + 1
            }: Rekognisi tidak sesuai dengan kriteria yang ditetapkan atau tingkat tidak valid`
          )
        }
      }

      // Validate year format
      const year = item.tahun_yyyy?.trim()
      if (year && !/^\d{4}$/.test(year)) {
        errors.push(`Row ${index + 1}: Format tahun harus YYYY (4 digit)`)
      }

      // Validate year range (last 3 years)
      if (year && /^\d{4}$/.test(year)) {
        const currentYear = new Date().getFullYear()
        const yearValue = parseInt(year)
        if (yearValue < currentYear - 2 || yearValue > currentYear) {
          errors.push(
            `Row ${index + 1}: Tahun harus dalam rentang 3 tahun terakhir (${
              currentYear - 2
            } - ${currentYear})`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_dosen",
        "bidang_keahlian",
        "rekognisi_rekognisi_dan_bukti_pendukung",
        "bukti_pendukung_rekognisi_dan_bukti_pendukung",
        "tingkat_wilayah",
        "tingkat_nasional",
        "tingkat_interna_sional",
        "tahun_yyyy",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      return result
    })
  }
}

export const pengakuanRekognisiDtpsPlugin = new PengakuanRekognisiDtpsPlugin()
export default pengakuanRekognisiDtpsPlugin
