import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PengabdianKepadaMasyarakatDtpsPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b3",
      name: "Pengabdian Kepada Masyarakat DTPS",
      description: "Plugin for processing Pengabdian Kepada Masyarakat DTPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPengabdianDtps: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    return [
      {
        key: `default-pkm-1-${Date.now()}`,
        no: 1,
        selected: true,
        sumber_pembiayaan: "a) Perguruan tinggi atau mandiri",
        jumlah_judul_pkm_ts_2: 0,
        jumlah_judul_pkm_ts_1: 0,
        jumlah_judul_pkm_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-pkm-2-${Date.now()}`,
        no: 2,
        selected: true,
        sumber_pembiayaan: "b) Lembaga dalam negeri (diluar PT)",
        jumlah_judul_pkm_ts_2: 0,
        jumlah_judul_pkm_ts_1: 0,
        jumlah_judul_pkm_ts: 0,
        jumlah: 0,
      },
      {
        key: `default-pkm-3-${Date.now()}`,
        no: 3,
        selected: true,
        sumber_pembiayaan: "c) Lembaga luar negeri",
        jumlah_judul_pkm_ts_2: 0,
        jumlah_judul_pkm_ts_1: 0,
        jumlah_judul_pkm_ts: 0,
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

    if (
      fieldLower.includes("jumlah") ||
      fieldLower.includes("pkm") ||
      fieldLower.includes("ts")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping tanpa hardcode - sama seperti 3b2
  getFieldNames(item) {
    const fields = Object.keys(item)
    console.log("Available fields:", fields)

    const fieldMapping = {
      ts2: null,
      ts1: null,
      ts: null,
      jumlah: null,
      sumber: null,
    }

    // ✅ Pattern-based field detection
    const patterns = {
      ts2: [
        /^.*pkm.*ts[-_]?2.*$/i, // jumlah_judul_pkm_ts_2
        /^.*ts[-_]?2.*$/i, // ts_2, ts-2, ts2
      ],
      ts1: [
        /^.*pkm.*ts[-_]?1.*$/i, // jumlah_judul_pkm_ts_1
        /^.*ts[-_]?1.*$/i, // ts_1, ts-1, ts1
      ],
      ts: [
        /^.*pkm.*ts$/i, // jumlah_judul_pkm_ts (tanpa _1 atau _2)
        /^.*ts$/i, // field yang berakhiran ts tapi bukan ts_1/ts_2
      ],
      jumlah: [
        /^jumlah$/i, // exact match "jumlah"
        /^total$/i, // exact match "total"
        /^.*jumlah(?!.*pkm).*$/i, // mengandung jumlah tapi bukan pkm
      ],
      sumber: [
        /^.*sumber.*$/i, // mengandung sumber
        /^.*pembiayaan.*$/i, // mengandung pembiayaan
        /^.*funding.*$/i, // mengandung funding
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
      ts2: fieldMapping.ts2 || "jumlah_judul_pkm_ts_2",
      ts1: fieldMapping.ts1 || "jumlah_judul_pkm_ts_1",
      ts: fieldMapping.ts || "jumlah_judul_pkm_ts",
      jumlah: fieldMapping.jumlah || "jumlah",
      sumber: fieldMapping.sumber || "sumber_pembiayaan",
    }

    console.log("Field mapping result:", result)
    console.log("Field existence check:", {
      ts2Exists: item.hasOwnProperty(result.ts2),
      ts1Exists: item.hasOwnProperty(result.ts1),
      tsExists: item.hasOwnProperty(result.ts),
      jumlahExists: item.hasOwnProperty(result.jumlah),
      sumberExists: item.hasOwnProperty(result.sumber),
    })

    return result
  }

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
  
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fields = this.getFieldNames(item)

      if (!item[fields.sumber] || String(item[fields.sumber]).trim() === "") {
        errors.push(`Row ${index + 1}: Sumber pembiayaan harus diisi`)
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

export const pengabdianKepadaMasyarakatDtpsPlugin =
  new PengabdianKepadaMasyarakatDtpsPlugin()
export default pengabdianKepadaMasyarakatDtpsPlugin
