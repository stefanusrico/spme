import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
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
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-2-${Date.now()}`,
        no: 2,
        selected: true,
        jenis_publikasi: "Jurnal penelitian nasional terakreditasi",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-3-${Date.now()}`,
        no: 3,
        selected: true,
        jenis_publikasi: "Jurnal penelitian internasional",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-4-${Date.now()}`,
        no: 4,
        selected: true,
        jenis_publikasi: "Jurnal penelitian internasional bereputasi",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-5-${Date.now()}`,
        no: 5,
        selected: true,
        jenis_publikasi: "Seminar wilayah/lokal/perguruan tinggi",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-6-${Date.now()}`,
        no: 6,
        selected: true,
        jenis_publikasi: "Seminar nasional",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-7-${Date.now()}`,
        no: 7,
        selected: true,
        jenis_publikasi: "Seminar internasional",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-8-${Date.now()}`,
        no: 8,
        selected: true,
        jenis_publikasi:
          "Pagelaran/pameran/presentasi dalam forum di tingkat wilayah",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-9-${Date.now()}`,
        no: 9,
        selected: true,
        jenis_publikasi:
          "Pagelaran/pameran/presentasi dalam forum di tingkat nasional",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-publikasi-10-${Date.now()}`,
        no: 10,
        selected: true,
        jenis_publikasi:
          "Pagelaran/pameran/presentasi dalam forum di tingkat internasional",
        jumlah_publikasi_ts_2: 0,
        jumlah_publikasi_ts_1: 0,
        jumlah_publikasi_ts: 0,
        jumlah: 0,
      },
    ]
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    return super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )
  }

  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    if (fieldLower.includes("jumlah") || fieldLower.includes("ts")) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping seperti 3b2
  getFieldNames(item) {
    const fields = Object.keys(item)
    console.log("Available fields:", fields)

    const fieldMapping = {
      ts2: null,
      ts1: null,
      ts: null,
      jumlah: null,
      jenis: null,
    }

    // ✅ Pattern-based field detection
    const patterns = {
      ts2: [
        /^.*ts[-_]?2.*$/i, // ts_2, ts-2, ts2
        /^.*publikasi.*ts[-_]?2.*$/i, // jumlah_publikasi_ts_2
      ],
      ts1: [
        /^.*ts[-_]?1.*$/i, // ts_1, ts-1, ts1
        /^.*publikasi.*ts[-_]?1.*$/i, // jumlah_publikasi_ts_1
      ],
      ts: [
        /^.*publikasi.*ts$/i, // jumlah_publikasi_ts (tanpa _1 atau _2)
        /^.*ts$/i, // field yang berakhiran ts tapi bukan ts_1/ts_2
      ],
      jumlah: [
        /^jumlah$/i, // exact match "jumlah"
        /^total$/i, // exact match "total"
        /^.*jumlah(?!.*publikasi).*$/i, // mengandung jumlah tapi bukan publikasi
      ],
      jenis: [
        /^.*jenis.*$/i, // mengandung jenis
        /^.*publikasi$/i, // berakhiran publikasi
        /^.*type.*$/i, // mengandung type
      ],
    }

    // ✅ Find fields using patterns dengan prioritas
    for (const [fieldType, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        const matchedField = fields.find((field) => {
          const matches = regex.test(field)

          // Special validation untuk ts field - pastikan bukan ts_1 atau ts_2
          if (fieldType === "ts" && matches) {
            const lower = field.toLowerCase()
            return (
              !lower.includes("ts_1") &&
              !lower.includes("ts-1") &&
              !lower.includes("ts_2") &&
              !lower.includes("ts-2") &&
              !lower.includes("ts 1") &&
              !lower.includes("ts 2")
            )
          }

          return matches
        })

        if (matchedField) {
          fieldMapping[fieldType] = matchedField
          break // Gunakan yang pertama ditemukan
        }
      }
    }

    // ✅ Fallback ke default names jika tidak ditemukan
    const result = {
      ts2: fieldMapping.ts2 || "jumlah_publikasi_ts_2",
      ts1: fieldMapping.ts1 || "jumlah_publikasi_ts_1",
      ts: fieldMapping.ts || "jumlah_publikasi_ts",
      jumlah: fieldMapping.jumlah || "jumlah",
      jenis: fieldMapping.jenis || "jenis_publikasi",
    }

    console.log("Field mapping result:", result)
    console.log("Field existence check:", {
      ts2Exists: item.hasOwnProperty(result.ts2),
      ts1Exists: item.hasOwnProperty(result.ts1),
      tsExists: item.hasOwnProperty(result.ts),
      jumlahExists: item.hasOwnProperty(result.jumlah),
      jenisExists: item.hasOwnProperty(result.jenis),
    })

    return result
  }

  // ✅ Recalculate row seperti 3b2
  recalculateRow(row) {
    const fields = this.getFieldNames(row)

    const ts2 = parseFloat(row[fields.ts2]) || 0
    const ts1 = parseFloat(row[fields.ts1]) || 0
    const ts = parseFloat(row[fields.ts]) || 0

    const total = ts2 + ts1 + ts

    const updatedRow = { ...row }
    updatedRow[fields.jumlah] = total

    console.log(`Recalculating row:`, {
      fields,
      values: { ts2, ts1, ts, total },
      before: row[fields.jumlah],
      after: total,
    })

    return updatedRow
  }

  // ✅ Normalization seperti 3b2
  normalizeData(data) {
    if (!Array.isArray(data)) return []

    return data.map((item, index) => {
      const result = {
        ...item,
        id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        no: index + 1,
      }

      const fields = this.getFieldNames(result)

      // Convert to numbers
      if (result[fields.ts2] !== undefined) {
        result[fields.ts2] = parseFloat(result[fields.ts2]) || 0
      }
      if (result[fields.ts1] !== undefined) {
        result[fields.ts1] = parseFloat(result[fields.ts1]) || 0
      }
      if (result[fields.ts] !== undefined) {
        result[fields.ts] = parseFloat(result[fields.ts]) || 0
      }

      return this.recalculateRow(result)
    })
  }

  // ✅ Validation seperti 3b2
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fields = this.getFieldNames(item)

      if (!item[fields.jenis] || String(item[fields.jenis]).trim() === "") {
        errors.push(`Row ${index + 1}: Jenis publikasi harus diisi`)
      }

      const numericFields = [
        { field: fields.ts2, label: "TS-2" },
        { field: fields.ts1, label: "TS-1" },
        { field: fields.ts, label: "TS" },
      ]

      numericFields.forEach(({ field, label }) => {
        if (item[field] !== undefined) {
          const num = parseFloat(item[field])
          if (isNaN(num) || num < 0) {
            errors.push(
              `Row ${index + 1}: Nilai tahun ${label} harus berupa angka >= 0`
            )
          }
        }
      })

      const ts2 = parseFloat(item[fields.ts2]) || 0
      const ts1 = parseFloat(item[fields.ts1]) || 0
      const ts = parseFloat(item[fields.ts]) || 0
      const expectedTotal = ts2 + ts1 + ts
      const actualTotal = parseFloat(item[fields.jumlah]) || 0

      if (Math.abs(expectedTotal - actualTotal) > 0.001) {
        console.log(
          `Row ${
            index + 1
          }: Auto-correcting total from ${actualTotal} to ${expectedTotal}`
        )
        item[fields.jumlah] = expectedTotal
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
