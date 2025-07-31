import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class EvaluasiDanPengendalianPlugin extends BasePlugin {
  constructor() {
    super({
      code: "9a",
      name: "Evaluasi dan Pengendalian Plugin",
      description: "Plugin for evaluating and controlling SPMI implementation",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isEvaluasiDanPengendalianSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  // ✅ Use dynamic base processing dengan konversi tanggal seperti 3b8-1
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => {
        const fieldMap = this.mapEvaluasiDanPengendalianFields(item)

        if (
          fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt &&
          item[fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt] &&
          typeof item[fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt] ===
            "number"
        ) {
          item[fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt] =
            PluginUtils.excelSerialDateToFormat(
              item[fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt]
            )
        }

        return item
      })
    }

    return result
  }

  // ✅ Override field type detection
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Date fields - tetap seperti semula
    if (
      fieldLower.includes("tanggal") ||
      fieldLower.includes("hh_bb_tttt") ||
      fieldLower.includes("date")
    ) {
      return "date"
    }

    // Semua field lainnya jadi string
    return "text"
  }

  // ✅ Process field value berdasarkan type - tambahkan handling untuk date
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "date") {
      return this.processDateField(value)
    }

    // Semua field selain date dijadikan string
    return String(value || "")
  }

  // ✅ Helper untuk memproses field tanggal - sama seperti 3b8-1
  processDateField(value) {
    if (!value) return ""

    // Jika sudah string dengan format DD/MM/YYYY, biarkan
    if (typeof value === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      return value
    }

    // Jika Excel serial number, konversi
    if (typeof value === "number") {
      return PluginUtils.excelSerialDateToFormat(value)
    }

    // Jika string format YYYY-MM-DD, konversi ke DD/MM/YYYY
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-")
      return `${day}/${month}/${year}`
    }

    return String(value)
  }

  // ✅ Dynamic field mapping
  mapEvaluasiDanPengendalianFields(sampleItem) {
    return {
      nama_standar_sn_dikti: this.findFieldByPattern(sampleItem, [
        "nama_standar_sn_dikti",
        "nama_standar",
        "standar",
        "nama",
        "sn_dikti",
      ]),
      ketersediaan_standar_p: this.findFieldByPattern(sampleItem, [
        "ketersediaan_standar_p",
        "ketersediaan_standar",
        "ketersediaan",
        "tersedia",
      ]),
      pelaksanaan_standar_p: this.findFieldByPattern(sampleItem, [
        "pelaksanaan_standar_p",
        "pelaksanaan_standar",
        "pelaksanaan",
        "implementasi",
      ]),
      monitoring_evaluasi_dan_audit_mutu_internal_e: this.findFieldByPattern(
        sampleItem,
        [
          "monitoring_evaluasi_dan_audit_mutu_internal_e",
          "monitoring_evaluasi",
          "monitoring",
          "evaluasi",
          "audit_mutu",
          "audit",
        ]
      ),
      umpan_balik_audit_mutu_internal_p: this.findFieldByPattern(sampleItem, [
        "umpan_balik_audit_mutu_internal_p",
        "umpan_balik",
        "feedback",
        "balik",
      ]),
      tindak_lanjut_audit_mutu_internal_p: this.findFieldByPattern(sampleItem, [
        "tindak_lanjut_audit_mutu_internal_p",
        "tindak_lanjut",
        "follow_up",
        "lanjut",
      ]),
      tanggal_audit_mutu_internal_hh_bb_tttt: this.findFieldByPattern(
        sampleItem,
        [
          "tanggal_audit_mutu_internal_hh_bb_tttt",
          "tanggal_audit",
          "tanggal",
          "hh_bb_tttt",
          "date",
        ]
      ),
    }
  }

  // ✅ Helper untuk parsing boolean field
  parseBooleanField(value) {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      const normalized = value.trim().toUpperCase()
      return (
        normalized === "V" ||
        normalized === "YA" ||
        normalized === "YES" ||
        normalized === "✓" ||
        normalized === "TRUE" ||
        normalized === "1"
      )
    }
    if (typeof value === "number") {
      return value === 1
    }
    return false
  }

  // ✅ Dynamic normalization dengan konversi tanggal yang lebih baik - sama seperti 3b8-1
  normalizeData(data) {
    if (!Array.isArray(data)) return []

    return data.map((item, index) => {
      const result = {
        ...item,
        id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        no: index + 1,
      }

      const fieldMap = this.mapEvaluasiDanPengendalianFields(result)

      // ✅ Process semua field berdasarkan mapping dengan handling khusus untuk tanggal
      Object.entries(fieldMap).forEach(([key, fieldName]) => {
        if (fieldName && result[fieldName] !== undefined) {
          // Khusus untuk field tanggal - tetap seperti semula
          if (key === "tanggal_audit_mutu_internal_hh_bb_tttt") {
            const dateValue = result[fieldName]

            // Jika format YYYY-MM-DD, konversi ke DD/MM/YYYY
            if (
              typeof dateValue === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
            ) {
              console.log(`Konversi tanggal: ${dateValue}`)
              const [year, month, day] = dateValue.split("-")
              result[fieldName] = `${day}/${month}/${year}`
              console.log(`Hasil konversi: ${result[fieldName]}`)
            }
            // Jika Excel serial number, konversi
            else if (typeof dateValue === "number") {
              const jsDate = new Date((dateValue - 25569) * 86400 * 1000)
              if (!isNaN(jsDate.getTime())) {
                const day = String(jsDate.getDate()).padStart(2, "0")
                const month = String(jsDate.getMonth() + 1).padStart(2, "0")
                const year = jsDate.getFullYear()
                result[fieldName] = `${day}/${month}/${year}`
                console.log(
                  `Konversi Excel serial date: ${dateValue} -> ${result[fieldName]}`
                )
              }
            }
          } else {
            // Untuk field lainnya, jadikan string
            result[fieldName] = String(result[fieldName] || "")
          }
        }
      })

      return result
    })
  }

  // ✅ Dynamic validation dengan validasi tanggal
  validateData(data) {
    const errors = []

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      const fieldMap = this.mapEvaluasiDanPengendalianFields(item)

      if (
        fieldMap.nama_standar_sn_dikti &&
        (!item[fieldMap.nama_standar_sn_dikti] ||
          String(item[fieldMap.nama_standar_sn_dikti]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: Nama Standar harus diisi`)
      }

      // ✅ Validasi format tanggal - tetap seperti semula
      if (
        fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt &&
        item[fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt]
      ) {
        const dateValue = String(
          item[fieldMap.tanggal_audit_mutu_internal_hh_bb_tttt]
        )

        // Cek format DD/MM/YYYY atau DD-MM-YYYY
        const isValidDateFormat =
          /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue) ||
          /^\d{1,2}-\d{1,2}-\d{4}$/.test(dateValue) ||
          /^\d{4}-\d{2}-\d{2}$/.test(dateValue)

        if (!isValidDateFormat && dateValue.trim() !== "") {
          errors.push(
            `Baris ${
              index + 1
            }: Format tanggal audit harus DD/MM/YYYY atau serupa. Ditemukan: ${dateValue}`
          )
        }
      }

      // Update validasi untuk field yang sekarang berupa string
      const implementationFields = [
        fieldMap.ketersediaan_standar_p,
        fieldMap.pelaksanaan_standar_p,
        fieldMap.monitoring_evaluasi_dan_audit_mutu_internal_e,
        fieldMap.umpan_balik_audit_mutu_internal_p,
        fieldMap.tindak_lanjut_audit_mutu_internal_p,
      ].filter((field) => field) // Remove null fields

      const hasAnyImplementation = implementationFields.some((field) => {
        const value = String(item[field] || "")
          .trim()
          .toUpperCase()
        return (
          value === "V" ||
          value === "YA" ||
          value === "YES" ||
          value === "✓" ||
          value === "TRUE" ||
          value === "1"
        )
      })

      if (implementationFields.length > 0 && !hasAnyImplementation) {
        errors.push(
          `Baris ${index + 1}: Minimal satu kriteria implementasi harus dipilih`
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

export const evaluasiDanPengendalianPlugin = new EvaluasiDanPengendalianPlugin()
export default evaluasiDanPengendalianPlugin
