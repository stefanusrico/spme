import { BasePlugin } from "../../core/BasePlugin.js"

export class PrasaranaDanPeralatanUtamaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "4b",
      name: "Prasarana dan Peralatan Utama Plugin",
      description: "Plugin untuk mendata prasarana Utama di Laboratorium UPPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPrasaranaDanPeralatanUtamaSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Use parent detection for other fields
    return super.detectFieldType(fieldName, value)
  }

  // ✅ Override field processing for boolean fields
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "boolean") {
      return this.processCheckboxValue(value)
    }

    // For non-boolean fields, use parent method
    return super.processFieldValue(fieldName, value, fieldType)
  }

  // ✅ Helper method for checkbox processing - return boolean instead of string
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

  // ✅ Dynamic normalization
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
      // Find lab name field dynamically
      const labNameField = this.findFieldByPattern(item, [
        "nama_laboratorium",
        "laboratorium",
        "lab",
        "nama_lab",
      ])

      if (labNameField && !item[labNameField]) {
        errors.push(`Baris ${index + 1}: Nama laboratorium harus diisi`)
      }

      // Find equipment name field dynamically
      const equipmentNameField = this.findFieldByPattern(item, [
        "nama_alat_peraga",
        "alat_peraga",
        "nama_alat",
        "peralatan",
      ])

      if (equipmentNameField && !item[equipmentNameField]) {
        errors.push(`Baris ${index + 1}: Nama alat peraga harus diisi`)
      }

      // Validate numeric fields dynamically
      const quantityFields = this.findFieldsByPatterns(item, {
        jumlah_lab: ["jumlah_lab", "jumlah", "lab"],
        standar_minimal: ["standar_minimal", "minimal", "standar"],
        yang_dimiliki: ["yang_dimiliki", "dimiliki", "tersedia"],
      })

      Object.entries(quantityFields).forEach(([key, fieldName]) => {
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

  // Helper method for finding fields by pattern
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

  // Helper method for finding multiple fields
  findFieldsByPatterns(item, patternGroups) {
    const result = {}

    Object.entries(patternGroups).forEach(([key, patterns]) => {
      result[key] = this.findFieldByPattern(item, patterns)
    })

    return result
  }
}

export const prasaranaDanPeralatanUtamaPlugin =
  new PrasaranaDanPeralatanUtamaPlugin()

export default prasaranaDanPeralatanUtamaPlugin
