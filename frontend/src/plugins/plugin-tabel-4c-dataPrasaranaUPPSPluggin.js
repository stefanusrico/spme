/**
 * Plugin khusus untuk section Data Prasarana UPPS
 */
import { processExcelDataBase } from "../utils/tableUtils"

/**
 * Plugin khusus untuk section Data Prasarana UPPS
 */
const dataPrasaranaUPPSPlugin = {
    getInfo() {
      return {
        code: "4c",
        name: "Data Prasarana UPPS Plugin",
        description: "Plugin untuk mendata prasarana di UPPS",
      }
    },
  
    configureSection(config) {
      return {
        ...config,
        isDataPrasaranaUPPSSection: true,
      }
    },
  
    async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
      const { rawData, detectedIndices } = await processExcelDataBase(
        workbook,
        tableCode,
        config,
        prodiName
      )

    console.log("=== DEBUG: Detected Indices ===")
    console.table(detectedIndices)

    console.log("=== DEBUG: Raw Data ===")
    console.table(rawData)
  
      if (rawData.length === 0) return { allRows: [] }
  
      const filteredData = rawData.filter((row) => {
        if (!row || row.length === 0) return false
  
        const nonEmptyValues = row.filter(
          (val) => val !== undefined && val !== null && val !== ""
        )
        if (nonEmptyValues.length <= 1) return false
  
        const isSequentialNumbersRow = nonEmptyValues.every((val, idx) => {
          const num = parseInt(val)
          return !isNaN(num) && num === idx + 1
        })
        if (isSequentialNumbersRow) return false
  
        const hasSummaryLabel = row.some((cell) => {
          if (typeof cell !== "string") return false
          const normalized = String(cell).toLowerCase().trim()
          return (
            normalized === "jumlah" ||
            normalized === "total" ||
            normalized === "sum" ||
            normalized === "rata-rata" ||
            normalized === "average"
          )
        })
        if (hasSummaryLabel) return false
  
        return true
      })
  
      const processedData = filteredData.map((row, index) => {
        return {
          key: `excel-${index + 1}-${Date.now()}`,
          no: index + 1,
          selected: false,
          nama_prasarana: row[1] || "",
          fungsi: row[2] || "",
          jumlah_unit: parseInt(row[3]) || 0,
          total_luas_m2: row[4] || 0,
          milik_sendiri_sewa: row[5] || "",
          terawat_kondisi: row[6] === "V" ? "V" : "",
          tidak_terawat_kondisi: row[7] === "V" ? "V" : "",
        }
      })
  
      return {
        allRows: processedData,
        shouldReplaceExisting: true,
      }
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
  
    calculateScore(data) {
      // Penilaian manual, tidak dari data numerik
      return {
        scores: [
          {
            butir: 37,
            nilai: 0,
          },
        ],
        scoreDetail: {
          note: "Silakan isi penilaian indikator secara manual berdasarkan kondisi sarana prasarana.",
        },
      }
    },
  
    normalizeData(data) {
      return data.map((item) => {
        return {
          ...item,
          jumlah_unit: parseInt(item.jumlah_unit) || 0,
          total_luas: parseFloat(item.total_luas) || 0,
          kondisi_terawat: parseInt(item.kondisi_terawat) || 0,
          kondisi_tidak_terawat: parseInt(item.kondisi_tidak_terawat) || 0,
        }
      })
    },
  
    validateData(data) {
      const errors = []
  
      data.forEach((item, index) => {
        if (!item.nama_prasarana) {
          errors.push(`Row ${index + 1}: Nama prasarana harus diisi`)
        }
      })
  
      return {
        valid: errors.length === 0,
        errors,
      }
    },
  
    prepareDataForSaving(data) {
      return data.map((item, index) => {
        return {
          ...item,
          no: index + 2,
          selected: true,
          _timestamp: new Date().getTime(),
        }
      })
    },
  }
  
  export default dataPrasaranaUPPSPlugin
  