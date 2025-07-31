import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class DosenPembimbingTugasAkhirPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a2",
      name: "Dosen Pembimbing Tugas Akhir",
      description: "Plugin for processing final project supervisor",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDosenPembimbingTugasAkhir: true,
    }
  }

  hasDefaultData() {
    return false
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    // ✅ Recalculate setelah processing Excel data
    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => this.recalculateRow(item))
    }

    return result
  }

  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    if (fieldLower.includes("sk") && fieldLower.includes("ts")) {
      return "text"
    }

    // Number fields for guidance counts
    if (
      fieldLower.includes("ts_2") ||
      fieldLower.includes("ts_1") ||
      fieldLower.includes("ts") ||
      fieldLower.includes("rata_rata") ||
      fieldLower.includes("jumlah") ||
      fieldLower.includes("pada_ps") ||
      fieldLower.includes("ps_yang_diakreditasi") ||
      fieldLower.includes("ps_lain")
    ) {
      return "formatted_number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping yang lebih robust
  getFieldNames(item) {
    const fields = Object.keys(item)
    console.log("Available fields:", fields)

    const fieldMapping = {
      nama_dosen: null,
      // TS-2 fields
      ps_diakreditasi_ts2: null,
      ps_lain_ts2: null,
      sk_ts2: null,
      // TS-1 fields
      ps_diakreditasi_ts1: null,
      ps_lain_ts1: null,
      sk_ts1: null,
      // TS fields
      ps_diakreditasi_ts: null,
      ps_lain_ts: null,
      sk_ts: null,
      // Average fields
      ps_diakreditasi_avg: null,
      ps_lain_avg: null,
      total_average: null,
    }

    // ✅ Pattern-based field detection
    const patterns = {
      nama_dosen: [/^.*nama.*dosen.*$/i, /^.*nama.*$/i, /^.*dosen.*$/i],
      // TS-2 patterns
      ps_diakreditasi_ts2: [
        /^.*ps.*diakreditasi.*ts[-_]?2.*$/i,
        /^.*yang.*diakreditasi.*ts[-_]?2.*$/i,
        /^.*ps_yang_diakreditasi.*ts_2.*$/i,
      ],
      ps_lain_ts2: [/^.*ps.*lain.*ts[-_]?2.*$/i, /^.*lain.*ts[-_]?2.*$/i],
      sk_ts2: [/^.*sk.*ts[-_]?2.*$/i, /^.*nomor.*sk.*ts[-_]?2.*$/i],
      // TS-1 patterns
      ps_diakreditasi_ts1: [
        /^.*ps.*diakreditasi.*ts[-_]?1.*$/i,
        /^.*yang.*diakreditasi.*ts[-_]?1.*$/i,
        /^.*ps_yang_diakreditasi.*ts_1.*$/i,
      ],
      ps_lain_ts1: [/^.*ps.*lain.*ts[-_]?1.*$/i, /^.*lain.*ts[-_]?1.*$/i],
      sk_ts1: [/^.*sk.*ts[-_]?1.*$/i, /^.*nomor.*sk.*ts[-_]?1.*$/i],
      // TS patterns (current year)
      ps_diakreditasi_ts: [
        /^.*ps.*diakreditasi.*ts$/i,
        /^.*yang.*diakreditasi.*ts$/i,
      ],
      ps_lain_ts: [/^.*ps.*lain.*ts$/i, /^.*lain.*ts$/i],
      sk_ts: [/^.*sk.*ts$/i, /^.*nomor.*sk.*ts$/i],
      // Average patterns
      ps_diakreditasi_avg: [
        /^.*ps.*diakreditasi.*rata.*rata.*$/i,
        /^.*yang.*diakreditasi.*rata.*rata.*$/i,
        /^.*rata.*rata.*ps.*diakreditasi.*$/i,
      ],
      ps_lain_avg: [
        /^.*ps.*lain.*rata.*rata.*$/i,
        /^.*lain.*rata.*rata.*$/i,
        /^.*rata.*rata.*ps.*lain.*$/i,
      ],
      total_average: [
        /^.*rata.*rata.*jumlah.*$/i,
        /^.*jumlah.*rata.*rata.*$/i,
        /^.*rata.*rata.*semua.*$/i,
        /^.*total.*rata.*rata.*$/i,
        /^.*rata.*rata.*total.*$/i,
      ],
    }

    // ✅ Find fields using patterns dengan prioritas
    for (const [fieldType, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        const matchedField = fields.find((field) => regex.test(field))

        if (matchedField) {
          fieldMapping[fieldType] = matchedField
          break // Gunakan yang pertama ditemukan
        }
      }
    }

    // ✅ Fallback ke default names jika tidak ditemukan
    const result = {
      nama_dosen: fieldMapping.nama_dosen || "nama_dosen",
      // TS-2
      ps_diakreditasi_ts2:
        fieldMapping.ps_diakreditasi_ts2 || "ps_yang_diakreditasi_ts_2",
      ps_lain_ts2: fieldMapping.ps_lain_ts2 || "ps_lain_di_pt_ts_2",
      sk_ts2: fieldMapping.sk_ts2 || "nomor_sk_ts_2",
      // TS-1
      ps_diakreditasi_ts1:
        fieldMapping.ps_diakreditasi_ts1 || "ps_yang_diakreditasi_ts_1",
      ps_lain_ts1: fieldMapping.ps_lain_ts1 || "ps_lain_di_pt_ts_1",
      sk_ts1: fieldMapping.sk_ts1 || "nomor_sk_ts_1",
      // TS
      ps_diakreditasi_ts:
        fieldMapping.ps_diakreditasi_ts || "ps_yang_diakreditasi_ts",
      ps_lain_ts: fieldMapping.ps_lain_ts || "ps_lain_di_pt_ts",
      sk_ts: fieldMapping.sk_ts || "nomor_sk_ts",
      // Averages
      ps_diakreditasi_avg:
        fieldMapping.ps_diakreditasi_avg || "rata_rata_ps_yang_diakreditasi",
      ps_lain_avg: fieldMapping.ps_lain_avg || "rata_rata_ps_lain_di_pt",
      total_average:
        fieldMapping.total_average ||
        "rata_rata_jumlah_bimbingan_pada_semua_program",
    }

    console.log("Field mapping result:", result)
    console.log("Field existence check:", {
      nama_dosen: item.hasOwnProperty(result.nama_dosen),
      ps_diakreditasi_ts2: item.hasOwnProperty(result.ps_diakreditasi_ts2),
      ps_diakreditasi_avg: item.hasOwnProperty(result.ps_diakreditasi_avg),
      total_average: item.hasOwnProperty(result.total_average),
    })

    return result
  }

  // ✅ Enhanced Dynamic row recalculation
  recalculateRow(row) {
    const fields = this.getFieldNames(row)
    const updatedRow = { ...row }

    // ✅ Calculate rata-rata PS yang diakreditasi
    const ts2_ps = parseFloat(row[fields.ps_diakreditasi_ts2]) || 0
    const ts1_ps = parseFloat(row[fields.ps_diakreditasi_ts1]) || 0
    const ts_ps = parseFloat(row[fields.ps_diakreditasi_ts]) || 0
    const avg_ps = (ts2_ps + ts1_ps + ts_ps) / 3

    // ✅ Calculate rata-rata PS lain
    const ts2_lain = parseFloat(row[fields.ps_lain_ts2]) || 0
    const ts1_lain = parseFloat(row[fields.ps_lain_ts1]) || 0
    const ts_lain = parseFloat(row[fields.ps_lain_ts]) || 0
    const avg_lain = (ts2_lain + ts1_lain + ts_lain) / 3

    // ✅ Calculate total average
    const total_avg = (avg_ps + avg_lain) / 2

    // Update calculated fields
    updatedRow[fields.ps_diakreditasi_avg] = parseFloat(avg_ps.toFixed(2))
    updatedRow[fields.ps_lain_avg] = parseFloat(avg_lain.toFixed(2))
    updatedRow[fields.total_average] = parseFloat(total_avg.toFixed(2))

    console.log(`Recalculating row:`, {
      fields,
      values: {
        ps_values: { ts2_ps, ts1_ps, ts_ps, avg_ps },
        lain_values: { ts2_lain, ts1_lain, ts_lain, avg_lain },
        total_avg,
      },
      before: {
        ps_avg: row[fields.ps_diakreditasi_avg],
        lain_avg: row[fields.ps_lain_avg],
        total: row[fields.total_average],
      },
      after: {
        ps_avg: updatedRow[fields.ps_diakreditasi_avg],
        lain_avg: updatedRow[fields.ps_lain_avg],
        total: updatedRow[fields.total_average],
      },
    })

    return updatedRow
  }

  // ✅ Dynamic normalization dengan recalculation
  normalizeData(data) {
    if (!Array.isArray(data)) return []

    const normalizedData = data.map((item, index) => {
      const result = {
        ...item,
        id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        no: index + 1,
      }

      const fields = this.getFieldNames(result)

      // Convert numeric fields
      const numericFields = [
        fields.ps_diakreditasi_ts2,
        fields.ps_diakreditasi_ts1,
        fields.ps_diakreditasi_ts,
        fields.ps_lain_ts2,
        fields.ps_lain_ts1,
        fields.ps_lain_ts,
      ]

      numericFields.forEach((field) => {
        if (field && result[field] !== undefined) {
          result[field] = parseFloat(result[field]) || 0
        }
      })

      return result
    })

    // ✅ Recalculate semua rows setelah normalization
    return normalizedData.map((row) => this.recalculateRow(row))
  }

  // ✅ Dynamic validation dengan auto-correction
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fields = this.getFieldNames(item)

      // Check required fields
      if (
        !item[fields.nama_dosen] ||
        String(item[fields.nama_dosen]).trim() === ""
      ) {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }

      // Validate numeric fields
      const numericFields = [
        { field: fields.ps_diakreditasi_ts2, label: "PS Diakreditasi TS-2" },
        { field: fields.ps_diakreditasi_ts1, label: "PS Diakreditasi TS-1" },
        { field: fields.ps_diakreditasi_ts, label: "PS Diakreditasi TS" },
        { field: fields.ps_lain_ts2, label: "PS Lain TS-2" },
        { field: fields.ps_lain_ts1, label: "PS Lain TS-1" },
        { field: fields.ps_lain_ts, label: "PS Lain TS" },
      ]

      numericFields.forEach(({ field, label }) => {
        if (field && item[field] !== undefined) {
          const num = parseFloat(item[field])
          if (isNaN(num) || num < 0) {
            errors.push(`Row ${index + 1}: ${label} harus berupa angka >= 0`)
          }
        }
      })

      // ✅ Auto-recalculate averages if needed
      const ts2_ps = parseFloat(item[fields.ps_diakreditasi_ts2]) || 0
      const ts1_ps = parseFloat(item[fields.ps_diakreditasi_ts1]) || 0
      const ts_ps = parseFloat(item[fields.ps_diakreditasi_ts]) || 0
      const expectedAvgPS = (ts2_ps + ts1_ps + ts_ps) / 3

      const ts2_lain = parseFloat(item[fields.ps_lain_ts2]) || 0
      const ts1_lain = parseFloat(item[fields.ps_lain_ts1]) || 0
      const ts_lain = parseFloat(item[fields.ps_lain_ts]) || 0
      const expectedAvgLain = (ts2_lain + ts1_lain + ts_lain) / 3

      const expectedTotal = expectedAvgPS + expectedAvgLain

      const actualAvgPS = parseFloat(item[fields.ps_diakreditasi_avg]) || 0
      const actualAvgLain = parseFloat(item[fields.ps_lain_avg]) || 0
      const actualTotal = parseFloat(item[fields.total_average]) || 0

      // Auto-correct if differences found
      if (Math.abs(expectedAvgPS - actualAvgPS) > 0.01) {
        console.log(
          `Row ${
            index + 1
          }: Auto-correcting PS average from ${actualAvgPS} to ${expectedAvgPS.toFixed(
            2
          )}`
        )
        item[fields.ps_diakreditasi_avg] = parseFloat(expectedAvgPS.toFixed(2))
      }

      if (Math.abs(expectedAvgLain - actualAvgLain) > 0.01) {
        console.log(
          `Row ${
            index + 1
          }: Auto-correcting PS Lain average from ${actualAvgLain} to ${expectedAvgLain.toFixed(
            2
          )}`
        )
        item[fields.ps_lain_avg] = parseFloat(expectedAvgLain.toFixed(2))
      }

      if (Math.abs(expectedTotal - actualTotal) > 0.01) {
        console.log(
          `Row ${
            index + 1
          }: Auto-correcting total average from ${actualTotal} to ${expectedTotal.toFixed(
            2
          )}`
        )
        item[fields.total_average] = parseFloat(expectedTotal.toFixed(2))
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ✅ Helper method
  findFieldByPattern(item, patterns) {
    const fields = Object.keys(item)

    for (const pattern of patterns) {
      const field = fields.find((f) =>
        f.toLowerCase().includes(pattern.toLowerCase())
      )
      if (field) return field
    }

    return null
  }
}

export const dosenPembimbingTugasAkhirPlugin =
  new DosenPembimbingTugasAkhirPlugin()
export default dosenPembimbingTugasAkhirPlugin
