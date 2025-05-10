/**
 * Plugin khusus untuk section Kepuasan Mahasiswa
 */
import { processExcelDataBase } from "../utils/tableUtils"

const kepuasanMahasiswaPlugin = {
  getInfo() {
    return {
      code: "5d",
      name: "Kepuasan Mahasiswa Plugin",
      description: "Plugin for student satisfaction data processing",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isKepuasanMahasiswaSection: true,
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
        aspek_yang_diukur: row[1] || "",
        tingkat_sangat_baik: parseFloat(row[2]) || 0,
        tingkat_baik: parseFloat(row[3]) || 0,
        tingkat_cukup: parseFloat(row[4]) || 0,
        tingkat_kurang: parseFloat(row[5]) || 0,
        rencana_tindak_lanjut_oleh_upps_ps: row[6] || "",
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
    if (!data || data.length === 0) {
      return {
        scores: [
          {
            butir: 60,
            nilai: 0,
          },
        ],
        scoreDetail: {},
      }
    }

    let totalSangatBaik = 0
    let totalResponden = 0

    data.forEach((row) => {
      const sangatBaik = Number(row.tingkat_sangat_baik || 0)
      const baik = Number(row.tingkat_baik || 0)
      const cukup = Number(row.tingkat_cukup || 0)
      const kurang = Number(row.tingkat_kurang || 0)

      totalSangatBaik += sangatBaik
      totalResponden += sangatBaik + baik + cukup + kurang
    })

    const persentase = totalResponden > 0 ? (totalSangatBaik / totalResponden) * 100 : 0
    let nilai = 0

    if (persentase >= 60) nilai = 4
    else if (persentase >= 45) nilai = 3
    else if (persentase >= 30) nilai = 2
    else if (persentase >= 15) nilai = 1

    return {
      scores: [
        {
          butir: 60,
          nilai,
        },
      ],
      scoreDetail: {
        totalSangatBaik,
        totalResponden,
        persentase: persentase.toFixed(2),
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      return {
        ...item,
        sangat_baik: parseInt(item.tingkat_sangat_baik) || 0,
        baik: parseInt(item.tingkat_baik) || 0,
        cukup: parseInt(item.tingkat_cukup) || 0,
        kurang: parseInt(item.tingkat_kurang) || 0,
      }
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.aspek) {
        errors.push(`Row ${index + 1}: Aspek harus diisi`)
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
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }
    })
  },
}

export default kepuasanMahasiswaPlugin
