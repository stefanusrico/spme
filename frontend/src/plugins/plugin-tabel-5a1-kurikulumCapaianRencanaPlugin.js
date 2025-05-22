/**
 * Plugin untuk mentrackt capaian pembelajaran
 * Berdasarkan Tabel 5.a.1 LKPS
 */
import { processExcelDataBase } from "../utils/tableUtils"

const kurikulumCapaianRencanaPlugin = {
  getInfo() {
    return {
      code: "5a1",
      name: "Kurikulum Capaian Rencana Plugin",
      description: "Plugin untuk mentrackt capaian pembelajaran dari tabel 5.a.1 LKPS",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isCapaianPembelajaranSection: true,
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
      return nonEmptyValues.length > 3
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        semester: "",
        kode_mata_kuliah: "",
        nama_mata_kuliah: "",
        mata_kuliah_kompetensi: "",
        kuliah_responsi_tutorial_bobot_kredit_sks: 0,
        seminar_bobot_kredit_sks: 0,
        praktikum_praktik_praktik_lapangan_bobot_kredit_sks: 0,
        konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi: 0,
        sikap_capaian_pembelajaran: "",
        pengetahuan_capaian_pembelajaran: "",
        keterampilan_umum_capaian_pembelajaran: "",
        keterampilan_khusus_capaian_pembelajaran: "",
        dokumen_rencana_pembelajaran: "",
        unit_penyeleng_gara: "",
        
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (fieldName === "semester") {
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

    if (config?.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table
        initialTableData[tableCode] = existingData?.[tableCode] || []
      })
    }

    return initialTableData
  },

  calculateScore(data) {
    if (!data || data.length === 0) {
      return {
        scores: [
          {
            butir: 43, // Asumsi Butir untuk 5.a.1, bisa disesuaikan
            nilai: 0,
          },
        ],
        scoreDetail: {
          JP: 0,
          JB: 0,
          PJP: 0,
        },
      }
    }

    let JP = 0 // Praktikum/praktek
    let JB = 0 // Total

    data.forEach((item, idx) => {
      const konversi = parseFloat(item.konversi_kredit_jam || 0)
      const kuliah = parseFloat(item.bobot_kuliah || 0)
      const seminar = parseFloat(item.bobot_seminar || 0)
      const praktikum = parseFloat(item.bobot_praktikum || 0)

      const totalBobot = kuliah + seminar + praktikum

      JB += totalBobot * konversi
      JP += praktikum * konversi
    })

    const PJP = JB > 0 ? (JP / JB) * 100 : 0
    const nilai = PJP >= 50 ? 4 : Math.round(8 * PJP) / 100

    return {
      scores: [
        {
          butir: 43,
          nilai,
        },
      ],
      scoreDetail: {
        JP: JP.toFixed(2),
        JB: JB.toFixed(2),
        PJP: PJP.toFixed(2),
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const numericFields = [
        "bobot_kuliah",
        "bobot_seminar",
        "bobot_praktikum",
        "konversi_kredit_jam",
      ]

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

    data.forEach((item, idx) => {
      if (!item.nama_mata_kuliah || !item.semester) {
        errors.push(`Row ${idx + 1}: Nama mata kuliah dan semester wajib diisi`)
      }

      const totalBobot = 
        parseFloat(item.bobot_kuliah || 0) +
        parseFloat(item.bobot_seminar || 0) +
        parseFloat(item.bobot_praktikum || 0)

      if (totalBobot <= 0) {
        errors.push(`Row ${idx + 1}: Bobot kredit total harus lebih dari 0`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, idx) => ({
      ...item,
      no: idx + 1,
      selected: true,
      _timestamp: new Date().getTime(),
    }))
  },
}

export default kurikulumCapaianRencanaPlugin
