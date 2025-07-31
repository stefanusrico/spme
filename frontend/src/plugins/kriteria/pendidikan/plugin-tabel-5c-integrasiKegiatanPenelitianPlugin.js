import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class IntegrasiKegiatanPenelitianPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5c",
      name: "Integrasi Kegiatan Penelitian Plugin",
      description:
        "Plugin for processing research integration data in learning",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isIntegrasiKegiatanPenelitianSection: true,
    }
  }

  hasDefaultData() {
    return false
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

    return result
  }

  // ✅ Helper untuk memproses nilai checkbox menjadi boolean
  processCheckboxValue(val) {
    // Handle already boolean values
    if (typeof val === "boolean") {
      return val
    }

    // Handle numeric values
    if (typeof val === "number") {
      return val > 0
    }

    // Handle string values
    if (typeof val === "string") {
      const cleaned = val.trim().toLowerCase()

      // True values
      if (
        [
          "v",
          "✔",
          "✓",
          "check",
          "ya",
          "yes",
          "y",
          "true",
          "1",
          "ts-2",
          "ts-1",
          "ts",
          "internasional",
          "nasional",
          "pt",
          "wilayah",
          "sesuai",
        ].includes(cleaned)
      ) {
        return true
      }

      // False values
      if (["x", "tidak", "no", "n", "false", "0", "", "-"].includes(cleaned)) {
        return false
      }

      // If it's a non-empty string that doesn't match our patterns
      return cleaned !== ""
    }

    // Default - falsy values return false
    return Boolean(val)
  }

  // ✅ Deteksi tipe field - untuk memisahkan field boolean vs text
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Boolean fields - tahun penelitian/pkm
    if (
      fieldLower.includes("ts_2") ||
      fieldLower.includes("ts-2") ||
      fieldLower.includes("ts_1") ||
      fieldLower.includes("ts-1") ||
      (fieldLower.includes("ts") &&
        !fieldLower.includes("ts_1") &&
        !fieldLower.includes("ts_2") &&
        !fieldLower.includes("ts-1") &&
        !fieldLower.includes("ts-2"))
    ) {
      return "text"
    }

    // Text fields - tingkat penelitian (changed from boolean to text)
    if (
      fieldLower.includes("tingkat_internasional") ||
      fieldLower.includes("internasional") ||
      fieldLower.includes("tingkat_nasional") ||
      fieldLower.includes("nasional") ||
      fieldLower.includes("tingkat_pt") ||
      fieldLower.includes("wilayah") ||
      fieldLower.includes("pt_wilayah")
    ) {
      return "text"
    }

    // Text fields - kesesuaian roadmap (changed from boolean to text)
    if (
      fieldLower.includes("sesuai_roadmap") ||
      fieldLower.includes("sesuai") ||
      fieldLower.includes("roadmap") ||
      fieldLower.includes("kurang_sesuai") ||
      fieldLower.includes("kurang sesuai") ||
      fieldLower.includes("tidak_sesuai") ||
      fieldLower.includes("tidak sesuai")
    ) {
      return "text"
    }

    return "text"
  }

  // ✅ Proses nilai field berdasarkan tipe
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "boolean") {
      return this.processCheckboxValue(value)
    }

    // Default text normalization untuk field non-boolean
    return PluginUtils.normalizeTextField(value)
  }

  // ✅ Dynamic field mapping
  mapIntegrasiFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, [
        "nama_dosen",
        "nama",
        "dosen",
      ]),
      judul_penelitian: this.findFieldByPattern(sampleItem, [
        "judul_penelitian",
        "judul",
        "penelitian",
        "pkm",
      ]),
      mata_kuliah: this.findFieldByPattern(sampleItem, [
        "mata_kuliah",
        "matkul",
      ]),
      bentuk_integrasi: this.findFieldByPattern(sampleItem, [
        "bentuk_integrasi",
        "bentuk",
        "integrasi",
      ]),
      ts_2_tahun: this.findFieldByPattern(sampleItem, ["ts_2", "ts-2"]),
      ts_1_tahun: this.findFieldByPattern(sampleItem, ["ts_1", "ts-1"]),
      ts_tahun:
        this.findFieldByPattern(sampleItem, ["ts"]) &&
        !this.findFieldByPattern(sampleItem, ["ts_1", "ts_2"]),
      tingkat_internasional: this.findFieldByPattern(sampleItem, [
        "tingkat_internasional",
        "internasional",
      ]),
      tingkat_nasional: this.findFieldByPattern(sampleItem, [
        "tingkat_nasional",
        "nasional",
      ]),
      tingkat_pt_wilayah: this.findFieldByPattern(sampleItem, [
        "tingkat_pt",
        "wilayah",
        "pt_wilayah",
      ]),
      sesuai_roadmap: this.findFieldByPattern(sampleItem, [
        "sesuai",
        "roadmap",
      ]),
      kurang_sesuai_roadmap: this.findFieldByPattern(sampleItem, [
        "kurang_sesuai",
        "kurang sesuai",
      ]),
      tidak_sesuai_roadmap: this.findFieldByPattern(sampleItem, [
        "tidak_sesuai",
        "tidak sesuai",
      ]),
    }
  }

  // ✅ Dynamic normalization - gunakan processFieldValue
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapIntegrasiFields(result)

      Object.entries(fieldMap).forEach(([key, fieldName]) => {
        if (fieldName && result[fieldName] !== undefined) {
          // Gunakan fungsi proses nilai berdasarkan jenis field
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

  // ✅ Dynamic validation - pastikan validasi tetap benar dengan tipe boolean
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fieldMap = this.mapIntegrasiFields(item)

      const requiredFields = [
        { field: fieldMap.nama_dosen, name: "Nama dosen" },
        { field: fieldMap.judul_penelitian, name: "Judul penelitian" },
        { field: fieldMap.mata_kuliah, name: "Mata kuliah" },
      ]

      requiredFields.forEach(({ field, name }) => {
        if (field && !item[field]) {
          errors.push(`Row ${index + 1}: ${name} harus diisi`)
        }
      })

      // Validasi minimal satu tingkat penelitian dipilih
      const tingkatInternasional = fieldMap.tingkat_internasional
        ? item[fieldMap.tingkat_internasional] === true
        : false
      const tingkatNasional = fieldMap.tingkat_nasional
        ? item[fieldMap.tingkat_nasional] === true
        : false
      const tingkatWilayah = fieldMap.tingkat_pt_wilayah
        ? item[fieldMap.tingkat_pt_wilayah] === true
        : false

      if (!tingkatInternasional && !tingkatNasional && !tingkatWilayah) {
        errors.push(
          `Row ${index + 1}: Minimal satu tingkat penelitian harus dipilih`
        )
      }

      // Validasi minimal satu kesesuaian roadmap dipilih
      const sesuaiRoadmap = fieldMap.sesuai_roadmap
        ? item[fieldMap.sesuai_roadmap] === true
        : false
      const kurangSesuaiRoadmap = fieldMap.kurang_sesuai_roadmap
        ? item[fieldMap.kurang_sesuai_roadmap] === true
        : false
      const tidakSesuaiRoadmap = fieldMap.tidak_sesuai_roadmap
        ? item[fieldMap.tidak_sesuai_roadmap] === true
        : false

      if (!sesuaiRoadmap && !kurangSesuaiRoadmap && !tidakSesuaiRoadmap) {
        errors.push(
          `Row ${
            index + 1
          }: Minimal satu kesesuaian dengan roadmap harus dipilih`
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
      if (field) {
        return field
      }
    }

    return null
  }
}
