import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PengakuanRekognisiDtpsPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b1",
      name: "Pengakuan/Rekognisi DTPS",
      description: "Plugin for processing rekognisi",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPengakuanRekognisiDtps: true,
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

  // ✅ Override field type detection - HAPUS boolean untuk tingkat
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Year field
    if (fieldLower.includes("tahun")) {
      return "text"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapRekognisiFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, ["nama_dosen", "nama"]),
      bidang_keahlian: this.findFieldByPattern(sampleItem, [
        "bidang_keahlian",
        "keahlian",
        "bidang",
      ]),
      rekognisi: this.findFieldByPattern(sampleItem, [
        "rekognisi",
        "pengakuan",
      ]),
      bukti_pendukung: this.findFieldByPattern(sampleItem, [
        "bukti_pendukung",
        "bukti",
      ]),
      tingkat_wilayah: this.findFieldByPattern(sampleItem, [
        "tingkat_wilayah",
        "wilayah",
      ]),
      tingkat_nasional: this.findFieldByPattern(sampleItem, [
        "tingkat_nasional",
        "nasional",
      ]),
      tingkat_internasional: this.findFieldByPattern(sampleItem, [
        "tingkat_internasional",
        "internasional",
      ]),
      tahun: this.findFieldByPattern(sampleItem, ["tahun", "year"]),
    }
  }

  // ✅ Dynamic validation - HAPUS validasi tingkat
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fieldMap = this.mapRekognisiFields(item)

      // Check required fields - HANYA field wajib saja
      const requiredFields = [
        { field: fieldMap.nama_dosen, name: "Nama dosen" },
        { field: fieldMap.bidang_keahlian, name: "Bidang keahlian" },
        { field: fieldMap.rekognisi, name: "Rekognisi" },
        { field: fieldMap.bukti_pendukung, name: "Bukti pendukung" },
        { field: fieldMap.tahun, name: "Tahun" },
      ]

      requiredFields.forEach(({ field, name }) => {
        if (field && !item[field]?.trim()) {
          errors.push(`Row ${index + 1}: ${name} harus diisi`)
        }
      })

      // ✅ HAPUS: Validasi tingkat - biarkan field tingkat apa adanya
      // Field tingkat tidak perlu divalidasi, user bisa isi atau tidak

      // Validate year format
      if (fieldMap.tahun) {
        const year = item[fieldMap.tahun]?.trim()
        if (year && !/^\d{4}$/.test(year)) {
          errors.push(`Row ${index + 1}: Format tahun harus YYYY (4 digit)`)
        }

        // Validate year range (last 3 years)
        if (year && /^\d{4}$/.test(year)) {
          const currentYear = new Date().getFullYear()
          const yearValue = parseInt(year)
          if (yearValue < currentYear - 2 || yearValue > currentYear) {
            errors.push(
              `Row ${index + 1}: Tahun harus dalam rentang 3 tahun terakhir (${
                currentYear - 2
              } - ${currentYear})`
            )
          }
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapRekognisiFields(result)

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

export const pengakuanRekognisiDtpsPlugin = new PengakuanRekognisiDtpsPlugin()
export default pengakuanRekognisiDtpsPlugin
