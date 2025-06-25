import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class KepuasanMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5d",
      name: "Kepuasan Mahasiswa Plugin",
      description: "Plugin for student satisfaction data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKepuasanMahasiswaSection: true,
    }
  }

  // ✅ TAMBAHKAN: Support untuk default data
  hasDefaultData() {
    return true
  }

  // ✅ TAMBAHKAN: Method untuk generate default data
  getDefaultData(tableCode, config = {}) {
    const defaultAspects = [
      {
        aspek_yang_diukur:
          "Keandalan (reliability): kemampuan dosen, tenaga kependidikan, dan pengelola dalam memberikan pelayanan",
        tingkat_sangat_baik: 0,
        tingkat_baik: 0,
        tingkat_cukup: 0,
        tingkat_kurang: 0,
        rencana_tindak_lanjut: "",
      },
      {
        aspek_yang_diukur:
          "Daya tanggap (responsiveness): kemauan dari dosen, tenaga kependidikan, dan pengelola dalam membantu mahasiswa dan memberikan jasa dengan cepat.",
        tingkat_sangat_baik: 0,
        tingkat_baik: 0,
        tingkat_cukup: 0,
        tingkat_kurang: 0,
        rencana_tindak_lanjut: "",
      },
      {
        aspek_yang_diukur:
          "Kepastian (assurance): kemampuan dosen, tenaga kependidikan, dan pengelola untuk memberi keyakinan kepada mahasiswa bahwa pelayanan yang diberikan telah sesuai dengan ketentuan.",
        tingkat_sangat_baik: 0,
        tingkat_baik: 0,
        tingkat_cukup: 0,
        tingkat_kurang: 0,
        rencana_tindak_lanjut: "",
      },
      {
        aspek_yang_diukur:
          "Empati (empathy): kesediaan/kepedulian dosen, tenaga kependidikan, dan pengelola untuk memberi perhatian kepada mahasiswa.",
        tingkat_sangat_baik: 0,
        tingkat_baik: 0,
        tingkat_cukup: 0,
        tingkat_kurang: 0,
        rencana_tindak_lanjut: "",
      },
      {
        aspek_yang_diukur:
          "Tangible: penilaian mahasiswa terhadap kecukupan, aksesibitas, kualitas sarana dan prasarana",
        tingkat_sangat_baik: 0,
        tingkat_baik: 0,
        tingkat_cukup: 0,
        tingkat_kurang: 0,
        rencana_tindak_lanjut: "",
      },
    ]

    return defaultAspects.map((aspect, index) => ({
      key: `default-aspect-${index + 1}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      selected: true,
      ...aspect,
    }))
  }

  // ✅ TAMBAHKAN: Method untuk merge dengan data yang sudah ada
  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    // Jika tidak ada data existing, gunakan default
    if (!existingData || existingData.length === 0) {
      console.log("🔧 No existing data, using default aspects")
      return defaultData
    }

    // Cek aspek mana yang belum ada
    const existingAspects = existingData.map((row) =>
      row.aspek_yang_diukur ? row.aspek_yang_diukur.toLowerCase().trim() : ""
    )

    const defaultAspects = [
      "keandalan",
      "daya tanggap",
      "kepastian",
      "empati",
      "tangible",
    ]

    const missingAspects = defaultAspects.filter((aspect) => {
      return !existingAspects.some(
        (existing) =>
          existing.includes(aspect.toLowerCase()) ||
          existing.includes(aspect.replace(" ", ""))
      )
    })

    if (missingAspects.length === 0) {
      console.log("🔧 All aspects present, no defaults needed")
      return existingData
    }

    console.log("🔧 Missing aspects:", missingAspects)

    // Ambil default data untuk aspek yang hilang
    const missingDefaults = defaultData.filter((defaultRow) => {
      const defaultAspect = defaultRow.aspek_yang_diukur.toLowerCase()
      return missingAspects.some((missing) =>
        defaultAspect.includes(missing.toLowerCase())
      )
    })

    // Gabungkan data existing dengan default yang hilang
    const combined = [...existingData, ...missingDefaults]

    // Urutkan berdasarkan urutan standar aspek
    const aspectOrder = {
      keandalan: 1,
      "daya tanggap": 2,
      kepastian: 3,
      empati: 4,
      tangible: 5,
    }

    combined.sort((a, b) => {
      const getOrder = (item) => {
        const aspect = (item.aspek_yang_diukur || "").toLowerCase()
        for (const [key, order] of Object.entries(aspectOrder)) {
          if (aspect.includes(key)) return order
        }
        return 999
      }

      return getOrder(a) - getOrder(b)
    })

    // Update nomor urut
    combined.forEach((item, index) => {
      item.no = index + 1
    })

    console.log("🔧 Merged data with defaults:", {
      existingCount: existingData.length,
      defaultsAdded: missingDefaults.length,
      totalCount: combined.length,
    })

    return combined
  }

  // ✅ Use dynamic base processing
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    // Konversi nilai persentase dari Excel jika ada
    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => {
        const fieldMap = this.mapKepuasanFields(item)

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

      // ✅ TAMBAHKAN: Merge dengan default data jika diperlukan
      result.allRows = this.mergeWithDefaults(result.allRows, tableCode, config)
    }

    return result
  }

  // ✅ Helper untuk konversi ke persentase dengan 2 digit desimal
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

    // Numeric fields for satisfaction levels
    if (
      fieldLower.includes("tingkat_sangat_baik") ||
      fieldLower.includes("tingkat_baik") ||
      fieldLower.includes("tingkat_cukup") ||
      fieldLower.includes("tingkat_kurang") ||
      fieldLower.includes("sangat_baik") ||
      fieldLower.includes("baik") ||
      fieldLower.includes("cukup") ||
      fieldLower.includes("kurang")
    ) {
      return "percentage" // Custom type untuk persentase
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Process field value berdasarkan type
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
  mapKepuasanFields(sampleItem) {
    return {
      aspek_yang_diukur: this.findFieldByPattern(sampleItem, [
        "aspek_yang_diukur",
        "aspek",
        "diukur",
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
      rencana_tindak_lanjut: this.findFieldByPattern(sampleItem, [
        "rencana_tindak_lanjut",
        "rencana",
        "tindak_lanjut",
        "upps_ps",
      ]),
    }
  }

  // ✅ Dynamic normalization - sekarang menangani persentase dan memformatnya
  normalizeData(data) {
    const normalized = data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapKepuasanFields(result)

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

    // ✅ TAMBAHKAN: Merge dengan default setelah normalisasi jika diperlukan
    return this.mergeWithDefaults(normalized)
  }

  // ✅ TAMBAHKAN: Method untuk prepare data saving
  prepareDataForSaving(data, config = {}) {
    return data.map((item, index) => {
      const { id, key, _editing, _selected, ...cleanRow } = item
      return {
        ...cleanRow,
        selected: true,
        no: index + 1,
      }
    })
  }

  // ✅ Dynamic validation - update untuk memvalidasi persentase
  validateData(data) {
    const errors = []

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      const fieldMap = this.mapKepuasanFields(item)

      if (
        fieldMap.aspek_yang_diukur &&
        (!item[fieldMap.aspek_yang_diukur] ||
          String(item[fieldMap.aspek_yang_diukur]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: 'aspek_yang_diukur' harus diisi.`)
      }

      // Validasi field persentase
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

export const kepuasanMahasiswaPlugin = new KepuasanMahasiswaPlugin()
export default kepuasanMahasiswaPlugin
