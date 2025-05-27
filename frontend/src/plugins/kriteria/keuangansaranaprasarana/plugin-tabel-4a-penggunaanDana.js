import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PenggunaanDanaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "4a",
      name: "Penggunaan Dana Plugin",
      description: "Plugin for processing budget usage data in LKPS Table 4.a",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPenggunaanDanaSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = PluginUtils.filterDataRows(rawData)

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        jenis_penggunaan: "",
        ts_2_unit_pengelola_program_studi_rupiah: 0,
        ts_1_unit_pengelola_program_studi_rupiah: 0,
        ts_unit_pengelola_program_studi_rupiah: 0,
        rata_rata_unit_pengelola_program_studi_rupiah: 0,
        ts_2_program_studi_rupiah: 0,
        ts_1_program_studi_rupiah: 0,
        ts_program_studi_rupiah: 0,
        rata_rata_program_studi_rupiah: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (fieldName === "jenis_penggunaan") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else {
          item[fieldName] = PluginUtils.parseNumber(value, 0)
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    let skorDanaOperasional = 0
    let skorDanaPenelitian = 0
    let skorDanaPengabdian = 0
    let DOP = 0
    let DPD = 0
    let DPKMD = 0

    const operationalSubCategories = [
      "a. biaya dosen",
      "b. biaya tenaga kependidikan",
      "c. biaya operasional pembelajaran",
      "d. biaya operasional tidak langsung",
      "biaya operasional kemahasiswaan",
    ]

    const danaOperasionalSubRows = data.filter((item) =>
      operationalSubCategories.some((keyword) =>
        String(item.jenis_penggunaan).toLowerCase().includes(keyword)
      )
    )

    DOP = danaOperasionalSubRows.reduce(
      (sum, row) =>
        sum + (row.rata_rata_unit_pengelola_program_studi_rupiah || 0),
      0
    )

    const danaPenelitianRow = data.find(
      (item) =>
        String(item.jenis_penggunaan)
          .toLowerCase()
          .includes("dana penelitian dtps") ||
        String(item.jenis_penggunaan).toLowerCase().includes("penelitian")
    )

    const danaPengabdianRow = data.find(
      (item) =>
        String(item.jenis_penggunaan)
          .toLowerCase()
          .includes("dana pengabdian kepada masyarakat dtps") ||
        String(item.jenis_penggunaan).toLowerCase().includes("pengabdian") ||
        String(item.jenis_penggunaan).toLowerCase().includes("pkm") ||
        String(item.jenis_penggunaan).toLowerCase().includes("masyarakat")
    )

    // Calculate score for Butir 34
    if (DOP >= 20000000) {
      skorDanaOperasional = 4
    } else if (DOP < 20000000 && DOP > 0) {
      skorDanaOperasional = DOP / 5000000
    } else {
      skorDanaOperasional = 0
    }

    // Calculate score for Butir 35
    if (danaPenelitianRow) {
      DPD = danaPenelitianRow.rata_rata_unit_pengelola_program_studi_rupiah || 0
      if (DPD >= 10000000) {
        skorDanaPenelitian = 4
      } else if (DPD < 10000000 && DPD > 0) {
        skorDanaPenelitian = (2 * DPD) / 5000000
      } else {
        skorDanaPenelitian = 0
      }
    }

    // Calculate score for Butir 36
    if (danaPengabdianRow) {
      DPKMD =
        danaPengabdianRow.rata_rata_unit_pengelola_program_studi_rupiah || 0
      if (DPKMD >= 5000000) {
        skorDanaPengabdian = 4
      } else if (DPKMD < 5000000 && DPKMD > 0) {
        skorDanaPengabdian = (4 * DPKMD) / 5000000
      } else {
        skorDanaPengabdian = 0
      }
    }

    console.log("DOP:", DOP)
    console.log("DPD:", DPD)
    console.log("DPKMD:", DPKMD)

    return {
      scores: [
        { butir: 34, nilai: skorDanaOperasional },
        { butir: 35, nilai: skorDanaPenelitian },
        { butir: 36, nilai: skorDanaPengabdian },
      ],
      scoreDetail: {
        DOP: Math.round(DOP * 100) / 100,
        DPD: Math.round(DPD * 100) / 100,
        DPKMD: Math.round(DPKMD * 100) / 100,
      },
    }
  }

  /**
   * Define calculated fields and their formulas
   */
  getCalculatedFields() {
    return {
      rata_rata_unit_pengelola_program_studi_rupiah: (row) => {
        const ts2 = parseFloat(
          row.ts_2_unit_pengelola_program_studi_rupiah || 0
        )
        const ts1 = parseFloat(
          row.ts_1_unit_pengelola_program_studi_rupiah || 0
        )
        const ts = parseFloat(row.ts_unit_pengelola_program_studi_rupiah || 0)
        return Number(((ts2 + ts1 + ts) / 3).toFixed(2))
      },
      rata_rata_program_studi_rupiah: (row) => {
        const ts2 = parseFloat(row.ts_2_program_studi_rupiah || 0)
        const ts1 = parseFloat(row.ts_1_program_studi_rupiah || 0)
        const ts = parseFloat(row.ts_program_studi_rupiah || 0)
        return Number(((ts2 + ts1 + ts) / 3).toFixed(2))
      },
    }
  }

  recalculateRow(row) {
    const calculatedFields = this.getCalculatedFields()
    const updatedRow = { ...row }

    Object.entries(calculatedFields).forEach(([fieldName, calcFunction]) => {
      updatedRow[fieldName] = calcFunction(updatedRow)
    })

    return updatedRow
  }

  recalculateData(data) {
    if (!Array.isArray(data)) return []
    return data.map((row) => this.recalculateRow(row))
  }

  normalizeData(data) {
    const normalizedData = data.map((item) => {
      const result = { ...item }

      const numericFields = [
        "ts_2_unit_pengelola_program_studi_rupiah",
        "ts_1_unit_pengelola_program_studi_rupiah",
        "ts_unit_pengelola_program_studi_rupiah",
        "ts_2_program_studi_rupiah",
        "ts_1_program_studi_rupiah",
        "ts_program_studi_rupiah",
      ]

      const textFields = ["jenis_penggunaan"]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      numericFields.forEach((field) => {
        result[field] = PluginUtils.parseNumber(result[field], 0)
      })

      return result
    })

    return this.recalculateData(normalizedData)
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.jenis_penggunaan || item.jenis_penggunaan.trim() === "") {
        errors.push(`Row ${index + 1}: Jenis Penggunaan harus diisi`)
      }

      const numericFields = [
        "ts_2_unit_pengelola_program_studi_rupiah",
        "ts_1_unit_pengelola_program_studi_rupiah",
        "ts_unit_pengelola_program_studi_rupiah",
        "rata_rata_unit_pengelola_program_studi_rupiah",
        "ts_2_program_studi_rupiah",
        "ts_1_program_studi_rupiah",
        "ts_program_studi_rupiah",
        "rata_rata_program_studi_rupiah",
      ]

      numericFields.forEach((field) => {
        const val = parseFloat(item[field])
        if (isNaN(val) || val < 0) {
          errors.push(`Row ${index + 1}: Nilai ${field} tidak valid`)
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const penggunaanDanaPlugin = new PenggunaanDanaPlugin()

export default penggunaanDanaPlugin
