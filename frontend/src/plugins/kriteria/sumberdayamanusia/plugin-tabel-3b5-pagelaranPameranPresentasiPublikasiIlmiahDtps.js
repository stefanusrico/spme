import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { ExcelUtils } from "../../utils/ExcelUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b5",
      name: "Pagelaran/Pameran/Presentasi/Publikasi Ilmiah DTPS",
      description:
        "Plugin for processing Pagelaran/Pameran/Presentasi/Publikasi Ilmiah DTPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPublikasiIlmiahDtps: true,
    }
  }

  // Override to indicate this plugin has default data
  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    return [
      {
        key: `default-publikasi-1-${Date.now()}`,
        no: 1,
        selected: true,
        jenis_publikasi: "Jurnal penelitian tidak terakreditasi",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-2-${Date.now()}`,
        no: 2,
        selected: true,
        jenis_publikasi: "Jurnal penelitian nasional terakreditasi",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-3-${Date.now()}`,
        no: 3,
        selected: true,
        jenis_publikasi: "Jurnal penelitian internasional",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-4-${Date.now()}`,
        no: 4,
        selected: true,
        jenis_publikasi: "Jurnal penelitian internasional bereputasi",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-5-${Date.now()}`,
        no: 5,
        selected: true,
        jenis_publikasi: "Seminar wilayah/lokal/perguruan tinggi",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-6-${Date.now()}`,
        no: 6,
        selected: true,
        jenis_publikasi: "Seminar nasional",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-7-${Date.now()}`,
        no: 7,
        selected: true,
        jenis_publikasi: "Seminar internasional",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-8-${Date.now()}`,
        no: 8,
        selected: true,
        jenis_publikasi:
          "Pagelaran/pameran/presentasi dalam forum di tingkat wilayah",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-9-${Date.now()}`,
        no: 9,
        selected: true,
        jenis_publikasi:
          "Pagelaran/pameran/presentasi dalam forum di tingkat nasional",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-10-${Date.now()}`,
        no: 10,
        selected: true,
        jenis_publikasi:
          "Pagelaran/pameran/presentasi dalam forum di tingkat internasional",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      },
    ]
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
        jenis_publikasi: "",
        ts_2_jumlah_judul: 0,
        ts_1_jumlah_judul: 0,
        ts_jumlah_judul: 0,
        jumlah: 0,
      }

      // Map fields based on detected indices
      const fieldMapping = {
        jenis_publikasi: 1,
        ts_2_jumlah_judul: 2,
        ts_1_jumlah_judul: 3,
        ts_jumlah_judul: 4,
        jumlah: 5,
      }

      Object.entries(fieldMapping).forEach(([fieldName, defaultIndex]) => {
        const colIndex =
          detectedIndices[fieldName] !== undefined
            ? detectedIndices[fieldName]
            : defaultIndex
        if (
          colIndex !== undefined &&
          colIndex >= 0 &&
          row[colIndex] !== undefined
        ) {
          if (fieldName === "jenis_publikasi") {
            item[fieldName] = PluginUtils.normalizeTextField(row[colIndex])
          } else {
            item[fieldName] = PluginUtils.parseNumber(row[colIndex], 0)
          }
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
    let NA1 = 0,
      NA2 = 0,
      NA3 = 0,
      NA4 = 0,
      NB1 = 0,
      NB2 = 0,
      NB3 = 0,
      NC1 = 0,
      NC2 = 0,
      NC3 = 0

    // Mendapatkan nilai
    data.forEach((item) => {
      const ts2 = Number(item.ts_2_jumlah_judul) || 0
      const ts1 = Number(item.ts_1_jumlah_judul) || 0
      const ts = Number(item.ts_jumlah_judul) || 0
      const jumlah = ts2 + ts1 + ts

      const judul = item.jenis_publikasi.toLowerCase()

      if (judul.includes("internasional bereputasi")) {
        NA4 += jumlah
      } else if (judul.includes("jurnal penelitian internasional")) {
        NA3 += jumlah
      } else if (judul.includes("jurnal penelitian nasional terakreditasi")) {
        NA2 += jumlah
      } else if (
        judul.includes("jurnal penelitian nasional tidak terakreditasi")
      ) {
        NA1 += jumlah
      } else if (judul.includes("seminar internasional")) {
        NB3 += jumlah
      } else if (judul.includes("seminar nasional")) {
        NB2 += jumlah
      } else if (judul.includes("seminar wilayah")) {
        NB1 += jumlah
      } else if (judul.includes("forum di tingkat internasional")) {
        NC3 += jumlah
      } else if (judul.includes("forum di tingkat nasional")) {
        NC2 += jumlah
      } else if (judul.includes("forum di tingkat wilayah")) {
        NC1 += jumlah
      }
    })

    // Mendapatkan nilai NDTPS
    const responseScoreDetail = await fetchScoreDetails(
      "3a1",
      additionalData.projectId
    )
    let NDTPS = responseScoreDetail?.NDTPS || 0

    if (NDTPS === 0) {
      return {
        scores: [{ butir: 28, nilai: 1 }],
        scoreDetail: {
          NA1,
          NA2,
          NA3,
          NA4,
          NB1,
          NB2,
          NB3,
          NC1,
          NC2,
          NC3,
          NDTPS: 0,
        },
      }
    }

    // Mendapatkan nilai RW, RN, RI
    let RW = Math.round(((NA1 + NB1 + NC1) / NDTPS) * 100) / 100
    let RN = Math.round(((NA2 + NA3 + NB2 + NC2) / NDTPS) * 100) / 100
    let RI = Math.round(((NA4 + NB3 + NC3) / NDTPS) * 100) / 100

    // Dengan Faktor:
    const a = 0.1
    const b = 1
    const c = 2

    // Mendapatkan nilai A, B, dan C
    let A = Math.round((RI / a) * 100) / 100
    let B = Math.round((RN / b) * 100) / 100
    let C = Math.round((RW / c) * 100) / 100

    // Menghitung score
    let score = 0
    if (RI >= a && RN >= b) {
      score = 4
    } else if (
      (RI > 0 && RI < a) ||
      (RN > 0 && RN < b) ||
      (RW > 0 && RW <= c)
    ) {
      score =
        4 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
    }

    score = score > 4 ? 4 : score
    score = Math.round(score * 100) / 100

    return {
      scores: [{ butir: 28, nilai: score }],
      scoreDetail: {
        NA1,
        NA2,
        NA3,
        NA4,
        NB1,
        NB2,
        NB3,
        NC1,
        NC2,
        NC3,
        RI,
        RN,
        RW,
      },
    }
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.jenis_publikasi?.trim()) {
        errors.push(`Row ${index + 1}: Jenis Publikasi harus diisi`)
      }
      if (
        item.ts_2_jumlah_judul === undefined ||
        item.ts_2_jumlah_judul === null
      ) {
        errors.push(`Row ${index + 1}: TS-2 Jumlah Judul harus diisi`)
      }
      if (
        item.ts_1_jumlah_judul === undefined ||
        item.ts_1_jumlah_judul === null
      ) {
        errors.push(`Row ${index + 1}: TS-1 Jumlah Judul harus diisi`)
      }
      if (item.ts_jumlah_judul === undefined || item.ts_jumlah_judul === null) {
        errors.push(`Row ${index + 1}: TS Jumlah Judul harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const pagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin =
  new PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin()
export default pagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin
