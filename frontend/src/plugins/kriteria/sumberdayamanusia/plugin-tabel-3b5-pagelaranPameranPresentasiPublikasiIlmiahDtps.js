import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
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

  // FIX: Add calculated fields configuration
  getCalculatedFields() {
    return {
      jumlah: (row) => {
        const ts2 = parseFloat(row.ts_2_jumlah_judul) || 0
        const ts1 = parseFloat(row.ts_1_jumlah_judul) || 0
        const ts = parseFloat(row.ts_jumlah_judul) || 0

        return ts2 + ts1 + ts
      },
    }
  }

  // FIX: Add method to recalculate row with auto-calculated fields
  recalculateRow(row) {
    const calculatedFields = this.getCalculatedFields()
    const updatedRow = { ...row }

    // Calculate jumlah automatically
    if (calculatedFields.jumlah) {
      updatedRow.jumlah = calculatedFields.jumlah(updatedRow)
    }

    return updatedRow
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

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "no" || fieldName === "jenis_publikasi") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else {
          item[fieldName] = PluginUtils.parseNumber(value, 0)
        }
      })

      return item
    })

    // FIX: Calculate jumlah for each row after processing
    const calculatedData = processedData.map((row) => this.recalculateRow(row))

    return {
      allRows: calculatedData,
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

    // FIX: Use auto-calculated jumlah field
    data.forEach((item) => {
      const jumlah = item.jumlah || 0
      const judul = item.jenis_publikasi.toLowerCase()

      if (judul.includes("internasional bereputasi")) {
        NA4 += jumlah
      } else if (judul.includes("jurnal penelitian internasional")) {
        NA3 += jumlah
      } else if (judul.includes("jurnal penelitian nasional terakreditasi")) {
        NA2 += jumlah
      } else if (
        judul.includes("jurnal penelitian nasional tidak terakreditasi") ||
        judul.includes("jurnal penelitian tidak terakreditasi")
      ) {
        NA1 += jumlah
      } else if (judul.includes("seminar internasional")) {
        NB3 += jumlah
      } else if (judul.includes("seminar nasional")) {
        NB2 += jumlah
      } else if (
        judul.includes("seminar wilayah") ||
        judul.includes("seminar lokal")
      ) {
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
    if (!responseScoreDetail) {
      console.warn('fetchScoreDetails("3a1") did not return any data')
      return {
        scores: [{ butir: 28, nilai: 0 }],
        scoreDetail: {},
      }
    }
    let NDTPS = responseScoreDetail?.NDTPS || 0

    if (NDTPS === 0) {
      console.warn("NDTPS is 0, cannot calculate ratios")
      return {
        scores: [{ butir: 28, nilai: 0 }],
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
          RI: 0,
          RN: 0,
          RW: 0,
          A: 0,
          B: 0,
          C: 0,
        },
      }
    }

    // FIX: Calculate initial ratios
    let RW = Math.round(((NA1 + NB1 + NC1) / NDTPS) * 10000) / 10000
    let RN = Math.round(((NA2 + NA3 + NB2 + NC2) / NDTPS) * 10000) / 10000
    let RI = Math.round(((NA4 + NB3 + NC3) / NDTPS) * 10000) / 10000

    // Constants
    const a = 0.1
    const b = 1
    const c = 2

    // FIX: Apply capping rules before calculating A, B, C
    // Jika RI ≥ a dan RN < b, maka RI = a
    if (RI >= a && RN < b) {
      RI = a
    }
    // Jika RI < a dan RN ≥ b, maka RN = b
    if (RI < a && RN >= b) {
      RN = b
    }
    // Jika RW ≥ c , maka RW = c
    if (RW >= c) {
      RW = c
    }

    // Calculate A, B, C after applying capping
    let A = Math.round((RI / a) * 10000) / 10000
    let B = Math.round((RN / b) * 10000) / 10000
    let C = Math.round((RW / c) * 10000) / 10000

    // FIX: Apply correct scoring formula
    let score = 0

    // Jika RI > a dan RN > b maka Skor = 4
    if (RI > a && RN > b) {
      score = 4
    }
    // Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c
    // maka Skor = 3.75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
    else if (
      (RI > 0 && RI <= a) ||
      (RN > 0 && RN <= b) ||
      (RW > 0 && RW <= c)
    ) {
      score =
        3.75 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
    }
    // Jika semua 0, maka score = 0 (default)

    // Ensure score doesn't exceed 4
    score = score > 4 ? 4 : score
    score = Math.round(score * 100) / 100

    console.log("=== Publikasi Ilmiah DTPS Calculation Debug ===")
    console.log("Raw counts:", {
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
      NDTPS,
    })
    console.log("Initial ratios:", {
      RW_initial: (NA1 + NB1 + NC1) / NDTPS,
      RN_initial: (NA2 + NA3 + NB2 + NC2) / NDTPS,
      RI_initial: (NA4 + NB3 + NC3) / NDTPS,
    })
    console.log("After capping:", { RI, RN, RW })
    console.log("Factors:", { A, B, C })
    console.log("Constants:", { a, b, c })
    console.log("Score conditions:")
    console.log(`  RI > a (${RI} > ${a}): ${RI > a}`)
    console.log(`  RN > b (${RN} > ${b}): ${RN > b}`)
    console.log(`  Both conditions met: ${RI > a && RN > b}`)
    console.log("Final score:", score)

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
        NDTPS,
        RI: Math.round(RI * 10000) / 10000,
        RN: Math.round(RN * 10000) / 10000,
        RW: Math.round(RW * 10000) / 10000,
        A: Math.round(A * 10000) / 10000,
        B: Math.round(B * 10000) / 10000,
        C: Math.round(C * 10000) / 10000,
        a,
        b,
        c,
      },
    }
  }

  // FIX: Update normalizeData to include auto-calculation
  normalizeData(data) {
    // First apply base normalization
    const normalizedData = data.map((item) => {
      const result = { ...item }

      const textFields = ["jenis_publikasi"]
      const numericFields = [
        "ts_2_jumlah_judul",
        "ts_1_jumlah_judul",
        "ts_jumlah_judul",
        "jumlah",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      numericFields.forEach((field) => {
        result[field] = PluginUtils.parseNumber(result[field], 0)
      })

      return result
    })

    // Then recalculate auto-calculated fields
    return normalizedData.map((row) => this.recalculateRow(row))
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.jenis_publikasi?.trim()) {
        errors.push(`Row ${index + 1}: Jenis Publikasi harus diisi`)
      }

      const tahunFields = [
        { field: item.ts_2_jumlah_judul, label: "TS-2" },
        { field: item.ts_1_jumlah_judul, label: "TS-1" },
        { field: item.ts_jumlah_judul, label: "TS" },
      ]

      tahunFields.forEach(({ field, label }) => {
        const num = parseFloat(field)
        if (isNaN(num) || num < 0) {
          errors.push(
            `Row ${index + 1}: Nilai tahun ${label} harus berupa angka >= 0`
          )
        }
      })

      // FIX: Validate that auto-calculated jumlah matches manual calculation
      const expectedJumlah = this.getCalculatedFields().jumlah(item)
      const actualJumlah = parseFloat(item.jumlah) || 0

      if (Math.abs(expectedJumlah - actualJumlah) > 0.001) {
        console.warn(
          `Row ${
            index + 1
          }: Auto-correcting jumlah from ${actualJumlah} to ${expectedJumlah}`
        )
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
