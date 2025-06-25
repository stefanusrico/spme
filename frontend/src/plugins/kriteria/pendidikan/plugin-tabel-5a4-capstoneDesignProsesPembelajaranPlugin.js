import { BasePlugin } from "../../core/BasePlugin.js"

export class CapstoneDesignProsesPembelajaranPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a4",
      name: "Capstone Design Proses Pembelajaran Plugin",
      description:
        "Plugin untuk tracking capstone design dalam proses pembelajaran",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isCapstoneDesignSection: true,
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

    // Boolean fields for aspects
    if (
      fieldLower.includes("aspek_1") ||
      fieldLower.includes("aspek_2") ||
      fieldLower.includes("aspek_3") ||
      fieldLower.includes("aspek_4") ||
      fieldLower.includes("aspek")
    ) {
      return "boolean"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapCapstoneFields(sampleItem) {
    return {
      nama_mata_kuliah: this.findFieldByPattern(sampleItem, [
        "nama_mata_kuliah",
        "mata_kuliah",
        "nama",
      ]),
      semester: this.findFieldByPattern(sampleItem, ["semester"]),
      cakupan_bahasan: this.findFieldByPattern(sampleItem, [
        "cakupan_bahasan",
        "cakupan",
        "bahasan",
      ]),
      aspek_1: this.findFieldByPattern(sampleItem, ["aspek_1", "aspek 1"]),
      aspek_2: this.findFieldByPattern(sampleItem, ["aspek_2", "aspek 2"]),
      aspek_3: this.findFieldByPattern(sampleItem, ["aspek_3", "aspek 3"]),
      aspek_4: this.findFieldByPattern(sampleItem, ["aspek_4", "aspek 4"]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapCapstoneFields(result)

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
      const fieldMap = this.mapCapstoneFields(item)

      if (fieldMap.nama_mata_kuliah && !item[fieldMap.nama_mata_kuliah]) {
        errors.push(`Row ${index + 1}: Nama Mata Kuliah wajib diisi`)
      }

      if (fieldMap.semester && !item[fieldMap.semester]) {
        errors.push(`Row ${index + 1}: Semester wajib diisi`)
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

export const capstoneDesignProsesPembelajaranPlugin =
  new CapstoneDesignProsesPembelajaranPlugin()
export default capstoneDesignProsesPembelajaranPlugin
