import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class DataTenagaKependidikanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3c",
      name: "Data Tenaga Kependidikan",
      description: "Plugin for processing Data Tenaga Kependidikan",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isTenagaKependidikanSection: true,
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

    return result
  }

  // Map field names dynamically based on available columns in the data
  mapTenagaKependidikanFields(sampleItem) {
    return {
      unit_kerja: this.findFieldByPattern(sampleItem, [
        "unit_kerja",
        "unit",
        "kerja",
      ]),
      pendidikan_s3: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_s3",
        "s3",
      ]),
      pendidikan_s2: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_s2",
        "s2",
      ]),
      pendidikan_s1: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_s1",
        "s1",
      ]),
      pendidikan_d4: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_d4",
        "d4",
      ]),
      pendidikan_d3: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_d3",
        "d3",
      ]),
      pendidikan_d2: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_d2",
        "d2",
        "jumlah_tenaga_kependidikan_dengan_pendidikan_terakhir_d2",
      ]),
      pendidikan_d1: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_d1",
        "d1",
        "jumlah_tenaga_kependidikan_dengan_pendidikan_terakhir_d1",
      ]),
      pendidikan_sma_smk: this.findFieldByPattern(sampleItem, [
        "pendidikan_terakhir_sma_smk",
        "sma",
        "smk",
        "jumlah_tenaga_kependidikan_dengan_pendidikan_terakhir_sma_smk",
      ]),
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapTenagaKependidikanFields(result)

      Object.entries(fieldMap).forEach(([key, fieldName]) => {
        if (fieldName && result[fieldName] !== undefined) {
          if (key === "unit_kerja") {
            result[fieldName] = PluginUtils.normalizeTextField(
              result[fieldName]
            )
          } else if (key.startsWith("pendidikan_")) {
            // Convert to numeric if it's a string representing a number
            if (typeof result[fieldName] === "string") {
              const numValue = parseInt(result[fieldName].trim(), 10)
              result[fieldName] = isNaN(numValue) ? 0 : numValue
            } else if (typeof result[fieldName] !== "number") {
              result[fieldName] = 0
            }
          }
        }
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      const fieldMap = this.mapTenagaKependidikanFields(item)

      // Unit kerja harus diisi
      if (fieldMap.unit_kerja && !item[fieldMap.unit_kerja]) {
        errors.push(`Baris ${index + 1}: Unit Kerja harus diisi.`)
      }

      // Setidaknya salah satu kolom pendidikan harus memiliki nilai
      const hasPendidikanValue = Object.entries(fieldMap)
        .filter(([key]) => key.startsWith("pendidikan_"))
        .some(([_, fieldName]) => {
          return (
            fieldName &&
            ((typeof item[fieldName] === "number" && item[fieldName] > 0) ||
              (typeof item[fieldName] === "string" &&
                item[fieldName].trim() !== ""))
          )
        })

      if (!hasPendidikanValue) {
        errors.push(
          `Baris ${
            index + 1
          }: Setidaknya satu kolom jumlah tenaga kependidikan harus diisi untuk unit kerja ${
            item[fieldMap.unit_kerja] || "ini"
          }.`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Helper method to find field by pattern
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

export const dataTenagaKependidikanPlugin = new DataTenagaKependidikanPlugin()
export default dataTenagaKependidikanPlugin
