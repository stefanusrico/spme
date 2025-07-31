import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class WaktuTungguLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8d1",
      name: "Waktu Tunggu Lulusan Plugin",
      description: "Plugin for graduate waiting time data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isWaktuTungguLulusanSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()
    const years = ["TS-4", "TS-3", "TS-2"]

    return years.map((year, index) => ({
      key: `default-${index + 1}-${now}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      selected: true,
      tahun_lulus: year,
      jumlah_lulusan_yang_terlacak: 0,
      wt_3_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
      wt_3sd6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
      wt_6_bulan_jumlah_lulusan_terlacak_dengan_waktu_tunggu_mendapatkan_pekerjaan: 0,
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

    // Numeric fields
    if (
      fieldLower.includes("jumlah") ||
      fieldLower.includes("wt_") ||
      fieldLower.includes("waktu") ||
      fieldLower.includes("bulan") ||
      fieldLower.includes("lulusan") ||
      fieldLower.includes("terlacak")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapWaktuTungguFields(sampleItem) {
    return {
      tahun_lulus: this.findFieldByPattern(sampleItem, [
        "tahun_lulus",
        "tahun",
      ]),
      jumlah_lulusan: this.findFieldByPattern(sampleItem, [
        "jumlah_lulusan",
        "lulusan",
      ]),
      jumlah_lulusan_yang_terlacak: this.findFieldByPattern(sampleItem, [
        "jumlah_lulusan_yang_terlacak",
        "terlacak",
      ]),
      wt_3_bulan: this.findFieldByPattern(sampleItem, [
        "wt_3_bulan",
        "3_bulan",
        "kurang_3",
      ]),
      wt_3sd6_bulan: this.findFieldByPattern(sampleItem, [
        "wt_3sd6_bulan",
        "3sd6_bulan",
        "3_6_bulan",
      ]),
      wt_6_bulan: this.findFieldByPattern(sampleItem, [
        "wt_6_bulan",
        "6_bulan",
        "lebih_6",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        const fieldMap = this.mapWaktuTungguFields(item)
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

        const fieldMap = this.mapWaktuTungguFields(result)

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
    const requiredYears = ["TS-4", "TS-3", "TS-2"]
    const fieldMap = this.mapWaktuTungguFields(data[0] || {})

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
      const tracked = PluginUtils.parseNumber(
        item[fieldMap.jumlah_lulusan_yang_terlacak],
        0
      )
      const wt1 = PluginUtils.parseNumber(item[fieldMap.wt_3_bulan], 0)
      const wt2 = PluginUtils.parseNumber(item[fieldMap.wt_3sd6_bulan], 0)
      const wt3 = PluginUtils.parseNumber(item[fieldMap.wt_6_bulan], 0)

      const totalWait = wt1 + wt2 + wt3

      if (totalWait > tracked) {
        errors.push(
          `Baris ${
            index + 1
          }: Jumlah total waktu tunggu (${totalWait}) tidak boleh melebihi jumlah lulusan terlacak (${tracked})`
        )
      }

      if (tracked < 0 || wt1 < 0 || wt2 < 0 || wt3 < 0) {
        errors.push(`Baris ${index + 1}: Nilai tidak boleh negatif`)
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

export const waktuTungguLulusanPlugin = new WaktuTungguLulusanPlugin()
export default waktuTungguLulusanPlugin
