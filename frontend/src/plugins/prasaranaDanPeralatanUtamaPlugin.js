/**
 * Plugin untuk mendata prasarana dan peralatan utama di laboratorium UPPS
 */
import { processExcelDataBase } from "../utils/tableUtils"

const prasaranaDanPeralatanUtamaPlugin = {
  getInfo() {
    return {
      code: "4b",
      name: "Prasarana dan Peralatan Utama Plugin",
      description: "Plugin untuk mendata prasarana Utama di Laboratorium UPPS",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isPrasaranaDanPeralatanUtamaSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

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

    const isChecked = (val) => {
      const cleaned = typeof val === "string" ? val.trim().toLowerCase() : ""
      const isValid = ["v", "✔", "✓", "check", "ada", "terawat"].includes(cleaned)
      return isValid ? "V" : ""
    }

    const processedData = filteredData.map((row, index) => {
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        nama_laboratorium: row[1] || "",
        jumlah_lab: parseInt(row[2]) || 0,
        nama_alat_peraga: row[3] || "",
        standar_minimal_jumlah_alat: parseInt(row[4]) || 0,
        yang_dimiliki_upps_jumlah_alat: parseInt(row[5]) || 0,
        sendiri_kepemilikan: isChecked(row[6]), 
        sewa_kepemilikan: isChecked(row[7]),
        terawat_kondisi: isChecked(row[8]),
        tidak_terawat_kondisi: isChecked(row[9]),
        ada_logbook_diisi_oleh_pengusul_vokasi: isChecked(row[10]),
        tidak_ada_logbook_diisi_oleh_pengusul_vokasi: isChecked(row[11]),
        rata_rata_waktu_penggunaan_jam_minggu_diisi_oleh_pengusul_vokasi: parseFloat(row[12]) || 0,
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
    return {
      scores: [
        {
          butir: 60,
          nilai: 0, // Manual scoring
        },
      ],
      scoreDetail: {
        note: `Silakan isi penilaian indikator (skor 4/3/2/1/0) secara manual berdasarkan kecukupan, aksesibilitas, dan mutu sarana dan prasarana.`,
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      return {
        ...item,
        jumlah_lab: parseInt(item.jumlah_lab) || 0,
        jumlah_alat_standar_min: parseInt(item.jumlah_alat_standar_min) || 0,
        jumlah_alat_dimiliki: parseInt(item.jumlah_alat_dimiliki) || 0,
        kondisi_terawat: parseInt(item.kondisi_terawat) || 0,
        kondisi_tidak_terawat: parseInt(item.kondisi_tidak_terawat) || 0,
        logbook_ada: parseInt(item.logbook_ada) || 0,
        logbook_tidak_ada: parseInt(item.logbook_tidak_ada) || 0,
        rata_rata_penggunaan: parseFloat(item.rata_rata_penggunaan) || 0,
      }
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_laboratorium) {
        errors.push(`Row ${index + 1}: Nama laboratorium harus diisi`)
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

export default prasaranaDanPeralatanUtamaPlugin
