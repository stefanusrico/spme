import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import axiosInstance from "../../../utils/axiosConfig"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail"

// Helper function untuk parsing tanggal
const parseDateValue = (value, defaultValue = "") => {
  if (value === null || value === undefined || value === "") {
    return defaultValue
  }

  // Handle Excel date serial numbers first (common issue)
  if (typeof value === "number") {
    try {
      // Excel date serial number (days since 1900-01-01, with 1900 incorrectly treated as leap year)
      if (value > 1 && value < 2958466) {
        // Valid Excel date range
        // Adjust for Excel's leap year bug (day 60 = Feb 29, 1900 which didn't exist)
        const adjustedValue = value > 59 ? value - 1 : value
        // Excel epoch starts from 1899-12-30 (not 1900-01-01)
        const excelDate = new Date(1899, 11, 30)
        excelDate.setDate(excelDate.getDate() + adjustedValue)

        if (!isNaN(excelDate.getTime())) {
          return excelDate.toISOString().split("T")[0]
        }
      }

      // Regular timestamp
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
    } catch (e) {
      return defaultValue
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return defaultValue

    // Handle Indonesian date format (DD/MM/YYYY or DD-MM-YYYY)
    const indonesianDateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    const match = trimmed.match(indonesianDateRegex)

    if (match) {
      const [, day, month, year] = match
      // Convert to ISO format (YYYY-MM-DD)
      const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`

      // Validate the constructed date
      const testDate = new Date(isoDate)
      if (!isNaN(testDate.getTime())) {
        return isoDate
      }
    }

    // Try parsing as-is for other formats
    try {
      const parsed = new Date(trimmed)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0]
      }
    } catch (e) {
      // Continue to other parsing methods
    }

    return trimmed
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return defaultValue
    return value.toISOString().split("T")[0]
  }

  try {
    const parsed = new Date(String(value))
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
  } catch (e) {
    return defaultValue
  }

  return defaultValue
}

export class TridharmaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "1-*",
      name: "Tridharma Section Plugin",
      description: "Implementation for Tridharma sections (1-1, 1-2, 1-3)",
    })
  }

  configureSection(config) {
    return { ...config, isTridharma: true }
  }

  hasDefaultData() {
    return false
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices, jsonData, headerRowIndex, columnMap } =
      await processExcelDataBase(workbook, tableCode, config, prodiName)

    if (rawData.length === 0) return { allRows: [] }

    const pppIndices = this.detectPPP(jsonData, headerRowIndex)
    const filteredData = PluginUtils.filterDataRows(rawData)

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        tingkat_internasional: false,
        tingkat_nasional: false,
        tingkat_lokal_wilayah: false,
        pendidikan: sectionCode === "1-1",
        penelitian: sectionCode === "1-2",
        pkm: sectionCode === "1-3",
      }

      // Map fields from Excel
      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]
        const column = columnMap[fieldName]

        if (fieldName.startsWith("tingkat_")) {
          const stringValue = String(value || "")
            .trim()
            .toLowerCase()
          item[fieldName] =
            stringValue === "v" ||
            stringValue === "✓" ||
            stringValue === "x" ||
            stringValue === "true" ||
            value === true ||
            value === 1
        } else if (
          fieldName === "pendidikan" ||
          fieldName === "penelitian" ||
          fieldName === "pkm" ||
          (column && column.type === "boolean")
        ) {
          item[fieldName] = PluginUtils.parseBoolean(value)
        } else if (column && column.type === "date") {
          item[fieldName] = parseDateValue(value)
        } else if (column && column.type === "number") {
          item[fieldName] = PluginUtils.parseNumber(value)
        } else {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        }
      })

      if (
        !item.tingkat_internasional &&
        !item.tingkat_nasional &&
        !item.tingkat_lokal_wilayah
      ) {
        item.tingkat_nasional = true
      }

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: false,
      selectionRows: processedData,
    }
  }

  filterSelectedDataBySection(data, sectionCode) {
    const selectedData = data.filter((item) => item.selected === true)

    switch (sectionCode) {
      case "1-1":
        return selectedData.filter((item) => item.pendidikan === true)
      case "1-2":
        return selectedData.filter((item) => item.penelitian === true)
      case "1-3":
        return selectedData.filter((item) => item.pkm === true)
      default:
        return selectedData
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    try {
      const sectionCode =
        additionalData.sectionCode || this.determineSectionCode(data)
      const selectedData = data.filter((item) => item.selected === true)

      const relevantData = this.filterSelectedDataBySection(data, sectionCode)

      if (!sectionCode || !["1-1", "1-2", "1-3"].includes(sectionCode)) {
        return {
          scores: [{ butir: 10, nilai: 0 }],
          scoreDetail: {
            error: "Invalid section code for Tridharma calculation",
            sectionCode,
          },
        }
      }

      const sectionMetrics = this.calculateSectionMetrics(
        selectedData,
        sectionCode
      )

      const previousSectionsDetails = await this.getPreviousSectionsDetails(
        sectionCode,
        additionalData.projectId
      )

      if (sectionCode === "1-3") {
        const responseScoreDetail = await this.fetchScoreDetails(
          "3a1",
          additionalData.projectId
        )

        if (!responseScoreDetail) {
          console.warn('fetchScoreDetails("3a1") did not return any data')
          return {
            scores: [{ butir: 10, nilai: 0 }],
            scoreDetail: {
              error: "Cannot fetch NDTPS from table 3a1",
              ...sectionMetrics,
              previousSections: previousSectionsDetails,
            },
          }
        }

        const NDTPS = responseScoreDetail?.NDTPS || 10

        // Calculate final score using all sections' data
        const finalScoreResult = this.calculateFinalScoreFromAllDetails(
          previousSectionsDetails,
          sectionMetrics,
          NDTPS
        )

        return {
          ...finalScoreResult,
          scoreDetail: {
            ...finalScoreResult.scoreDetail,
            currentSection: sectionMetrics,
            previousSections: previousSectionsDetails,
          },
        }
      }

      // For sections 1-1 and 1-2, just return section metrics with previous details
      return {
        scores: [{ butir: 10, nilai: 0 }], // Individual sections don't have final score
        scoreDetail: {
          ...sectionMetrics,
          selectedCount: selectedData.length,
          totalCount: data.length,
          message: `Score detail calculated for section ${sectionCode}`,
          previousSections: previousSectionsDetails,
        },
      }
    } catch (error) {
      console.error("Error calculating score:", error)
      return {
        scores: [{ butir: 10, nilai: 0 }],
        scoreDetail: {
          error: error.message,
          selectedCount: data.filter((item) => item.selected).length,
          totalCount: data.length,
        },
      }
    }
  }

  async getPreviousSectionsDetails(currentSectionCode, projectId) {
    const previousSections = []

    // Define which sections to fetch based on current section
    const sectionsToFetch = []
    if (currentSectionCode === "1-2") {
      sectionsToFetch.push("1-1")
    } else if (currentSectionCode === "1-3") {
      sectionsToFetch.push("1-1", "1-2")
    }

    // Fetch score details for each previous section
    for (const sectionCode of sectionsToFetch) {
      try {
        const scoreDetail = await this.fetchScoreDetails(sectionCode, projectId)
        if (scoreDetail) {
          previousSections.push({
            sectionCode,
            ...scoreDetail,
          })
        }
      } catch (error) {
        console.warn(
          `Failed to fetch score details for section ${sectionCode}:`,
          error
        )
      }
    }

    return previousSections
  }

  calculateFinalScoreFromAllDetails(
    previousSectionsDetails,
    currentSectionMetrics,
    NDTPS
  ) {
    // Extract N1, N2, N3 from all sections
    let N1 = 0,
      N2 = 0,
      N3 = 0
    let totalNI = 0,
      totalNN = 0,
      totalNW = 0

    // Process previous sections (1-1 and 1-2)
    previousSectionsDetails.forEach((section) => {
      if (
        section.sectionCode === "1-1" &&
        section.activityCount !== undefined
      ) {
        N1 = section.activityCount || 0
        totalNI += section.NI || 0
        totalNN += section.NN || 0
        totalNW += section.NW || 0
      } else if (
        section.sectionCode === "1-2" &&
        section.activityCount !== undefined
      ) {
        N2 = section.activityCount || 0
        totalNI += section.NI || 0
        totalNN += section.NN || 0
        totalNW += section.NW || 0
      }
    })

    // Add current section (1-3) metrics
    N3 = currentSectionMetrics.activityCount || 0
    totalNI += currentSectionMetrics.NI || 0
    totalNN += currentSectionMetrics.NN || 0
    totalNW += currentSectionMetrics.NW || 0

    // Calculate Elemen A: Kerjasama pendidikan, penelitian, dan PkM
    const a = 3,
      b = 1,
      c = 2
    const RK = (a * N1 + b * N2 + c * N3) / NDTPS
    const elementA = RK >= 4 ? 4 : RK

    // Calculate Elemen B: Kerjasama tingkat internasional, nasional, wilayah/lokal
    const factorA = 2,
      factorB = 6,
      factorC = 8
    let elementB = 0

    if (totalNI > factorA && totalNN > factorB) {
      elementB = 4
    } else if (
      (totalNI > 0 && totalNI <= factorA) ||
      (totalNN > 0 && totalNN <= factorB) ||
      (totalNW > 0 && totalNW <= factorC)
    ) {
      // Apply constraints from the formula
      let adjustedNI = totalNI
      let adjustedNN = totalNN

      // Constraint rules from the matrix
      if (totalNI >= factorA && totalNN < factorB) {
        adjustedNI = factorA
      }
      if (totalNI < factorA && totalNN >= factorB) {
        adjustedNN = factorB
      }

      const A = adjustedNI / factorA
      const B = adjustedNN / factorB
      const C = totalNW / factorC

      // Formula from the matrix
      elementB =
        3.75 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
      elementB = Math.max(0, Math.min(4, elementB)) // Ensure score is between 0 and 4
    }

    // Calculate final score: ((2 x A) + B) / 3
    const finalScore = (2 * elementA + elementB) / 3

    return {
      scores: [
        {
          butir: 10,
          nilai: PluginUtils.roundToDecimal(finalScore, 2),
        },
      ],
      scoreDetail: {
        // Elemen A data
        N1,
        N2,
        N3,
        RK: PluginUtils.roundToDecimal(RK, 3),
        elementA: PluginUtils.roundToDecimal(elementA, 2),

        // Elemen B data
        NI: totalNI,
        NN: totalNN,
        NW: totalNW,
        elementB: PluginUtils.roundToDecimal(elementB, 2),

        // Final calculation
        NDTPS,
        finalScore: PluginUtils.roundToDecimal(finalScore, 2),
        formula: "Skor = ((2 x A) + B) / 3",

        // Calculation breakdown
        calculationBreakdown: {
          "RK = ((3 x N1) + (1 x N2) + (2 x N3)) / NDTPS": `((3 x ${N1}) + (1 x ${N2}) + (2 x ${N3})) / ${NDTPS} = ${PluginUtils.roundToDecimal(
            RK,
            3
          )}`,
          "Element A":
            RK >= 4
              ? "4 (karena RK ≥ 4)"
              : `${PluginUtils.roundToDecimal(elementA, 2)} (karena RK < 4)`,
          "Element B": `${PluginUtils.roundToDecimal(
            elementB,
            2
          )} (berdasarkan tingkat kerjasama)`,
          "Final Score": `((2 x ${PluginUtils.roundToDecimal(
            elementA,
            2
          )}) + ${PluginUtils.roundToDecimal(
            elementB,
            2
          )}) / 3 = ${PluginUtils.roundToDecimal(finalScore, 2)}`,
        },
      },
    }
  }

  calculateSectionMetrics(data, sectionCode) {
    // Count cooperation levels
    let NI = 0,
      NN = 0,
      NW = 0
    data.forEach((row) => {
      if (row.tingkat_internasional === true) NI++
      else if (row.tingkat_nasional === true) NN++
      else if (row.tingkat_lokal_wilayah === true) NW++
    })

    // Count activity types
    let activityCount = 0
    let activityType = ""

    switch (sectionCode) {
      case "1-1":
        activityCount = data.filter((item) => item.pendidikan === true).length
        activityType = "N1 (Kerjasama Pendidikan)"
        break
      case "1-2":
        activityCount = data.filter((item) => item.penelitian === true).length
        activityType = "N2 (Kerjasama Penelitian)"
        break
      case "1-3":
        activityCount = data.filter((item) => item.pkm === true).length
        activityType = "N3 (Kerjasama PkM)"
        break
    }

    return {
      sectionCode,
      activityType,
      activityCount,
      NI,
      NN,
      NW,
      totalKerjasama: data.length,
    }
  }

  // Helper method to determine section code from data
  determineSectionCode(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null
    }

    // Check which type of activity is predominant
    const pendidikanCount = data.filter(
      (item) => item.pendidikan === true
    ).length
    const penelitianCount = data.filter(
      (item) => item.penelitian === true
    ).length
    const pkmCount = data.filter((item) => item.pkm === true).length

    if (
      pendidikanCount > 0 &&
      pendidikanCount >= penelitianCount &&
      pendidikanCount >= pkmCount
    ) {
      return "1-1"
    } else if (penelitianCount > 0 && penelitianCount >= pkmCount) {
      return "1-2"
    } else if (pkmCount > 0) {
      return "1-3"
    }

    return null
  }

  normalizeData(data) {
    if (!data || !Array.isArray(data)) return data

    return data.map((row) => {
      const updatedRow = { ...row }

      // Normalize boolean fields
      const booleanFields = [
        "selected",
        "tingkat_internasional",
        "tingkat_nasional",
        "tingkat_lokal_wilayah",
        "pendidikan",
        "penelitian",
        "pkm",
      ]

      booleanFields.forEach((field) => {
        updatedRow[field] = PluginUtils.parseBoolean(updatedRow[field])
      })

      // Normalize numeric fields
      const numericFields = ["no", "durasi_dalam_tahun"]

      numericFields.forEach((field) => {
        if (updatedRow[field] !== undefined) {
          updatedRow[field] = PluginUtils.parseNumber(updatedRow[field], 0)
        }
      })

      // Normalize text fields
      const textFields = [
        "lembaga_mitra",
        "judul_kegiatan_kerjasama",
        "manfaat_bagi_ps_yang_diakreditasi",
        "status_kerjasama",
        "bukti_kerjasama",
      ]

      textFields.forEach((field) => {
        if (updatedRow[field] !== undefined) {
          updatedRow[field] = PluginUtils.normalizeTextField(updatedRow[field])
        }
      })

      // Normalize date fields
      const dateFields = [
        "tanggal_awal_kerjasama_hh_bb_tttt",
        "tanggal_akhir_kerjasama_hh_bb_tttt",
      ]

      dateFields.forEach((field) => {
        if (updatedRow[field] !== undefined) {
          updatedRow[field] = parseDateValue(updatedRow[field])
        }
      })

      // Ensure at least one tingkat is selected
      if (
        !updatedRow.tingkat_internasional &&
        !updatedRow.tingkat_nasional &&
        !updatedRow.tingkat_lokal_wilayah
      ) {
        updatedRow.tingkat_nasional = true
      }

      return updatedRow
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      // Validate required fields for selected items only
      if (item.selected) {
        if (!item.lembaga_mitra) {
          errors.push(`Row ${index + 1}: Lembaga mitra harus diisi`)
        }

        if (!item.judul_kegiatan_kerjasama) {
          errors.push(`Row ${index + 1}: Judul kegiatan kerjasama harus diisi`)
        }

        // Validate tingkat selection
        const hasTingkat =
          item.tingkat_internasional ||
          item.tingkat_nasional ||
          item.tingkat_lokal_wilayah

        if (!hasTingkat) {
          errors.push(
            `Row ${
              index + 1
            }: Harus memilih minimal satu tingkat (Internasional/Nasional/Lokal)`
          )
        }

        // Validate activity type
        const hasActivity = item.pendidikan || item.penelitian || item.pkm

        if (!hasActivity) {
          errors.push(
            `Row ${
              index + 1
            }: Harus memilih minimal satu jenis kegiatan (Pendidikan/Penelitian/PkM)`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Helper methods
  detectPPP(jsonData, headerRowIndex) {
    const result = { pendidikan: -1, penelitian: -1, pkm: -1 }
    const maxRows = Math.min(headerRowIndex + 3, jsonData.length)

    for (let i = headerRowIndex; i < maxRows; i++) {
      const row = jsonData[i] || []

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "")
          .toLowerCase()
          .trim()

        if (cell.includes("pendidikan")) {
          result.pendidikan = j
        } else if (cell.includes("penelitian")) {
          result.penelitian = j
        } else if (cell.includes("pkm") || cell.includes("pengabdian")) {
          result.pkm = j
        }
      }
    }

    return result
  }

  async fetchScoreDetails(tableCode, projectId) {
    try {
      return await fetchScoreDetails(tableCode, projectId)
    } catch (error) {
      console.error(`Error fetching score details for ${tableCode}:`, error)
      return null
    }
  }
}

export const tridharmaPlugin = new TridharmaPlugin()

export default tridharmaPlugin
