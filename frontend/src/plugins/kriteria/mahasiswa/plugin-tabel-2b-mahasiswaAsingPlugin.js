import { BasePlugin } from "../../core/BasePlugin.js"

export class MahasiswaAsingPlugin extends BasePlugin {
  constructor() {
    super({
      code: "2b",
      name: "Mahasiswa Asing Plugin",
      description: "Plugin for international student data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isMahasiswaAsingSection: true,
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

    // Number fields for student counts
    if (
      fieldLower.includes("jumlah") ||
      fieldLower.includes("ts_2") ||
      fieldLower.includes("ts_1") ||
      fieldLower.includes("ts") ||
      fieldLower.includes("aktif") ||
      fieldLower.includes("asing") ||
      fieldLower.includes("penuh_waktu") ||
      fieldLower.includes("paruh_waktu")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapStudentFields(sampleItem) {
    const fields = Object.keys(sampleItem)

    return {
      program_studi: this.findFieldByPattern(sampleItem, [
        "program_studi",
        "prodi",
      ]),
      // Active students by period
      ts2_aktif: fields.find((f) => f.includes("ts_2") && f.includes("aktif")),
      ts1_aktif: fields.find((f) => f.includes("ts_1") && f.includes("aktif")),
      ts_aktif: fields.find(
        (f) =>
          f.includes("ts") &&
          f.includes("aktif") &&
          !f.includes("ts_1") &&
          !f.includes("ts_2")
      ),
      // International full-time students
      ts2_asing_full: fields.find(
        (f) =>
          f.includes("ts_2") && f.includes("asing") && f.includes("penuh_waktu")
      ),
      ts1_asing_full: fields.find(
        (f) =>
          f.includes("ts_1") && f.includes("asing") && f.includes("penuh_waktu")
      ),
      ts_asing_full: fields.find(
        (f) =>
          f.includes("ts") &&
          f.includes("asing") &&
          f.includes("penuh_waktu") &&
          !f.includes("ts_1") &&
          !f.includes("ts_2")
      ),
      // International part-time students
      ts2_asing_part: fields.find(
        (f) =>
          f.includes("ts_2") && f.includes("asing") && f.includes("paruh_waktu")
      ),
      ts1_asing_part: fields.find(
        (f) =>
          f.includes("ts_1") && f.includes("asing") && f.includes("paruh_waktu")
      ),
      ts_asing_part: fields.find(
        (f) =>
          f.includes("ts") &&
          f.includes("asing") &&
          f.includes("paruh_waktu") &&
          !f.includes("ts_1") &&
          !f.includes("ts_2")
      ),
    }
  }

  // ✅ Helper methods to find field groups
  findActiveStudentFields(fieldMap) {
    return [fieldMap.ts2_aktif, fieldMap.ts1_aktif, fieldMap.ts_aktif].filter(
      Boolean
    )
  }

  findInternationalStudentFields(fieldMap) {
    return [
      fieldMap.ts2_asing_full,
      fieldMap.ts1_asing_full,
      fieldMap.ts_asing_full,
      fieldMap.ts2_asing_part,
      fieldMap.ts1_asing_part,
      fieldMap.ts_asing_part,
    ].filter(Boolean)
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fieldMap = this.mapStudentFields(item)

      if (fieldMap.program_studi && !item[fieldMap.program_studi]) {
        errors.push(`Row ${index + 1}: Program Studi harus diisi`)
      }

      // Validate numeric fields are not negative
      Object.values(fieldMap).forEach((fieldName) => {
        if (fieldName && fieldName !== fieldMap.program_studi) {
          const value = parseFloat(item[fieldName] || 0)
          if (value < 0) {
            errors.push(
              `Row ${index + 1}: ${fieldName} tidak boleh bernilai negatif`
            )
          }
        }
      })

      // Cross-validation: International students should not exceed active students per period
      const periods = [
        {
          active: fieldMap.ts_aktif,
          full: fieldMap.ts_asing_full,
          part: fieldMap.ts_asing_part,
          label: "TS",
        },
        {
          active: fieldMap.ts1_aktif,
          full: fieldMap.ts1_asing_full,
          part: fieldMap.ts1_asing_part,
          label: "TS-1",
        },
        {
          active: fieldMap.ts2_aktif,
          full: fieldMap.ts2_asing_full,
          part: fieldMap.ts2_asing_part,
          label: "TS-2",
        },
      ]

      periods.forEach((period) => {
        if (period.active && period.full && period.part) {
          const activeStudents = parseFloat(item[period.active] || 0)
          const internationalStudents =
            parseFloat(item[period.full] || 0) +
            parseFloat(item[period.part] || 0)

          if (internationalStudents > activeStudents) {
            errors.push(
              `Row ${
                index + 1
              }: Jumlah mahasiswa asing tidak boleh melebihi jumlah mahasiswa aktif untuk ${
                period.label
              }`
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

export const mahasiswaAsingPlugin = new MahasiswaAsingPlugin()
export default mahasiswaAsingPlugin
