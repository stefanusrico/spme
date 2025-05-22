/**
 * Plugin untuk mentrack beban total paket MBKM
 */
import { processExcelDataBase } from "../utils/tableUtils"

const bebanTotalPaket40SKSPlugin = {
  getInfo() {
    return {
      code: "5b2",
      name: "Beban Total Paket MBKM Plugin",
      description: "Plugin untuk mentrack beban total paket kegiatan MBKM",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isBebanTotalPaketSection: true,
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
        kode_mata_kuliah: row[1] || 0,
        nama_mata_kuliah: row[2] || "",
        posisi_semester_kurikulum: row[3] || 0,
        beban_sks: row[4] || 0,
        jenis_kegiatan_mbkm_yang_disetarakan: row[5] || "",
        
      }

    Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (
          fieldName === "nama_mata_kuliah" ||
          fieldName === "kode_mata_kuliah" ||
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

    // Contoh asumsinya: satu baris = satu mahasiswa mengikuti MBKM dengan jumlah SKS tertera
    const totalMahasiswa = data.length
    const totalSKS = data.reduce((acc, row) => acc + (parseFloat(row.sks) || 0), 0)
    const mahasiswaMBKM = totalMahasiswa // jika semua mengikuti, bisa diubah kalau ada field terpisah

    let nilai = 0
    if (mahasiswaMBKM / totalMahasiswa >= 0.25 && totalSKS / totalMahasiswa >= 20) nilai = 4
    else if (mahasiswaMBKM / totalMahasiswa >= 0.25) nilai = 3
    else if (mahasiswaMBKM / totalMahasiswa > 0) nilai = 2
    else nilai = 1

    return {
      scores: [
        {
          butir: 60,
          nilai,
        },
      ],
      scoreDetail: {
        totalMahasiswa,
        mahasiswaMBKM,
        totalSKS,
        sksPerMahasiswa: (totalSKS / totalMahasiswa).toFixed(2),
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => ({
      ...item,
      semester: parseInt(item.semester) || 0,
      sks: parseFloat(item.sks) || 0,
    }))
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.kode_mk || !item.nama_mk || !item.jenis_kegiatan_mbkm) {
        errors.push(`Row ${index + 1}: Kode MK, Nama MK, dan Jenis Kegiatan wajib diisi`)
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

export default bebanTotalPaket40SKSPlugin
