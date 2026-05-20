import { BasePlugin } from "../../core/BasePlugin.js"

export class BebanTotalPaket40SKSPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5b2",
      name: "Beban Total Paket MBKM Plugin",
      description: "Plugin untuk mentrack beban total paket kegiatan MBKM",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isBebanTotalPaketSection: true,
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
  mapBebanPaketFields(sampleItem) {
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
      const fieldMap = this.mapBebanPaketFields(result)

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
      const fieldMap = this.mapBebanPaketFields(item)

      const requiredFields = [
        { field: fieldMap.kode_mata_kuliah, name: "Kode MK" },
        { field: fieldMap.nama_mata_kuliah, name: "Nama MK" },
        { field: fieldMap.jenis_kegiatan_mbkm, name: "Jenis Kegiatan" },
      ]

      requiredFields.forEach(({ field, name }) => {
        if (field && (!item[field] || !item[field].toString().trim())) {
          errors.push(`Row ${index + 1}: ${name} wajib diisi`)
        }
      })
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

export const bebanTotalPaket40SKSPlugin = new BebanTotalPaket40SKSPlugin()
export default bebanTotalPaket40SKSPlugin
