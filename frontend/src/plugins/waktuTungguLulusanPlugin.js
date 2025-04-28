/**
 * Plugin khusus untuk section Waktu Tunggu Lulusan
 */
import { processExcelDataBase } from "../utils/tableUtils"

const waktuTungguLulusanPlugin = {
  getInfo() {
    return {
      code: "8c",
      name: "Waktu Tunggu Lulusan Plugin",
      description: "Plugin for graduate waiting time data processing",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isWaktuTungguLulusanSection: true,
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
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        tahun_lulus: "",
        jumlah_lulusan_yang_terlacak: 0,
        wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
        wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
        wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName === "program_studi" ||
          fieldName === "tahun_lulus" ||
          fieldName === "no"
        ) {
          item[fieldName] = value ? String(value).trim() : ""
        } else {
          const num = parseFloat(value)
          item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
        }
      })

      return item
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
      console.log("=== DEBUG: Empty or No Data for Score Calculation ===")
      return {
        scores: [
          {
            butir: 59,
            nilai: 0,
          },
        ],
        scoreDetail: {
          NL_Jumlah_Lulusan: 0,
          NJ: 0,
          PJ: 0,
        },
      }
    }

    let totalLulusan = 0
    let totalTerlacak = 0

    data.forEach((row, index) => {
      const lulusan = Number(row.jumlah_lulusan || 0)
      const terlacak = Number(row.jumlah_lulusan_yang_terlacak || 0)

      console.log(`Row ${index + 1}: Lulusan=${lulusan}, Terlacak=${terlacak}`)

      totalLulusan += lulusan
      totalTerlacak += terlacak
    })

    console.log(`=== DEBUG: Total Lulusan = ${totalLulusan}, Total Terlacak = ${totalTerlacak} ===`)

    const percentage = totalLulusan > 0 ? (totalTerlacak / totalLulusan) * 100 : 0

    console.log(`=== DEBUG: Calculated Percentage = ${percentage.toFixed(2)}% ===`)

    let nilai
    if (percentage >= 50) {
      nilai = 4
    } else if (percentage >= 40) {
      nilai = 3
    } else if (percentage >= 30) {
      nilai = 2
    } else if (percentage >= 20) {
      nilai = 1
    } else {
      nilai = 0
    }

    console.log(`=== DEBUG: Final Score (Nilai) = ${nilai} ===`)

    return {
      scores: [
        {
          butir: 59, // Sesuaikan dengan butir LKPS untuk Waktu Tunggu
          nilai,
        },
      ],
      scoreDetail: {
        NL: totalLulusan,
        NJ: totalTerlacak,
        PJ: percentage.toFixed(2),

      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const numericFields = [
        "jumlah_lulusan_yang_terlacak",
        "wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
        "wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
        "wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan",
      ]

      const result = { ...item }

      numericFields.forEach((field) => {
        result[field] = !isNaN(parseFloat(result[field]))
          ? Math.max(0, parseFloat(result[field]))
          : 0
      })

      return result
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.tahun_lulus) {
        errors.push(`Row ${index + 1}: Tahun Lulus harus diisi`)
      }

      const tracked = parseFloat(item.jumlah_lulusan_yang_terlacak || 0)
      const totalWait = 
        parseFloat(item.wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan || 0) +
        parseFloat(item.wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan || 0) +
        parseFloat(item.wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan || 0)

      if (totalWait > tracked) {
        errors.push(
          `Row ${index + 1}: Jumlah total waktu tunggu tidak boleh melebihi jumlah lulusan terlacak`
        )
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

export default waktuTungguLulusanPlugin
