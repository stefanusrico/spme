import { BasePlugin } from "../../core/BasePlugin.js"

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
    return true
  }

  // ✅ Helper method untuk parse input ke number
  parseToNumber(value) {
    if (typeof value === "number") {
      return value
    }

    if (!value) {
      return 0
    }

    if (typeof value === "string") {
      // Remove Rp, currency symbols, dots, commas, and spaces
      const cleanString = value
        .replace(/Rp\s?/gi, "")
        .replace(/[.,\s]/g, "")
        .replace(/[^\d]/g, "")

      return parseFloat(cleanString) || 0
    }

    return parseFloat(value) || 0
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

    // ✅ Currency/budget fields - update detection
    if (
      fieldLower.includes("rupiah") ||
      fieldLower.includes("ts_2") ||
      fieldLower.includes("ts_1") ||
      fieldLower.includes("ts") ||
      fieldLower.includes("rata_rata") ||
      fieldLower.includes("dana") ||
      fieldLower.includes("biaya") ||
      fieldLower.includes("upps") ||
      fieldLower.includes("program_studi")
    ) {
      return "currency"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Override processFieldValue untuk handle currency parsing
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "currency") {
      // Parse ke numeric value untuk internal processing
      return this.parseToNumber(value)
    }

    return super.processFieldValue(fieldName, value, fieldType)
  }

  getFieldNames(item) {
    const fields = Object.keys(item)

    // ✅ Explicit field detection berdasarkan nama field yang sebenarnya
    let jenis_penggunaan = "jenis_penggunaan"
    let upps_ts2 = "unit_pengelola_program_studi_rupiah_ts_2"
    let upps_ts1 = "unit_pengelola_program_studi_rupiah_ts_1"
    let upps_ts = "unit_pengelola_program_studi_rupiah_ts"
    let upps_rata_rata = "unit_pengelola_program_studi_rupiah_rata_rata"
    let ps_ts2 = "program_studi_rupiah_ts_2"
    let ps_ts1 = "program_studi_rupiah_ts_1"
    let ps_ts = "program_studi_rupiah_ts"
    let ps_rata_rata = "program_studi_rupiah_rata_rata"

    // Cari field yang ada di data dengan pattern yang lebih spesifik
    for (const field of fields) {
      const lower = field.toLowerCase()

      // Jenis penggunaan
      if (lower.includes("jenis") && lower.includes("penggunaan")) {
        jenis_penggunaan = field
      }
      // ✅ UPPS/Unit Pengelola TS-2
      else if (
        (lower.includes("unit") || lower.includes("pengelola")) &&
        lower.includes("rupiah") &&
        (lower.includes("ts_2") || lower.includes("ts-2"))
      ) {
        upps_ts2 = field
      }
      // ✅ UPPS/Unit Pengelola TS-1
      else if (
        (lower.includes("unit") || lower.includes("pengelola")) &&
        lower.includes("rupiah") &&
        (lower.includes("ts_1") || lower.includes("ts-1"))
      ) {
        upps_ts1 = field
      }
      // ✅ UPPS/Unit Pengelola TS (bukan ts_1 atau ts_2)
      else if (
        (lower.includes("unit") || lower.includes("pengelola")) &&
        lower.includes("rupiah") &&
        lower.includes("ts") &&
        !lower.includes("ts_1") &&
        !lower.includes("ts_2") &&
        !lower.includes("ts-1") &&
        !lower.includes("ts-2") &&
        !lower.includes("rata") &&
        !lower.includes("program_studi") // ✅ Pastikan bukan field program studi
      ) {
        upps_ts = field
      }
      // ✅ UPPS/Unit Pengelola rata-rata
      else if (
        (lower.includes("unit") || lower.includes("pengelola")) &&
        lower.includes("rupiah") &&
        lower.includes("rata") &&
        !lower.includes("program_studi") // ✅ Pastikan bukan field program studi
      ) {
        upps_rata_rata = field
      }
      // ✅ Program Studi TS-2
      else if (
        lower.includes("program_studi") &&
        lower.includes("rupiah") &&
        (lower.includes("ts_2") || lower.includes("ts-2"))
      ) {
        ps_ts2 = field
      }
      // ✅ Program Studi TS-1
      else if (
        lower.includes("program_studi") &&
        lower.includes("rupiah") &&
        (lower.includes("ts_1") || lower.includes("ts-1"))
      ) {
        ps_ts1 = field
      }
      // ✅ Program Studi TS (bukan ts_1 atau ts_2)
      else if (
        lower.includes("program_studi") &&
        lower.includes("rupiah") &&
        lower.includes("ts") &&
        !lower.includes("ts_1") &&
        !lower.includes("ts_2") &&
        !lower.includes("ts-1") &&
        !lower.includes("ts-2") &&
        !lower.includes("rata")
      ) {
        ps_ts = field
      }
      // ✅ Program Studi rata-rata
      else if (
        lower.includes("program_studi") &&
        lower.includes("rupiah") &&
        lower.includes("rata")
      ) {
        ps_rata_rata = field
      }
    }

    const result = {
      jenis_penggunaan,
      upps_ts2,
      upps_ts1,
      upps_ts,
      upps_rata_rata,
      ps_ts2,
      ps_ts1,
      ps_ts,
      ps_rata_rata,
    }

    return result
  }

  // ✅ Enhanced Dynamic row recalculation (TANPA formatting)
  recalculateRow(row) {
    const fields = this.getFieldNames(row)
    const updatedRow = { ...row }

    // ✅ Parse values ke numeric
    const upps_ts2 = this.parseToNumber(row[fields.upps_ts2])
    const upps_ts1 = this.parseToNumber(row[fields.upps_ts1])
    const upps_ts = this.parseToNumber(row[fields.upps_ts])
    const upps_avg = (upps_ts2 + upps_ts1 + upps_ts) / 3

    // ✅ Calculate Program Studi rata-rata
    const ps_ts2 = this.parseToNumber(row[fields.ps_ts2])
    const ps_ts1 = this.parseToNumber(row[fields.ps_ts1])
    const ps_ts = this.parseToNumber(row[fields.ps_ts])
    const ps_avg = (ps_ts2 + ps_ts1 + ps_ts) / 3

    // ✅ Update calculated fields dengan nilai numeric (TIDAK di-format)
    updatedRow[fields.upps_rata_rata] = parseFloat(upps_avg.toFixed(2))
    updatedRow[fields.ps_rata_rata] = parseFloat(ps_avg.toFixed(2))

    return updatedRow
  }

  // ✅ Method untuk mengambil data raw (tanpa formatting) untuk dikirim ke backend
  getRawDataForSave(data) {
    if (!Array.isArray(data)) return data

    return data.map((row) => {
      const fields = this.getFieldNames(row)
      const rawRow = { ...row }

      // ✅ Pastikan semua field currency dalam format numeric
      const currencyFields = [
        fields.upps_ts2,
        fields.upps_ts1,
        fields.upps_ts,
        fields.upps_rata_rata,
        fields.ps_ts2,
        fields.ps_ts1,
        fields.ps_ts,
        fields.ps_rata_rata,
      ]

      currencyFields.forEach((field) => {
        if (field && rawRow[field] !== undefined) {
          rawRow[field] = this.parseToNumber(rawRow[field])
        }
      })

      return rawRow
    })
  }

  // ✅ Dynamic normalization
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

      // ✅ Convert currency fields ke numeric
      const currencyFields = [
        fields.upps_ts2,
        fields.upps_ts1,
        fields.upps_ts,
        fields.ps_ts2,
        fields.ps_ts1,
        fields.ps_ts,
      ]

      currencyFields.forEach((field) => {
        if (field && result[field] !== undefined) {
          result[field] = this.parseToNumber(result[field])
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
        fields.jenis_penggunaan &&
        (!item[fields.jenis_penggunaan] ||
          String(item[fields.jenis_penggunaan]).trim() === "")
      ) {
        errors.push(`Row ${index + 1}: Jenis Penggunaan harus diisi`)
      }

      // Validate numeric fields
      const numericFields = [
        { field: fields.upps_ts2, label: "UPPS TS-2" },
        { field: fields.upps_ts1, label: "UPPS TS-1" },
        { field: fields.upps_ts, label: "UPPS TS" },
        { field: fields.ps_ts2, label: "Program Studi TS-2" },
        { field: fields.ps_ts1, label: "Program Studi TS-1" },
        { field: fields.ps_ts, label: "Program Studi TS" },
      ]

      numericFields.forEach(({ field, label }) => {
        if (field && item[field] !== undefined) {
          const num = this.parseToNumber(item[field])
          if (isNaN(num) || num < 0) {
            errors.push(`Row ${index + 1}: ${label} harus berupa angka >= 0`)
          }
        }
      })

      // ✅ Auto-recalculate averages if needed
      const upps_ts2 = this.parseToNumber(item[fields.upps_ts2])
      const upps_ts1 = this.parseToNumber(item[fields.upps_ts1])
      const upps_ts = this.parseToNumber(item[fields.upps_ts])
      const expectedUppsAvg = (upps_ts2 + upps_ts1 + upps_ts) / 3

      const ps_ts2 = this.parseToNumber(item[fields.ps_ts2])
      const ps_ts1 = this.parseToNumber(item[fields.ps_ts1])
      const ps_ts = this.parseToNumber(item[fields.ps_ts])
      const expectedPsAvg = (ps_ts2 + ps_ts1 + ps_ts) / 3

      const actualUppsAvg = this.parseToNumber(item[fields.upps_rata_rata])
      const actualPsAvg = this.parseToNumber(item[fields.ps_rata_rata])

      // ✅ Auto-correct if differences found
      if (Math.abs(expectedUppsAvg - actualUppsAvg) > 0.01) {
        console.log(
          `Row ${
            index + 1
          }: Auto-correcting UPPS average from ${actualUppsAvg} to ${expectedUppsAvg}`
        )
        item[fields.upps_rata_rata] = parseFloat(expectedUppsAvg.toFixed(2))
      }

      if (Math.abs(expectedPsAvg - actualPsAvg) > 0.01) {
        console.log(
          `Row ${
            index + 1
          }: Auto-correcting PS average from ${actualPsAvg} to ${expectedPsAvg}`
        )
        item[fields.ps_rata_rata] = parseFloat(expectedPsAvg.toFixed(2))
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

export const penggunaanDanaPlugin = new PenggunaanDanaPlugin()
export default penggunaanDanaPlugin
