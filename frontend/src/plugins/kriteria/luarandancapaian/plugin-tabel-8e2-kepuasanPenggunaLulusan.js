import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class KepuasanPenggunaLulusanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8e2",
      name: "Tingkat Kepuasan Pengguna Lulusan Plugin",
      description:
        "Plugin for processing graduate user satisfaction level data",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKepuasanPenggunaSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getJenisKemampuanOptions() {
    return [
      "Etika",
      "Keahlian pada bidang ilmu (kompetensi utama)",
      "Kemampuan berbahasa asing",
      "Penggunaan teknologi informasi",
      "Kemampuan berkomunikasi",
      "Kerjasama tim",
      "Pengembangan diri",
    ]
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()
    const jenisKemampuanList = this.getJenisKemampuanOptions()

    return jenisKemampuanList.map((jenis, index) => ({
      key: `default-${index + 1}-${now}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      selected: true,
      jenis_kemampuan: jenis,
      tingkat_sangat_baik: 0,
      tingkat_baik: 0,
      tingkat_cukup: 0,
      tingkat_kurang: 0,
      rencana_tindak_lanjut_oleh_upps_ps: "",
    }))
  }

  // ✅ Use dynamic base processing dengan konversi persentase seperti 5d
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    // Konversi nilai persentase dari Excel jika ada - sama seperti 5d
    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => {
        const fieldMap = this.mapKepuasanPenggunaFields(item)

        // Konversi semua field tingkat kepuasan ke persentase
        const percentageFields = [
          fieldMap.tingkat_sangat_baik,
          fieldMap.tingkat_baik,
          fieldMap.tingkat_cukup,
          fieldMap.tingkat_kurang,
        ]

        percentageFields.forEach((field) => {
          if (field && item[field] !== undefined) {
            const rawPercentage = this.convertToPercentage(item[field])
            // ✅ Format ke 2 digit desimal menggunakan PluginUtils
            item[field] = PluginUtils.formatNumber(rawPercentage, 2)
          }
        })

        return item
      })
    }

    return result
  }

  // ✅ Helper untuk konversi ke persentase dengan 2 digit desimal - sama seperti 5d
  convertToPercentage(value) {
    if (value === null || value === undefined || value === "") {
      return 0
    }

    let result = 0

    // Jika sudah berupa number
    if (typeof value === "number") {
      // Jika nilai > 1 tapi <= 100, asumsikan sudah persentase
      if (value > 1 && value <= 100) {
        result = value
      }
      // Jika nilai <= 1, asumsikan proporsi (konversi ke persentase)
      else if (value >= 0 && value <= 1) {
        result = value * 100
      } else {
        result = value
      }
    }
    // Konversi string ke number
    else if (typeof value === "string") {
      // Hapus karakter % jika ada
      const cleanValue = value.replace(/\s*%\s*$/, "")

      const numValue = parseFloat(cleanValue)
      if (isNaN(numValue)) {
        return 0
      }

      // Jika ada simbol % di string asal, nilai sudah persentase
      if (value.includes("%")) {
        result = numValue
      }
      // Jika nilai > 1 tapi <= 100, asumsikan sudah persentase
      else if (numValue > 1 && numValue <= 100) {
        result = numValue
      }
      // Jika nilai <= 1, asumsikan proporsi (konversi ke persentase)
      else if (numValue >= 0 && numValue <= 1) {
        result = numValue * 100
      } else {
        result = numValue
      }
    }

    // ✅ Format hasil ke 2 digit desimal
    return parseFloat(PluginUtils.formatNumber(result, 2))
  }

  // ✅ Override field type detection
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Percentage fields
    if (
      fieldLower.includes("tingkat_") ||
      fieldLower.includes("sangat_baik") ||
      fieldLower.includes("baik") ||
      fieldLower.includes("cukup") ||
      fieldLower.includes("kurang")
    ) {
      return "percentage"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Process field value berdasarkan type - sama seperti 5d
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "percentage") {
      const rawPercentage = this.convertToPercentage(value)
      // ✅ Format ke 2 digit desimal
      return PluginUtils.formatNumber(rawPercentage, 2)
    }

    return super.processFieldValue(fieldName, value, fieldType)
  }

  // ✅ Dynamic field mapping
  mapKepuasanPenggunaFields(sampleItem) {
    return {
      jenis_kemampuan: this.findFieldByPattern(sampleItem, [
        "jenis_kemampuan",
        "kemampuan",
        "jenis",
        "aspek",
      ]),
      tingkat_sangat_baik: this.findFieldByPattern(sampleItem, [
        "tingkat_sangat_baik",
        "sangat_baik",
        "sangat baik",
      ]),
      tingkat_baik:
        this.findFieldByPattern(sampleItem, ["tingkat_baik", "baik"]) &&
        !this.findFieldByPattern(sampleItem, ["sangat_baik"]),
      tingkat_cukup: this.findFieldByPattern(sampleItem, [
        "tingkat_cukup",
        "cukup",
      ]),
      tingkat_kurang: this.findFieldByPattern(sampleItem, [
        "tingkat_kurang",
        "kurang",
      ]),
      rencana_tindak_lanjut_oleh_upps_ps: this.findFieldByPattern(sampleItem, [
        "rencana_tindak_lanjut_oleh_upps_ps",
        "rencana_tindak_lanjut",
        "rencana",
        "tindak_lanjut",
        "upps_ps",
      ]),
    }
  }

  // ✅ Dynamic normalization - sekarang menangani persentase dan memformatnya seperti 5d
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        const fieldMap = this.mapKepuasanPenggunaFields(item)
        if (!item[fieldMap.jenis_kemampuan]) return true
        const normalized = String(item[fieldMap.jenis_kemampuan])
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

        const fieldMap = this.mapKepuasanPenggunaFields(result)

        // ✅ Process semua field berdasarkan mapping
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

  // ✅ Dynamic validation - update untuk memvalidasi persentase seperti 5d
  validateData(data) {
    const errors = []
    const requiredCapabilities = this.getJenisKemampuanOptions()

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    const fieldMap = this.mapKepuasanPenggunaFields(data[0] || {})

    // Check if all required capabilities are present
    const existingCapabilities = data.map((item) =>
      String(item[fieldMap.jenis_kemampuan] || "")
        .toLowerCase()
        .trim()
    )

    requiredCapabilities.forEach((capability) => {
      const found = existingCapabilities.some(
        (existing) =>
          existing.includes(capability.toLowerCase()) ||
          capability.toLowerCase().includes(existing)
      )

      if (!found) {
        errors.push(`Jenis kemampuan "${capability}" wajib diisi`)
      }
    })

    // Validate each row
    data.forEach((item, index) => {
      if (
        fieldMap.jenis_kemampuan &&
        (!item[fieldMap.jenis_kemampuan] ||
          String(item[fieldMap.jenis_kemampuan]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: Jenis kemampuan harus diisi`)
      }

      // ✅ Validasi field persentase - sama seperti 5d
      const percentageFields = [
        { field: fieldMap.tingkat_sangat_baik, name: "Tingkat Sangat Baik" },
        { field: fieldMap.tingkat_baik, name: "Tingkat Baik" },
        { field: fieldMap.tingkat_cukup, name: "Tingkat Cukup" },
        { field: fieldMap.tingkat_kurang, name: "Tingkat Kurang" },
      ].filter((x) => x.field)

      percentageFields.forEach(({ field, name }) => {
        const val = parseFloat(item[field] || 0)
        if (val < 0 || val > 100) {
          errors.push(
            `Baris ${
              index + 1
            }: '${name}' harus berupa persentase antara 0-100%. Ditemukan: ${val}%`
          )
        }
      })

      // Validasi total persentase mendekati 100%
      const totalPersen = percentageFields.reduce((sum, { field }) => {
        return sum + parseFloat(item[field] || 0)
      }, 0)

      if (totalPersen > 0 && Math.abs(totalPersen - 100) > 5) {
        errors.push(
          `Baris ${
            index + 1
          }: Total persentase tingkat kepuasan seharusnya 100%. Ditemukan: ${PluginUtils.formatNumber(
            totalPersen,
            2
          )}%`
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

export const kepuasanPenggunaLulusanPlugin = new KepuasanPenggunaLulusanPlugin()
export default kepuasanPenggunaLulusanPlugin
