import { BasePlugin } from "../../core/BasePlugin.js"

export class BebanTotalPaket20SKSPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5b1",
      name: "Beban Total Paket 20 SKS Plugin",
      description:
        "Plugin for processing research integration data in learning",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isBebanTotalPaket20SKSSection: true,
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

  // ✅ Override field type detection
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Numeric fields
    if (
      fieldLower.includes("semester") ||
      fieldLower.includes("sks") ||
      fieldLower.includes("beban")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapBeban20SKSFields(sampleItem) {
    return {
      kode_mata_kuliah: this.findFieldByPattern(sampleItem, [
        "kode_mata_kuliah",
        "kode",
        "mata_kuliah",
      ]),
      nama_mata_kuliah: this.findFieldByPattern(sampleItem, [
        "nama_mata_kuliah",
        "nama",
      ]),
      posisi_semester: this.findFieldByPattern(sampleItem, [
        "posisi_semester",
        "semester",
        "kurikulum",
      ]),
      beban_sks: this.findFieldByPattern(sampleItem, [
        "beban_sks",
        "beban",
        "sks",
      ]),
      jenis_kegiatan_mbkm: this.findFieldByPattern(sampleItem, [
        "jenis_kegiatan",
        "kegiatan",
        "mbkm",
        "disetarakan",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapBeban20SKSFields(result)

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
      const fieldMap = this.mapBeban20SKSFields(item)

      if (fieldMap.nama_mata_kuliah && !item[fieldMap.nama_mata_kuliah]) {
        errors.push(`Row ${index + 1}: Nama mata kuliah harus diisi`)
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

export const bebanTotalPaket20SKSPlugin = new BebanTotalPaket20SKSPlugin()
export default bebanTotalPaket20SKSPlugin
