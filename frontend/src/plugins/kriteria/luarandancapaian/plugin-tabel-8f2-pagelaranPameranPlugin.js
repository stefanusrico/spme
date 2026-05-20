import { BasePlugin } from "../../core/BasePlugin.js"
export class PagelaranPameranPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8f2",
      name: "Pagelaran/Pameran Plugin",
      description: "Plugin for exhibition/performance data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPagelaranPameranSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  // ✅ Enhanced processExcelData dengan recalculation
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

  // ✅ Override field type detection
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Number fields
    if (
      fieldLower.includes("jumlah") ||
      fieldLower.includes("ts_2") ||
      fieldLower.includes("ts_1") ||
      fieldLower.includes("ts") ||
      fieldLower.includes("total") ||
      fieldLower.includes("count")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Enhanced Dynamic field mapping berdasarkan data struktur sebenarnya
  getFieldNames(item) {
    const fields = Object.keys(item)
    console.log("Available fields:", fields)

    const fieldMapping = {
      jenis_publikasi: null,
      ts_2_jumlah_judul: null,
      ts_1_jumlah_judul: null,
      ts_jumlah_judul: null,
      jumlah: null,
    }

    // ✅ Pattern-based field detection
    const patterns = {
      jenis_publikasi: [
        /^.*jenis.*publikasi.*$/i,
        /^.*jenis.*$/i,
        /^.*publikasi.*$/i,
        /^.*kategori.*$/i,
        /^.*type.*$/i,
      ],
      ts_2_jumlah_judul: [
        /^.*ts[-_]?2.*jumlah.*judul.*$/i,
        /^.*ts[-_]?2.*jumlah.*$/i,
        /^.*ts[-_]?2.*$/i,
      ],
      ts_1_jumlah_judul: [
        /^.*ts[-_]?1.*jumlah.*judul.*$/i,
        /^.*ts[-_]?1.*jumlah.*$/i,
        /^.*ts[-_]?1.*$/i,
      ],
      ts_jumlah_judul: [
        /^.*ts.*jumlah.*judul.*$/i,
        /^.*ts.*jumlah.*$/i,
        /^.*ts$/i,
      ],
      jumlah: [/^.*jumlah$/i, /^.*total$/i, /^.*sum$/i],
    }

    // ✅ Find fields using patterns dengan prioritas
    for (const [fieldType, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        const matchedField = fields.find((field) => {
          const matches = regex.test(field)

          // ✅ Special validation untuk ts field - pastikan bukan ts_1 atau ts_2
          if (fieldType === "ts_jumlah_judul" && matches) {
            const lower = field.toLowerCase()
            return (
              !lower.includes("ts_1") &&
              !lower.includes("ts-1") &&
              !lower.includes("ts_2") &&
              !lower.includes("ts-2")
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
      jenis_publikasi: fieldMapping.jenis_publikasi || "jenis_publikasi",
      ts_2_jumlah_judul: fieldMapping.ts_2_jumlah_judul || "ts_2_jumlah_judul",
      ts_1_jumlah_judul: fieldMapping.ts_1_jumlah_judul || "ts_1_jumlah_judul",
      ts_jumlah_judul: fieldMapping.ts_jumlah_judul || "ts_jumlah_judul",
      jumlah: fieldMapping.jumlah || "jumlah",
    }

    console.log("Field mapping result:", result)
    console.log("Field existence check:", {
      jenis_publikasi: item.hasOwnProperty(result.jenis_publikasi),
      ts_2_jumlah_judul: item.hasOwnProperty(result.ts_2_jumlah_judul),
      ts_1_jumlah_judul: item.hasOwnProperty(result.ts_1_jumlah_judul),
      ts_jumlah_judul: item.hasOwnProperty(result.ts_jumlah_judul),
      jumlah: item.hasOwnProperty(result.jumlah),
    })

    return result
  }

  // ✅ NEW: Auto-recalculation logic untuk field jumlah
  recalculateRow(row) {
    const fields = this.getFieldNames(row)
    const updatedRow = { ...row }

    // ✅ Calculate jumlah total dari TS-2, TS-1, dan TS
    const ts_2 = parseFloat(row[fields.ts_2_jumlah_judul]) || 0
    const ts_1 = parseFloat(row[fields.ts_1_jumlah_judul]) || 0
    const ts = parseFloat(row[fields.ts_jumlah_judul]) || 0

    const totalJumlah = ts_2 + ts_1 + ts

    // Update calculated field
    updatedRow[fields.jumlah] = totalJumlah

    console.log(`Recalculating row:`, {
      fields,
      values: { ts_2, ts_1, ts, totalJumlah },
      before: { jumlah: row[fields.jumlah] },
      after: { jumlah: updatedRow[fields.jumlah] },
    })

    return updatedRow
  }

  // ✅ Enhanced Dynamic normalization dengan recalculation
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    const normalizedData = data
      .filter((item) => {
        const fields = this.getFieldNames(item)
        if (!item[fields.jenis_publikasi]) return true
        const normalized = String(item[fields.jenis_publikasi])
          .toLowerCase()
          .trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => {
        const result = {
          ...item,
          id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
          key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
          no: index + 1,
        }

        const fields = this.getFieldNames(result)

        // ✅ Convert numeric fields
        const numericFields = [
          fields.ts_2_jumlah_judul,
          fields.ts_1_jumlah_judul,
          fields.ts_jumlah_judul,
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

  // ✅ Enhanced Dynamic validation dengan auto-correction
  validateData(data) {
    const errors = []

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      const fields = this.getFieldNames(item)

      // Validasi field wajib
      if (
        fields.jenis_publikasi &&
        (!item[fields.jenis_publikasi] ||
          String(item[fields.jenis_publikasi]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: Jenis publikasi harus diisi`)
      }

      // Validate numeric fields
      const numericFields = [
        { field: fields.ts_2_jumlah_judul, label: "TS-2 Jumlah Judul" },
        { field: fields.ts_1_jumlah_judul, label: "TS-1 Jumlah Judul" },
        { field: fields.ts_jumlah_judul, label: "TS Jumlah Judul" },
      ]

      numericFields.forEach(({ field, label }) => {
        if (field && item[field] !== undefined) {
          const num = parseFloat(item[field])
          if (isNaN(num) || num < 0) {
            errors.push(`Row ${index + 1}: ${label} harus berupa angka >= 0`)
          }
        }
      })

      // ✅ Auto-recalculate jumlah if needed
      const ts_2 = parseFloat(item[fields.ts_2_jumlah_judul]) || 0
      const ts_1 = parseFloat(item[fields.ts_1_jumlah_judul]) || 0
      const ts = parseFloat(item[fields.ts_jumlah_judul]) || 0
      const expectedJumlah = ts_2 + ts_1 + ts

      const actualJumlah = parseFloat(item[fields.jumlah]) || 0

      // Auto-correct if differences found
      if (Math.abs(expectedJumlah - actualJumlah) > 0.01) {
        console.log(
          `Row ${
            index + 1
          }: Auto-correcting jumlah from ${actualJumlah} to ${expectedJumlah}`
        )
        item[fields.jumlah] = expectedJumlah
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

export const pagelaranPameranPlugin = new PagelaranPameranPlugin()
export default pagelaranPameranPlugin
