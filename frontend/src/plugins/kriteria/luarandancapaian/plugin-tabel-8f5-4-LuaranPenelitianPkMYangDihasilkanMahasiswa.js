import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class LuaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8f5-4",
      name: "Luaran Penelitian/PkM Lainnya - Buku Ber-ISBN, Book Chapter",
      description:
        "Plugin for processing Luaran Penelitian/PkM Lainnya - Buku Ber-ISBN, Book Chapter",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLuaranPenelitianMahasiswaBuku: true,
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

    // Date field
    if (fieldLower.includes("tanggal")) {
      return "text" // Will be processed as date string
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapLuaranBukuFields(sampleItem) {
    return {
      luaran_penelitian_dan_pkm: this.findFieldByPattern(sampleItem, [
        "luaran_penelitian_dan_pkm",
        "luaran",
        "penelitian",
        "pkm",
        "judul",
      ]),
      tanggal_hh_bb_tttt: this.findFieldByPattern(sampleItem, [
        "tanggal_hh_bb_tttt",
        "tanggal",
        "hh_bb_tttt",
        "date",
      ]),
      nomor_isbn: this.findFieldByPattern(sampleItem, [
        "nomor_isbn",
        "isbn",
        "nomor",
      ]),
    }
  }

  // ✅ Helper untuk validasi field
  isValidField(value) {
    if (typeof value === "string") {
      return value.trim() !== ""
    }
    if (typeof value === "number") {
      return !isNaN(value)
    }
    return false
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

      const fieldMap = this.mapLuaranBukuFields(result)

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
      const fieldMap = this.mapLuaranBukuFields(item)

      if (
        fieldMap.luaran_penelitian_dan_pkm &&
        !item[fieldMap.luaran_penelitian_dan_pkm]
      ) {
        errors.push(
          `Baris ${index + 1}: Judul Luaran Penelitian dan PkM harus diisi`
        )
      }
      if (fieldMap.tanggal_hh_bb_tttt && !item[fieldMap.tanggal_hh_bb_tttt]) {
        errors.push(`Baris ${index + 1}: Tanggal (HH/BB/TTTT) harus diisi`)
      }
      if (fieldMap.nomor_isbn && !item[fieldMap.nomor_isbn]) {
        errors.push(`Baris ${index + 1}: Keterangan (Nomor ISBN) harus diisi`)
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

export const luaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin =
  new LuaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin()

export default luaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin
