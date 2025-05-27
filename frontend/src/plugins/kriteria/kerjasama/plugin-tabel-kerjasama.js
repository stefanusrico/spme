import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail"
import axiosInstance from "../../../utils/axiosConfig"
import { message } from "antd"

const parseDateValue = (value, defaultValue = "") => {
  if (value === null || value === undefined || value === "") {
    return defaultValue
  }

  if (typeof value === "string") {
    return value.trim()
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return defaultValue
    return value.toISOString().split("T")[0]
  }

  try {
    const parsed = new Date(String(value))
    if (isNaN(parsed.getTime())) return defaultValue
    return parsed.toISOString().split("T")[0]
  } catch (e) {
    return defaultValue
  }
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
        key: `excel-${index + 1}`,
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

        if (
          fieldName.startsWith("tingkat_") ||
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

      // Set default tingkat if none selected
      if (
        !item.tingkat_internasional &&
        !item.tingkat_nasional &&
        !item.tingkat_lokal_wilayah
      ) {
        item.tingkat_nasional = true
      }

      return item
    })

    // Filter data based on section if PPP columns exist
    if (
      pppIndices.pendidikan !== -1 &&
      pppIndices.penelitian !== -1 &&
      pppIndices.pkm !== -1
    ) {
      if (sectionCode === "1-1") {
        return { allRows: processedData.filter((item) => item.pendidikan) }
      } else if (sectionCode === "1-2") {
        return { allRows: processedData.filter((item) => item.penelitian) }
      } else if (sectionCode === "1-3") {
        return { allRows: processedData.filter((item) => item.pkm) }
      }
    }

    return { allRows: processedData }
  }

  async calculateScore(data, config, additionalData = {}) {
    const forceCalculation = additionalData.forcedCalculation === true

    if (!forceCalculation) {
      return {
        skipped: true,
        message: "Tridharma calculations only performed during save",
      }
    }

    try {
      // Check if all sections are saved
      const allSaved = await this.checkAllSectionsSaved(additionalData.userData)

      if (!allSaved) {
        return {
          score: null,
          scoreDetail: null,
          message:
            "Score will be calculated after all sections 1-1, 1-2, and 1-3 are saved.",
        }
      }

      // Get NDTPS from section 3a1
      const scoreDetailsResponse = await fetchScoreDetails("3a1")
      const NDTPS = scoreDetailsResponse?.NDTPS || 0

      if (NDTPS === 0) {
        return {
          score: 0,
          scoreDetail: { NDTPS: 0 },
          message: "NDTPS is 0, cannot calculate score",
        }
      }

      // Get data from all sections
      const sectionData = await this.fetchAllSectionsData(
        additionalData.userData
      )
      if (!sectionData) {
        return { score: 0, scoreDetail: {} }
      }

      // Calculate variables from each section
      const vars1 = this.extractVariables(sectionData["1-1"])
      const vars2 = this.extractVariables(sectionData["1-2"])
      const vars3 = this.extractVariables(sectionData["1-3"])

      // Get activity counts (N1, N2, N3)
      const N1 = vars1.N1 || 0
      const N2 = vars2.N2 || 0
      const N3 = vars3.N3 || 0

      // Count cooperation levels across all data
      const allData = [
        ...(sectionData["1-1"] || []),
        ...(sectionData["1-2"] || []),
        ...(sectionData["1-3"] || []),
      ]

      let NI = 0,
        NN = 0,
        NW = 0
      allData.forEach((row) => {
        if (row.tingkat_internasional === true) NI++
        else if (row.tingkat_nasional === true) NN++
        else if (row.tingkat_lokal_wilayah === true) NW++
      })

      // Calculate scores using simple formulas
      // Score A formula
      const RK = (2 * N1 + 1 * N2 + 3 * N3) / NDTPS
      let scoreA = 0
      if (RK >= 1) {
        scoreA = 4
      } else {
        scoreA = Math.min(4, 2 + 2 * RK)
      }

      // Score B formula
      const A = NI / 1
      const B = NN / 4
      const C = NW / 6
      let scoreB = 0
      if (A >= 1) {
        scoreB = 4
      } else if (A < 1 && B >= 1) {
        scoreB = 3 + A
      } else if (A < 1 && B < 1 && C >= 1) {
        scoreB = 2 + A + B
      } else {
        scoreB = 2 * (A + B + C)
      }

      const finalScore = scoreA

      const scoreDetail = {
        scoreA: PluginUtils.roundToDecimal(scoreA),
        scoreB: PluginUtils.roundToDecimal(scoreB),
        N1,
        N2,
        N3,
        NI,
        NN,
        NW,
        RK: PluginUtils.roundToDecimal(RK),
        NDTPS,
      }

      // Update scores in all sections
      await this.updateAllSectionsScore(finalScore, additionalData.userData)

      return {
        scores: [
          {
            butir: 10,
            nilai: PluginUtils.roundToDecimal(finalScore),
          },
        ],
        scoreDetail,
      }
    } catch (error) {
      console.error("Error calculating score:", error)
      return {
        score: 0,
        scoreDetail: {},
        error: error.message,
      }
    }
  }

  normalizeData(data) {
    if (!data || !Array.isArray(data)) return data

    return data.map((row) => {
      const updatedRow = { ...row }

      // Normalize boolean fields
      const booleanFields = [
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

  extractVariables(data) {
    if (!data || !Array.isArray(data)) {
      return { NI: 0, NN: 0, NW: 0, N1: 0, N2: 0, N3: 0 }
    }

    return {
      NI: data.filter((item) => item.tingkat_internasional === true).length,
      NN: data.filter((item) => item.tingkat_nasional === true).length,
      NW: data.filter((item) => item.tingkat_lokal_wilayah === true).length,
      N1: data.filter((item) => item.pendidikan === true).length,
      N2: data.filter((item) => item.penelitian === true).length,
      N3: data.filter((item) => item.pkm === true).length,
    }
  }

  async checkAllSectionsSaved(userData) {
    try {
      const sections = ["1-1", "1-2", "1-3"]
      const requests = sections.map((section) =>
        axiosInstance.get(`/lkps/sections/${section}/data`, {
          params: { prodiId: userData?.prodiId },
        })
      )

      await Promise.all(requests)
      return true
    } catch (error) {
      console.error("Error checking sections:", error)
      return false
    }
  }

  async fetchAllSectionsData(userData) {
    try {
      const sections = ["1-1", "1-2", "1-3"]
      const results = {}

      for (const section of sections) {
        const response = await axiosInstance.get(
          `/lkps/sections/${section}/data`,
          {
            params: { prodiId: userData?.prodiId },
          }
        )

        // Get table data from response
        const tableData = response.data?.tables
        if (tableData) {
          const tableKey = Object.keys(tableData)[0]
          results[section] = this.normalizeData(tableData[tableKey] || [])
        } else {
          results[section] = []
        }
      }

      return results
    } catch (error) {
      console.error("Error fetching section data:", error)
      return null
    }
  }

  async updateAllSectionsScore(score, userData) {
    try {
      const sections = ["1-1", "1-2", "1-3"]

      for (const section of sections) {
        const response = await axiosInstance.get(
          `/lkps/sections/${section}/data`,
          {
            params: { prodiId: userData?.prodiId },
          }
        )

        if (response.data?.tables) {
          const tableKey = Object.keys(response.data.tables)[0]
          const tableData = response.data.tables[tableKey] || []

          const payload = {
            prodiId: userData?.prodiId,
            score: score,
            [tableKey]: tableData,
          }

          await axiosInstance.post(`/lkps/sections/${section}/data`, payload)
          console.log(`Score for section ${section} updated to ${score}`)
        }
      }

      message.success(`Semua data tersimpan! Skor akhir: ${score}`)
      return true
    } catch (error) {
      console.error("Error updating scores:", error)
      return false
    }
  }
}

export const tridharmaPlugin = new TridharmaPlugin()

export default tridharmaPlugin
