/**
 * Plugin khusus untuk section Ketersediaan Dokumen SPMI (Tabel 9.a)
 */
import { processExcelDataBase } from "../utils/tableUtils"

const ketersediaanDokumenPlugin = {
  getInfo() {
    return {
      code: "9a",
      name: "Ketersediaan Dokumen SPMI Plugin",
      description: "Plugin for evaluating availability and implementation of SPMI documents",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isKetersediaanDokumenSection: true,
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

      const isSummaryRow = row.some((cell) => {
        if (typeof cell !== "string") return false
        const value = cell.toLowerCase().trim()
        return ["jumlah", "total", "rata-rata", "average", "sum"].includes(value)
      })
      if (isSummaryRow) return false

      return true
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        bidang: "",
        dokumen_iku_ikt: false,
        siklus_ppepp: false,
        bukti_efektivitas: false,
        bukti_peningkatan: false,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (["bidang"].includes(fieldName)) {
          item[fieldName] = value ? String(value).trim() : ""
        } else {
          const normalized = typeof value === "string" ? value.toLowerCase().trim() : ""
          item[fieldName] = normalized === "ya" || normalized === "yes" || value === true
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

        if (existingData?.[tableCode]?.length > 0) {
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
            butir: 79,
            nilai: 0,
          },
        ],
        scoreDetail: {
          aspek_terpenuhi: 0,
          total_bidang: 0,
        },
      }
    }

    let aspekPenuhTerpenuhi = 0
    let totalBidang = data.length

    data.forEach((row, index) => {
      const allTrue =
        row.dokumen_iku_ikt &&
        row.siklus_ppepp &&
        row.bukti_efektivitas &&
        row.bukti_peningkatan

      console.log(`Row ${index + 1}: All Aspek Terpenuhi? = ${allTrue}`)
      if (allTrue) aspekPenuhTerpenuhi++
    })

    let nilai = 0
    if (aspekPenuhTerpenuhi === totalBidang) {
      nilai = 4
    } else if (aspekPenuhTerpenuhi >= totalBidang - 1) {
      nilai = 3
    } else if (aspekPenuhTerpenuhi >= totalBidang / 2) {
      nilai = 2
    } else if (aspekPenuhTerpenuhi > 0) {
      nilai = 1
    }

    return {
      scores: [
        {
          butir: 79,
          nilai,
        },
      ],
      scoreDetail: {
        aspek_terpenuhi: aspekPenuhTerpenuhi,
        total_bidang: totalBidang,
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => ({
      ...item,
      dokumen_iku_ikt: Boolean(item.dokumen_iku_ikt),
      siklus_ppepp: Boolean(item.siklus_ppepp),
      bukti_efektivitas: Boolean(item.bukti_efektivitas),
      bukti_peningkatan: Boolean(item.bukti_peningkatan),
    }))
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.bidang || item.bidang.trim() === "") {
        errors.push(`Row ${index + 1}: Nama bidang harus diisi.`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      selected: true,
      _timestamp: new Date().getTime(),
    }))
  },
}

export default ketersediaanDokumenPlugin
