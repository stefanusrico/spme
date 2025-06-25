import { BasePlugin } from "../../core/BasePlugin.js"

export class MasaStudiLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8c",
      name: "Masa Studi Lulusan Plugin",
      description:
        "Plugin untuk mendata masa studi lulusan dari tabel 8.c LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isMasaStudiLulusanSection: true,
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
      fieldLower.includes("jumlah") ||
      fieldLower.includes("mhs") ||
      fieldLower.includes("ts") ||
      fieldLower.includes("lulusan")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapMasaStudiFields(sampleItem) {
    return {
      tahun_masuk: this.findFieldByPattern(sampleItem, [
        "tahun_masuk",
        "tahun",
      ]),
      jumlah_mhs_ts6: this.findFieldByPattern(sampleItem, ["ts6", "ts-6"]),
      jumlah_mhs_ts5: this.findFieldByPattern(sampleItem, ["ts5", "ts-5"]),
      jumlah_mhs_ts4: this.findFieldByPattern(sampleItem, ["ts4", "ts-4"]),
      jumlah_mhs_ts3: this.findFieldByPattern(sampleItem, ["ts3", "ts-3"]),
      jumlah_mhs_ts2: this.findFieldByPattern(sampleItem, ["ts2", "ts-2"]),
      jumlah_mhs_ts1: this.findFieldByPattern(sampleItem, ["ts1", "ts-1"]),
      jumlah_mhs_ts:
        this.findFieldByPattern(sampleItem, ["ts"]) &&
        !this.findFieldByPattern(sampleItem, [
          "ts1",
          "ts2",
          "ts3",
          "ts4",
          "ts5",
          "ts6",
        ]),
      jumlah_lulusan_sd_ts: this.findFieldByPattern(sampleItem, [
        "lulusan_sd_ts",
        "lulusan",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapMasaStudiFields(result)

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
      const fieldMap = this.mapMasaStudiFields(item)

      if (fieldMap.tahun_masuk && !item[fieldMap.tahun_masuk]) {
        errors.push(`Baris ${index + 1}: Tahun Masuk harus diisi`)
      }

      if (fieldMap.tahun_masuk) {
        const tahunMasuk = String(item[fieldMap.tahun_masuk]).trim()
        if (tahunMasuk.length !== 4 || isNaN(parseInt(tahunMasuk))) {
          errors.push(
            `Baris ${index + 1}: Format Tahun Masuk tidak valid (YYYY)`
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

export const masaStudiLulusanPlugin = new MasaStudiLulusanPlugin()
export default masaStudiLulusanPlugin
