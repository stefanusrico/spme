import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class KesesuaianBidangKerjaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8d2",
      name: "Kesesuaian Bidang Kerja Plugin",
      description: "Plugin for employment field conformity data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKesesuaianBidangKerjaSection: true,
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
      jumlah_lulusan: 0,
      jumlah_lulusan_yang_terlacak: 0,
      jumlah_bekerja_sesuai_bidang: 0,
      tingkat_rendah: 0,
      tingkat_sedang: 0,
      tingkat_tinggi: 0,
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
      fieldLower.includes("tingkat") ||
      fieldLower.includes("terlacak") ||
      fieldLower.includes("bekerja") ||
      fieldLower.includes("sesuai")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapKesesuaianBidangFields(sampleItem) {
    return {
      tahun_lulus: this.findFieldByPattern(sampleItem, [
        "tahun_lulus",
        "tahun",
      ]),
      jumlah_lulusan: this.findFieldByPattern(sampleItem, [
        "jumlah_lulusan",
        "lulusan",
        "total_lulusan",
      ]),
      jumlah_lulusan_yang_terlacak: this.findFieldByPattern(sampleItem, [
        "jumlah_lulusan_yang_terlacak",
        "terlacak",
        "yang_terlacak",
      ]),
      jumlah_bekerja_sesuai_bidang: this.findFieldByPattern(sampleItem, [
        "jumlah_bekerja_sesuai_bidang",
        "bekerja_sesuai",
        "sesuai_bidang",
      ]),
      tingkat_rendah: this.findFieldByPattern(sampleItem, [
        "tingkat_rendah",
        "rendah",
      ]),
      tingkat_sedang: this.findFieldByPattern(sampleItem, [
        "tingkat_sedang",
        "sedang",
      ]),
      tingkat_tinggi: this.findFieldByPattern(sampleItem, [
        "tingkat_tinggi",
        "tinggi",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        const fieldMap = this.mapKesesuaianBidangFields(item)
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

        const fieldMap = this.mapKesesuaianBidangFields(result)

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
    const fieldMap = this.mapKesesuaianBidangFields(data[0] || {})

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
      const lulusan = PluginUtils.parseNumber(item[fieldMap.jumlah_lulusan], 0)
      const terlacak = PluginUtils.parseNumber(
        item[fieldMap.jumlah_lulusan_yang_terlacak],
        0
      )
      const tingkatRendah = PluginUtils.parseNumber(
        item[fieldMap.tingkat_rendah],
        0
      )
      const tingkatSedang = PluginUtils.parseNumber(
        item[fieldMap.tingkat_sedang],
        0
      )
      const tingkatTinggi = PluginUtils.parseNumber(
        item[fieldMap.tingkat_tinggi],
        0
      )

      if (terlacak > lulusan) {
        errors.push(
          `Baris ${
            index + 1
          }: Jumlah lulusan yang terlacak tidak boleh melebihi jumlah lulusan`
        )
      }

      const totalTingkat = tingkatRendah + tingkatSedang + tingkatTinggi
      if (totalTingkat > terlacak) {
        errors.push(
          `Baris ${
            index + 1
          }: Total tingkat kesesuaian tidak boleh melebihi jumlah lulusan yang terlacak`
        )
      }

      if (
        lulusan < 0 ||
        terlacak < 0 ||
        tingkatRendah < 0 ||
        tingkatSedang < 0 ||
        tingkatTinggi < 0
      ) {
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

export const kesesuaianBidangKerjaPlugin = new KesesuaianBidangKerjaPlugin()
export default kesesuaianBidangKerjaPlugin
