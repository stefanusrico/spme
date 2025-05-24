/**
 * Plugin khusus untuk section Ketersediaan Dokumen SPMI (Tabel 9.b)
 */
import { processExcelDataBase } from "../utils/tableUtils"

const ketersediaanDokumenPlugin = {
  getInfo() {
    return {
      code: "9b",
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
        jenis_dokumen_penjaminan_mutu: row[1] || "",
        no_dokumen: row[2] || "",
        tanggal_dokumen: row[3] || "",
      }

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
  const allRows = data && data.allRows ? data.allRows : (Array.isArray(data) ? data : []);

  if (!allRows || allRows.length === 0) {
    console.log("=== DEBUG: Empty or No Data for Score Calculation ===")
    return {
      scores: [{ butir: 73, nilai: 0 }],
      scoreDetail: { kebijakan_spmi: false, manual_spmi: false, standar_spmi: false, formulir_spmi: false },
    }
  }

  const kebijakanSPMI = allRows.some(row => row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes('kebijakan spmi'));
  const manualSPMI = allRows.some(row => row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes('manual spmi'));
  const standarSPMI = allRows.some(row => row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes('standar spmi'));
  const formulirSPMI = allRows.some(row => row.jenis_dokumen_penjaminan_mutu.toLowerCase().includes('formulir spmi'));

  let nilai = 0;
  if (kebijakanSPMI && manualSPMI && standarSPMI && formulirSPMI) {
    nilai = 4;
  } else if (kebijakanSPMI && manualSPMI && standarSPMI) {
    nilai = 3;
  } else if (kebijakanSPMI && manualSPMI) {
    nilai = 2;
  } else if (kebijakanSPMI) {
    nilai = 1;
  }

  return {
    scores: [
      { butir: 73, nilai }
    ],
    scoreDetail: {
      kebijakan_spmi: kebijakanSPMI,
      manual_spmi: manualSPMI,
      standar_spmi: standarSPMI,
      formulir_spmi: formulirSPMI,
    },
  }
},

  normalizeData(data) {
    return data.map((item) => ({
      ...item,
      tanggal_dokumen: Boolean(item.tanggal_dokumen),
    }))
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.jenis_dokumen_penjaminan_mutu || item.jenis_dokumen_penjaminan_mutu.trim() === "") {
        errors.push(`Row ${index + 1}: Jenis Dokumen Penjaminan harus diisi.`)
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