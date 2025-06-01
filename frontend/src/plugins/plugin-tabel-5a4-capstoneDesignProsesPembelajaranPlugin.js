/**
 * Plugin untuk tracking Capstone Design dalam proses pembelajaran
 */
import { processExcelDataBase } from "../utils/tableUtils"

const capstoneDesignProsesPembelajaranPlugin = {
  getInfo() {
    return {
      code: "5a4",
      name: "Capstone Design Proses Pembelajaran Plugin",
      description: "Plugin untuk tracking capstone design dalam proses pembelajaran",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isCapstoneDesignSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmpty = row.some(val => val !== undefined && val !== null && val !== "")
      if (!nonEmpty) return false

      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false
        const normalized = cell.toLowerCase().trim()
        return ["jumlah", "total", "sum", "rata-rata", "average"].includes(normalized)
      })
      if (hasSummaryLabel) return false

      return true
    })

    const processedData = filteredData.map((row, index) => {
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        nama_mata_kuliah: row[detectedIndices.nama_mata_kuliah] || "",
        semester: row[detectedIndices.semester] || "",
        cakupan_bahasan: row[detectedIndices.cakupan_bahasan] || "",
        aspek_1: !!row[detectedIndices.aspek_1],
        aspek_2: !!row[detectedIndices.aspek_2],
        aspek_3: !!row[detectedIndices.aspek_3],
        aspek_4: !!row[detectedIndices.aspek_4],
      }
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

        if (existingData[tableCode]?.length > 0) {
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
          butir: 48, // Butir sementara
          nilai: 0,
        },
      ],
      scoreDetail: {}, // Score detail sementara dikosongkan
    };
  },

  normalizeData(data) {
    return data.map((item) => ({
      ...item,
      aspek_1: !!item.aspek_1,
      aspek_2: !!item.aspek_2,
      aspek_3: !!item.aspek_3,
      aspek_4: !!item.aspek_4,
    }))
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_mata_kuliah) {
        errors.push(`Row ${index + 1}: Nama Mata Kuliah wajib diisi`)
      }

      if (!item.semester) {
        errors.push(`Row ${index + 1}: Semester wajib diisi`)
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
      _timestamp: Date.now(),
      selected: true,
    }))
  },
}

export default capstoneDesignProsesPembelajaranPlugin