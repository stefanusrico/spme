/**
 * Plugin khusus untuk section Integrasi Kegiatan Penelitian dalam Pembelajaran
 */
import { processExcelDataBase } from "../utils/tableUtils"


const bebanTotalPaket20SKSPlugin = {
  getInfo() {
    return {
      code: "5b1",
      name: "Beban Total Paket 20 SKS Plugin",
      description: "Plugin for processing research integration data in learning",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isBebanTotalPaket20SKSSection: true,
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
        kode_mata_kuliah: row [1] || "",
        nama_mata_kuliah: row [2] || "",
        posisi_semester_kurikulum: row [3] || 0,
        beban_sks: row [4] || 0,
        jenis_kegiatan_mbkm_yang_disetarakan: row [5] || "",

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
            butir: 57,
            nilai: 0,
          },
        ],
        scoreDetail: {},
      }
    }

    const jumlahMK = data.length
    let nilai = 0

    if (jumlahMK >= 5) nilai = 4
    else if (jumlahMK >= 4) nilai = 3
    else if (jumlahMK >= 3) nilai = 2
    else if (jumlahMK >= 1) nilai = 1

    return {
      scores: [
        {
          butir: 57,
          nilai,
        },
      ],
      scoreDetail: {
        jumlahMK,
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      return {
        ...item,
        nama_mk: item.nama_mk || "",
        bentuk_integrasi: item.bentuk_integrasi || "",
        deskripsi_integrasi: item.deskripsi_integrasi || "",
      }
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_mk || !item.bentuk_integrasi || !item.deskripsi_integrasi) {
        errors.push(`Row ${index + 1}: Semua kolom harus diisi`)
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

export default bebanTotalPaket20SKSPlugin
