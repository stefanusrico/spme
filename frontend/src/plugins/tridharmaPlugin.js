/**
 * Plugin for Tridharma sections (1-*)
 */
import {
  normalizeDataConsistency,
  checkAllRequiredSectionsSaved,
  calculateCombinedScore,
  updateScoreForAllRelatedSections,
  extractTridharmaVariables,
} from "../utils/tridharmaUtils"
import { processExcelDataBase } from "../utils/tableUtils"

let saveInProgress = false

const TridharmaPlugin = {
  getInfo() {
    return {
      code: "1-*",
      name: "Tridharma Section Plugin",
      description: "Implementation for Tridharma sections",
    }
  },

  configureSection(config) {
    return { ...config, isTridharma: true }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices, jsonData, headerRowIndex, columnMap } =
      await processExcelDataBase(workbook, tableCode, config, prodiName)

    if (rawData.length === 0) return { allRows: [] }

    const pppIndices = this.detectPPP(jsonData, headerRowIndex)
    const judulIdx = this.detectJudul(jsonData, headerRowIndex)

    const mergedIndices = {
      ...detectedIndices,
      ...pppIndices,
      judul_kegiatan_kerjasama: judulIdx,
    }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      const allNumbers = nonEmptyValues.every((val) => {
        return (
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(val) && val.trim() !== "")
        )
      })
      if (allNumbers && nonEmptyValues.length > 0) return false

      if (
        pppIndices.pendidikan !== -1 &&
        pppIndices.penelitian !== -1 &&
        pppIndices.pkm !== -1
      ) {
        const allFalse =
          this.isFalse(row[pppIndices.pendidikan]) &&
          this.isFalse(row[pppIndices.penelitian]) &&
          this.isFalse(row[pppIndices.pkm])

        if (allFalse) return false
      }

      return true
    })

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

      Object.entries(mergedIndices).forEach(([fieldName, colIndex]) => {
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
          item[fieldName] = this.validateBooleanValue(value)
        } else if (column && column.type === "date") {
          item[fieldName] = this.validateDateValue(value)
        } else if (column && column.type === "number") {
          item[fieldName] = this.validateNumberValue(value)
        } else {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
        }
      })

      const codeIdx = mergedIndices.judul_kegiatan_kerjasama
        ? mergedIndices.judul_kegiatan_kerjasama - 1
        : 6

      if (row[codeIdx]) {
        const code = String(row[codeIdx]).trim().toUpperCase()
        if (code === "LN") item.tingkat_internasional = true
        else if (code === "DN") item.tingkat_nasional = true
        else if (code === "LL" || code === "L")
          item.tingkat_lokal_wilayah = true
      }

      if (
        !item.tingkat_internasional &&
        !item.tingkat_nasional &&
        !item.tingkat_lokal_wilayah
      ) {
        item.tingkat_nasional = true
      }

      if (!item.pendidikan && !item.penelitian && !item.pkm) {
        if (sectionCode === "1-1") item.pendidikan = true
        else if (sectionCode === "1-2") item.penelitian = true
        else if (sectionCode === "1-3") item.pkm = true
      }

      return item
    })

    let finalData

    if (
      pppIndices.pendidikan !== -1 &&
      pppIndices.penelitian !== -1 &&
      pppIndices.pkm !== -1
    ) {
      if (sectionCode === "1-1") {
        finalData = processedData.filter((item) => item.pendidikan)
      } else if (sectionCode === "1-2") {
        finalData = processedData.filter((item) => item.penelitian)
      } else if (sectionCode === "1-3") {
        finalData = processedData.filter((item) => item.pkm)
      } else {
        finalData = processedData
      }
    } else {
      finalData = processedData
    }

    return { allRows: finalData }
  },

  validateBooleanValue(value) {
    if (value === undefined || value === null || value === "") return false
    if (value === true) return true

    if (typeof value === "string") {
      const lowerValue = value.toLowerCase().trim()
      return (
        lowerValue === "true" ||
        lowerValue === "ya" ||
        lowerValue === "yes" ||
        lowerValue === "v" ||
        lowerValue === "✓" ||
        lowerValue === "√" ||
        lowerValue === "x" ||
        lowerValue === "1"
      )
    }

    if (typeof value === "number") {
      return value === 1
    }

    return false
  },

  validateDateValue(value) {
    if (value === undefined || value === null || value === "") return ""

    if (typeof value === "string") {
      const trimmedValue = value.trim()

      if (
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedValue) ||
        /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
      ) {
        return trimmedValue
      }

      try {
        const date = new Date(trimmedValue)
        if (!isNaN(date.getTime())) {
          return this.formatDate(date)
        }
      } catch (e) {
        return ""
      }
    }

    if (typeof value === "number") {
      try {
        const excelEpoch = new Date(1899, 11, 30)
        const date = new Date(
          excelEpoch.getTime() + value * 24 * 60 * 60 * 1000
        )

        if (!isNaN(date.getTime())) {
          return this.formatDate(date)
        }
      } catch (e) {
        return ""
      }
    }

    return ""
  },

  formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  },

  validateNumberValue(value) {
    if (typeof value === "number") return value

    if (value === undefined || value === null || value === "") {
      return 0
    }

    if (typeof value === "string") {
      const cleanValue = value.replace(/[^\d.-]/g, "")
      const parsedValue = parseFloat(cleanValue)

      if (!isNaN(parsedValue)) {
        return parsedValue
      }
    }

    return 0
  },

  isFalse(value) {
    if (value === false || value === 0) return true
    if (typeof value === "string") {
      const val = value.toLowerCase().trim()
      return ["false", "tidak", "no", "0", ""].includes(val)
    }
    return false
  },

  detectPPP(jsonData, headerRowIndex) {
    const result = { pendidikan: -1, penelitian: -1, pkm: -1 }
    const maxRows = Math.min(headerRowIndex + 3, jsonData.length)

    for (let i = headerRowIndex; i < maxRows; i++) {
      const row = jsonData[i] || []

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "")
          .toLowerCase()
          .trim()

        if (cell.includes("pendidikan") || cell === "pendidikan") {
          result.pendidikan = j
        } else if (cell.includes("penelitian") || cell === "penelitian") {
          result.penelitian = j
        } else if (
          cell.includes("pkm") ||
          cell.includes("pengabdian") ||
          cell === "pkm" ||
          cell === "pm"
        ) {
          result.pkm = j
        }
      }
    }

    if (
      result.pendidikan === -1 &&
      result.penelitian === -1 &&
      result.pkm === -1
    ) {
      const dataStartRow = headerRowIndex + 1
      const sampleRows = Math.min(5, jsonData.length - dataStartRow)

      for (
        let rowIdx = dataStartRow;
        rowIdx < dataStartRow + sampleRows;
        rowIdx++
      ) {
        const row = jsonData[rowIdx] || []

        for (let j = 0; j < row.length - 2; j++) {
          const isBool = (val) => [true, false, "true", "false"].includes(val)

          if (isBool(row[j]) && isBool(row[j + 1]) && isBool(row[j + 2])) {
            result.pendidikan = j
            result.penelitian = j + 1
            result.pkm = j + 2
            break
          }
        }

        if (result.pendidikan !== -1) break
      }
    }

    return result
  },

  detectJudul(jsonData, headerRowIndex) {
    const maxRows = Math.min(headerRowIndex + 2, jsonData.length)

    for (let i = headerRowIndex; i < maxRows; i++) {
      const row = jsonData[i] || []

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "")
          .toLowerCase()
          .trim()

        if (
          cell.includes("judul") ||
          cell.includes("kegiatan") ||
          cell.includes("kerjasama") ||
          cell.includes("judul kegiatan")
        ) {
          return j
        }
      }
    }

    if (jsonData.length > headerRowIndex + 1) {
      const row = jsonData[headerRowIndex + 1] || []
      let longestIdx = -1,
        longestLen = 0

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "")
        if (cell.length > longestLen && cell.length > 20) {
          longestLen = cell.length
          longestIdx = j
        }
      }

      if (longestIdx !== -1) return longestIdx
    }

    return 7
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          initialTableData[tableCode] = existingData[tableCode]
        } else {
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  },

  async calculateScore(data, config, additionalData = {}) {
    const forceCalculation = additionalData.forcedCalculation === true

    if (!forceCalculation) {
      return {
        skipped: true,
        message: "Tridharma calculations only performed during save",
      }
    }

    saveInProgress = true

    try {
      const allSaved = await checkAllRequiredSectionsSaved(
        additionalData.userData
      )

      if (!allSaved) {
        saveInProgress = false
        return {
          score: null,
          scoreDetail: null,
          message:
            "Score will be calculated after all sections 1-1, 1-2, and 1-3 are saved.",
        }
      }

      const result = await calculateCombinedScore(
        additionalData.userData,
        additionalData.NDTPS || 20,
        additionalData.currentConfig,
        true
      )

      saveInProgress = false

      if (result !== null && !result.skipped) {
        return {
          score: result.score,
          scoreDetail: result.scoreDetail,
          log: result.calculationLog,
        }
      } else if (result && result.skipped) {
        return {
          score: null,
          scoreDetail: null,
          message: result.message || "Calculation skipped",
        }
      }

      return { score: 0, scoreDetail: {} }
    } catch (error) {
      console.error("Error calculating score:", error)
      saveInProgress = false
      return {
        score: 0,
        scoreDetail: {},
        error: error.message,
      }
    }
  },

  normalizeData(data) {
    const normalizedData = normalizeDataConsistency(data)

    return normalizedData.map((item) => ({
      ...item,
      tingkat_internasional: !!item.tingkat_internasional,
      tingkat_nasional: !!item.tingkat_nasional,
      tingkat_lokal_wilayah: !!item.tingkat_lokal_wilayah,
      pendidikan: !!item.pendidikan,
      penelitian: !!item.penelitian,
      pkm: !!item.pkm,
    }))
  },

  prepareDataForSaving(data, userData) {
    saveInProgress = true

    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: new Date().getTime(),
      tingkat_internasional: !!item.tingkat_internasional,
      tingkat_nasional: !!item.tingkat_nasional,
      tingkat_lokal_wilayah: !!item.tingkat_lokal_wilayah,
      pendidikan: !!item.pendidikan,
      penelitian: !!item.penelitian,
      pkm: !!item.pkm,
    }))
  },

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

      if (item.selected) {
        const hasKegiatan = item.pendidikan || item.penelitian || item.pkm

        if (!hasKegiatan) {
          errors.push(
            `Row ${
              index + 1
            }: Harus memilih minimal satu jenis kegiatan (Pendidikan/Penelitian/PKM)`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },
}

export default TridharmaPlugin
