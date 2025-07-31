import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class MataKuliahBasicSciencePlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a3",
      name: "Mata Kuliah Basic Science dan Matematika Plugin",
      description: "Plugin untuk mata kuliah basic science dan matematika",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isMataKuliahBasicScienceSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()
    return [
      {
        key: `default-1-${now}-${Math.random().toString(36).substr(2, 5)}`,
        no: 1,
        selected: true,
        nama_mata_kuliah_basic_science_dan_matematika: "",
        semester: 0,
        jumlah_sks: 0,
      },
    ]
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

  // ✅ Override field type detection
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Numeric fields
    if (
      fieldLower.includes("semester") ||
      fieldLower.includes("sks") ||
      fieldLower.includes("jumlah")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapBasicScienceFields(sampleItem) {
    return {
      nama_mata_kuliah: this.findFieldByPattern(sampleItem, [
        "nama_mata_kuliah",
        "basic_science",
        "matematika",
        "nama",
      ]),
      semester: this.findFieldByPattern(sampleItem, ["semester"]),
      jumlah_sks: this.findFieldByPattern(sampleItem, [
        "jumlah_sks",
        "sks",
        "jumlah",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        const fieldMap = this.mapBasicScienceFields(item)
        if (!item[fieldMap.nama_mata_kuliah]) return true
        const normalized = String(item[fieldMap.nama_mata_kuliah])
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

        const fieldMap = this.mapBasicScienceFields(result)

        Object.entries(fieldMap).forEach(([key, fieldName]) => {
          if (fieldName && result[fieldName] !== undefined) {
            const fieldType = this.detectFieldType(fieldName, result[fieldName])
            result[fieldName] = this.processFieldValue(
              fieldName,
              result[fieldName],
              fieldType
            )
          }
        })

        return result
      })
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fieldMap = this.mapBasicScienceFields(item)

      if (fieldMap.nama_mata_kuliah && !item[fieldMap.nama_mata_kuliah]) {
        errors.push(
          `Baris ${index + 1}: Nama Mata Kuliah Basic Science wajib diisi`
        )
      }

      if (fieldMap.semester) {
        const semester = PluginUtils.parseNumber(item[fieldMap.semester], 0)
        if (semester < 1 || semester > 8) {
          errors.push(
            `Baris ${index + 1}: Semester harus antara 1-8, nilai: ${semester}`
          )
        }
      }

      if (fieldMap.jumlah_sks) {
        const sks = PluginUtils.parseNumber(item[fieldMap.jumlah_sks], 0)
        if (sks < 0 || sks > 6) {
          errors.push(
            `Baris ${index + 1}: Jumlah SKS harus antara 0-6, nilai: ${sks}`
          )
        }
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

export const mataKuliahBasicSciencePlugin = new MataKuliahBasicSciencePlugin()
export default mataKuliahBasicSciencePlugin
