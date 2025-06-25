import { BasePlugin } from "../../core/BasePlugin.js"

export class IpkLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8a",
      name: "IPK Lulusan Plugin",
      description: "Plugin for graduate GPA (IPK) data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isIpkLulusanSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()
    const years = ["TS-2", "TS-1", "TS"]

    return years.map((year, index) => ({
      key: `default-${index + 1}-${now}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      selected: true,
      tahun_lulus: year,
      jumlah_lulusan: 0,
      min_indeks_prestasi_kumulatif: 0,
      rata_rata_indeks_prestasi_kumulatif: 0,
      maks_indeks_prestasi_kumulatif: 0,
    }))
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

    // IPK fields with decimal precision
    if (
      fieldLower.includes("indeks_prestasi_kumulatif") ||
      fieldLower.includes("ipk") ||
      fieldLower.includes("prestasi")
    ) {
      return "number_decimal"
    }

    // Regular numeric fields
    if (fieldLower.includes("jumlah") || fieldLower.includes("lulusan")) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapIpkFields(sampleItem) {
    return {
      tahun_lulus: this.findFieldByPattern(sampleItem, [
        "tahun_lulus",
        "tahun",
      ]),
      jumlah_lulusan: this.findFieldByPattern(sampleItem, [
        "jumlah_lulusan",
        "lulusan",
        "jumlah",
      ]),
      min_indeks_prestasi_kumulatif: this.findFieldByPattern(sampleItem, [
        "min_indeks",
        "minimum",
        "min",
      ]),
      rata_rata_indeks_prestasi_kumulatif: this.findFieldByPattern(sampleItem, [
        "rata_rata",
        "rata",
        "average",
      ]),
      maks_indeks_prestasi_kumulatif: this.findFieldByPattern(sampleItem, [
        "maks_indeks",
        "maksimum",
        "max",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        const fieldMap = this.mapIpkFields(item)
        if (!item[fieldMap.tahun_lulus]) return true
        const normalized = String(item[fieldMap.tahun_lulus])
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

        const fieldMap = this.mapIpkFields(result)

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
    const requiredYears = ["TS-2", "TS-1", "TS"]
    const fieldMap = this.mapIpkFields(data[0] || {})

    const existingYears = data.map((item) =>
      String(item[fieldMap.tahun_lulus] || "")
        .trim()
        .toUpperCase()
    )

    requiredYears.forEach((year) => {
      if (!existingYears.includes(year)) {
        errors.push(`Tahun lulus "${year}" wajib diisi`)
      }
    })

    data.forEach((item, index) => {
      const min = parseFloat(item[fieldMap.min_indeks_prestasi_kumulatif] || 0)
      const avg = parseFloat(
        item[fieldMap.rata_rata_indeks_prestasi_kumulatif] || 0
      )
      const max = parseFloat(item[fieldMap.maks_indeks_prestasi_kumulatif] || 0)

      if (min > avg) {
        errors.push(
          `Baris ${
            index + 1
          }: IPK Minimum tidak boleh lebih besar dari IPK Rata-rata`
        )
      }

      if (avg > max) {
        errors.push(
          `Baris ${
            index + 1
          }: IPK Rata-rata tidak boleh lebih besar dari IPK Maksimum`
        )
      }

      if (min > 4 || avg > 4 || max > 4) {
        errors.push(`Baris ${index + 1}: Nilai IPK tidak boleh melebihi 4.00`)
      }

      if (min < 0 || avg < 0 || max < 0) {
        errors.push(`Baris ${index + 1}: Nilai IPK tidak boleh negatif`)
      }

      const graduates = parseFloat(item[fieldMap.jumlah_lulusan] || 0)
      if (graduates < 0) {
        errors.push(`Baris ${index + 1}: Jumlah lulusan tidak boleh negatif`)
      }

      if (graduates <= 0 && (min > 0 || avg > 0 || max > 0)) {
        errors.push(
          `Baris ${index + 1}: Jumlah Lulusan harus diisi jika ada data IPK`
        )
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

export const ipkLulusanPlugin = new IpkLulusanPlugin()
export default ipkLulusanPlugin
