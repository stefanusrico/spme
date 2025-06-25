import { BasePlugin } from "../../core/BasePlugin.js"

export class DataPrasaranaUPPSPlugin extends BasePlugin {
  constructor() {
    super({
      code: "4c",
      name: "Data Prasarana UPPS Plugin",
      description: "Plugin untuk mendata prasarana di UPPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDataPrasaranaUPPSSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  // ✅ Use dynamic base processing
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    return super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )
  }

  // ✅ Override field type detection - ubah ke boolean
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Numeric fields
    if (
      fieldLower.includes("jumlah") ||
      fieldLower.includes("luas") ||
      fieldLower.includes("unit")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Override field processing untuk field boolean
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "boolean") {
      return this.processCheckboxValue(value)
    }

    return super.processFieldValue(fieldName, value, fieldType)
  }

  // ✅ Helper method untuk memproses nilai checkbox menjadi boolean
  processCheckboxValue(val) {
    // Handle already boolean values
    if (typeof val === "boolean") {
      return val
    }

    // Handle numeric values
    if (typeof val === "number") {
      return val > 0
    }

    // Handle string values
    if (typeof val === "string") {
      const cleaned = val.trim().toLowerCase()

      // True values
      if (
        [
          "v",
          "✔",
          "✓",
          "check",
          "ada",
          "terawat",
          "sendiri",
          "sewa",
          "yes",
          "ya",
          "y",
          "true",
          "1",
          "milik",
        ].includes(cleaned)
      ) {
        return true
      }

      // False values
      if (
        [
          "x",
          "tidak",
          "tidak_ada",
          "tidak_terawat",
          "no",
          "n",
          "false",
          "0",
          "",
        ].includes(cleaned)
      ) {
        return false
      }

      // If it's a non-empty string that doesn't match our patterns
      return cleaned !== ""
    }

    // Default - falsy values return false
    return Boolean(val)
  }

  // ✅ Dynamic normalization untuk memastikan konversi tipe data
  normalizeData(data) {
    if (!Array.isArray(data)) return []

    return data.map((item) => {
      const result = { ...item }

      // Process each field dynamically
      Object.keys(result).forEach((field) => {
        const fieldType = this.detectFieldType(field, result[field])
        result[field] = this.processFieldValue(field, result[field], fieldType)
      })

      return result
    })
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      // Find facility name field dynamically
      const facilityNameField = this.findFieldByPattern(item, [
        "nama_prasarana",
        "prasarana",
        "nama_fasilitas",
        "fasilitas",
      ])

      if (facilityNameField && !item[facilityNameField]) {
        errors.push(`Baris ${index + 1}: Nama prasarana harus diisi`)
      }

      // Find function field
      const functionField = this.findFieldByPattern(item, [
        "fungsi",
        "kegunaan",
      ])

      if (functionField && !item[functionField]) {
        errors.push(`Baris ${index + 1}: Fungsi harus diisi`)
      }

      // Validate numeric fields
      const numericFields = this.findFieldsByPatterns(item, {
        jumlah_unit: ["jumlah_unit", "jumlah", "unit"],
        total_luas: ["total_luas", "luas", "area"],
      })

      Object.entries(numericFields).forEach(([key, fieldName]) => {
        if (fieldName && item[fieldName] !== undefined) {
          const value = parseFloat(item[fieldName])
          if (isNaN(value) || value < 0) {
            errors.push(
              `Baris ${
                index + 1
              }: ${fieldName} harus berupa angka yang valid (≥ 0)`
            )
          }
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ✅ Helper methods
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

  findFieldsByPatterns(item, patternGroups) {
    const result = {}

    Object.entries(patternGroups).forEach(([key, patterns]) => {
      result[key] = this.findFieldByPattern(item, patterns)
    })

    return result
  }
}

export const dataPrasaranaUPPSPlugin = new DataPrasaranaUPPSPlugin()
export default dataPrasaranaUPPSPlugin
