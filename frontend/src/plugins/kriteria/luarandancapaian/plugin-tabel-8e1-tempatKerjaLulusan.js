import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class LulusanTerlacakPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8e1",
      name: "Lulusan Terlacak Plugin",
      description: "Plugin for processing tracked graduate employment data",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLulusanTerlacakSection: true,
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
      jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
      jumlah_lulusan_yang_terlacak: 0,
      tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
      tingkat_nasional_berwirausaha_berizin: 0,
      tingkat_multinasional_internasional: 0,
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
      fieldLower.includes("tanggapan") ||
      fieldLower.includes("pengguna") ||
      fieldLower.includes("multinasional") ||
      fieldLower.includes("internasional") ||
      fieldLower.includes("nasional") ||
      fieldLower.includes("lokal") ||
      fieldLower.includes("wilayah") ||
      fieldLower.includes("berwirausaha")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapLulusanTerlacakFields(sampleItem) {
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
      jumlah_pengguna_lulusan_yang_memberi_tanggapan: this.findFieldByPattern(
        sampleItem,
        [
          "jumlah_pengguna_lulusan_yang_memberi_tanggapan",
          "pengguna_lulusan",
          "tanggapan",
          "memberi_tanggapan",
        ]
      ),
      jumlah_lulusan_yang_terlacak: this.findFieldByPattern(sampleItem, [
        "jumlah_lulusan_yang_terlacak",
        "terlacak",
        "yang_terlacak",
      ]),
      tingkat_lokal_wilayah_berwirausaha_tidak_berizin: this.findFieldByPattern(
        sampleItem,
        [
          "tingkat_lokal_wilayah_berwirausaha_tidak_berizin",
          "lokal_wilayah",
          "tidak_berizin",
          "lokal",
          "wilayah",
        ]
      ),
      tingkat_nasional_berwirausaha_berizin: this.findFieldByPattern(
        sampleItem,
        [
          "tingkat_nasional_berwirausaha_berizin",
          "nasional_berwirausaha",
          "berizin",
          "nasional",
        ]
      ),
      tingkat_multinasional_internasional: this.findFieldByPattern(sampleItem, [
        "tingkat_multinasional_internasional",
        "multinasional_internasional",
        "multinasional",
        "internasional",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        const fieldMap = this.mapLulusanTerlacakFields(item)
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

        const fieldMap = this.mapLulusanTerlacakFields(result)

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
    const validYears = ["TS-4", "TS-3", "TS-2"]
    const fieldMap = this.mapLulusanTerlacakFields(data[0] || {})

    data.forEach((item, index) => {
      const tahunLulus = String(item[fieldMap.tahun_lulus] || "")
      if (!tahunLulus) {
        errors.push(`Baris ${index + 1}: Tahun lulus harus diisi`)
      } else if (!validYears.includes(tahunLulus)) {
        errors.push(
          `Baris ${index + 1}: Tahun lulus harus TS-4, TS-3, atau TS-2`
        )
      }

      const jumlahLulusan = PluginUtils.parseNumber(
        item[fieldMap.jumlah_lulusan],
        0
      )
      const jumlahTerlacak = PluginUtils.parseNumber(
        item[fieldMap.jumlah_lulusan_yang_terlacak],
        0
      )
      const respondenCount = PluginUtils.parseNumber(
        item[fieldMap.jumlah_pengguna_lulusan_yang_memberi_tanggapan],
        0
      )

      if (jumlahTerlacak > jumlahLulusan) {
        errors.push(
          `Baris ${
            index + 1
          }: Jumlah lulusan yang terlacak tidak boleh lebih besar dari jumlah lulusan`
        )
      }

      if (respondenCount > jumlahLulusan) {
        errors.push(
          `Baris ${
            index + 1
          }: Jumlah responden tidak boleh lebih besar dari jumlah lulusan`
        )
      }

      const totalPenempatan =
        PluginUtils.parseNumber(
          item[fieldMap.tingkat_lokal_wilayah_berwirausaha_tidak_berizin],
          0
        ) +
        PluginUtils.parseNumber(
          item[fieldMap.tingkat_nasional_berwirausaha_berizin],
          0
        ) +
        PluginUtils.parseNumber(
          item[fieldMap.tingkat_multinasional_internasional],
          0
        )

      if (totalPenempatan > jumlahTerlacak) {
        errors.push(
          `Baris ${
            index + 1
          }: Total lulusan berdasarkan tempat kerja tidak boleh lebih besar dari jumlah lulusan yang terlacak`
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

export const lulusanTerlacakPlugin = new LulusanTerlacakPlugin()
export default lulusanTerlacakPlugin
