/**
 * Plugin khusus untuk section Evaluasi dan Pengendalian (Butir 9.a)
 */
import { processExcelDataBase } from "../utils/tableUtils"

const evaluasiDanPengendalianPlugin = {
  getInfo() {
    return {
      code: "9a",
      name: "Evaluasi dan Pengendalian Plugin",
      description: "Plugin for evaluating and controlling SPMI implementation",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isEvaluasiDanPengendalianSection: true,
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

      const nonEmptyValues = row.filter((val) => val !== undefined && val !== null && val !== "")
      if (nonEmptyValues.length <= 1) return false

      return true
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        bidang: "",
        dokumen_iku_ikt: false,
        pelaksanaan_ppepp: false,
        bukti_sahih_efektivitas: false,
        bukti_peningkatan_standar: false,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (["bidang"].includes(fieldName)) {
          item[fieldName] = value ? String(value).trim() : ""
        } else {
          const normalized = String(value).toLowerCase().trim()
          item[fieldName] = normalized === "ya" || normalized === "yes" || normalized === "1"
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
      return {
        scores: [
          {
            butir: 72,
            nilai: 0,
          },
        ],
        scoreDetail: {
          jumlah_bidang: 0,
          total_aspek: 0,
          aspek_terpenuhi: 0,
        },
      }
    }

    let totalAspek = 0
    let aspekTerpenuhi = 0
    let bidangCount = data.length

    data.forEach((item) => {
      const flags = [
        item.dokumen_iku_ikt,
        item.pelaksanaan_ppepp,
        item.bukti_sahih_efektivitas,
        item.bukti_peningkatan_standar,
      ]

      totalAspek += 4
      aspekTerpenuhi += flags.filter((v) => v === true).length
    })

    const averageAspek = bidangCount > 0 ? aspekTerpenuhi / bidangCount : 0
    let nilai = 0

    if (averageAspek >= 4) nilai = 4
    else if (averageAspek >= 3) nilai = 3
    else if (averageAspek >= 2) nilai = 2
    else if (averageAspek >= 1) nilai = 1

    return {
      scores: [
        {
          butir: 72,
          nilai,
        },
      ],
      scoreDetail: {
        jumlah_bidang: bidangCount,
        total_aspek: totalAspek,
        aspek_terpenuhi: aspekTerpenuhi,
        rata_rata_aspek_per_bidang: averageAspek.toFixed(2),
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => ({
      ...item,
      dokumen_iku_ikt: Boolean(item.dokumen_iku_ikt),
      pelaksanaan_ppepp: Boolean(item.pelaksanaan_ppepp),
      bukti_sahih_efektivitas: Boolean(item.bukti_sahih_efektivitas),
      bukti_peningkatan_standar: Boolean(item.bukti_peningkatan_standar),
    }))
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.bidang || item.bidang.trim() === "") {
        errors.push(`Row ${index + 1}: Bidang harus diisi`)
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
      _timestamp: new Date().getTime(),
      selected: true,
    }))
  },
}

export default evaluasiDanPengendalianPlugin
