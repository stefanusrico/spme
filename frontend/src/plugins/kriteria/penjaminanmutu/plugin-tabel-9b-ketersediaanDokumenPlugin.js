import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class KetersediaanDokumenPlugin extends BasePlugin {
  constructor() {
    super({
      code: "9b",
      name: "Ketersediaan Dokumen SPMI Plugin",
      description:
        "Plugin for evaluating availability and implementation of SPMI documents",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKetersediaanDokumenSection: true,
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

    // Date fields
    if (
      fieldLower.includes("tanggal") ||
      fieldLower.includes("date") ||
      fieldLower.includes("hh_bb_tttt")
    ) {
      return "text" // Treated as date string
    }

    // Document number fields
    if (
      fieldLower.includes("no_dokumen") ||
      fieldLower.includes("nomor") ||
      fieldLower.includes("number")
    ) {
      return "text"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapKetersediaanDokumenFields(sampleItem) {
    return {
      jenis_dokumen_penjaminan_mutu: this.findFieldByPattern(sampleItem, [
        "jenis_dokumen_penjaminan_mutu",
        "jenis_dokumen",
        "dokumen_penjaminan",
        "dokumen",
        "jenis",
        "penjaminan_mutu",
        "type",
      ]),
      no_dokumen: this.findFieldByPattern(sampleItem, [
        "no_dokumen",
        "nomor_dokumen",
        "nomor",
        "number",
        "doc_number",
      ]),
      tanggal_dokumen: this.findFieldByPattern(sampleItem, [
        "tanggal_dokumen",
        "tanggal",
        "date",
        "hh_bb_tttt",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    if (!Array.isArray(data)) return []

    return data.map((item, index) => {
      const result = {
        ...item,
        id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        no: index + 1,
      }

      const fieldMap = this.mapKetersediaanDokumenFields(result)

      // ✅ Process semua field berdasarkan mapping
      Object.entries(fieldMap).forEach(([key, fieldName]) => {
        if (fieldName && result[fieldName] !== undefined) {
          result[fieldName] = PluginUtils.normalizeTextField(result[fieldName])
        }
      })

      return result
    })
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      const fieldMap = this.mapKetersediaanDokumenFields(item)

      if (
        fieldMap.jenis_dokumen_penjaminan_mutu &&
        (!item[fieldMap.jenis_dokumen_penjaminan_mutu] ||
          String(item[fieldMap.jenis_dokumen_penjaminan_mutu]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: Jenis Dokumen Penjaminan harus diisi`)
      }

      if (
        fieldMap.no_dokumen &&
        (!item[fieldMap.no_dokumen] ||
          String(item[fieldMap.no_dokumen]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: No Dokumen harus diisi`)
      }

      if (
        fieldMap.tanggal_dokumen &&
        (!item[fieldMap.tanggal_dokumen] ||
          String(item[fieldMap.tanggal_dokumen]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: Tanggal Dokumen harus diisi`)
      }

      // Validate document type
      if (
        fieldMap.jenis_dokumen_penjaminan_mutu &&
        item[fieldMap.jenis_dokumen_penjaminan_mutu]
      ) {
        const jenisDoc = String(
          item[fieldMap.jenis_dokumen_penjaminan_mutu]
        ).toLowerCase()
        const validTypes = [
          "kebijakan spmi",
          "manual spmi",
          "standar spmi",
          "formulir spmi",
        ]

        const isValidType = validTypes.some(
          (type) => jenisDoc.includes(type) || type.includes(jenisDoc)
        )

        if (!isValidType) {
          errors.push(
            `Baris ${
              index + 1
            }: Jenis dokumen harus salah satu dari: Kebijakan SPMI, Manual SPMI, Standar SPMI, atau Formulir SPMI`
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

export const ketersediaanDokumenPlugin = new KetersediaanDokumenPlugin()
export default ketersediaanDokumenPlugin
