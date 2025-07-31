import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
export class PrestasiAkademikMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8b1",
      name: "Prestasi Akademik Mahasiswa Plugin",
      description: "Plugin for student academic achievements data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPrestasiAkademikMahasiswaSection: true,
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

  // ✅ Helper untuk konversi Excel serial date ke format DD/MM/YYYY
  excelSerialDateToFormat(serial) {
    // Jika sudah dalam format DD/MM/YYYY, kembalikan langsung
    if (
      typeof serial === "string" &&
      /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(serial)
    ) {
      // Pastikan format sudah dalam DD/MM/YYYY
      const parts = serial.split("/")
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        // Jika sudah benar (day <= 31 dan month <= 12), kembalikan langsung
        if (day <= 31 && month <= 12) {
          return serial
        }
        // Jika ternyata dalam format MM/DD/YYYY, konversi ke DD/MM/YYYY
        if (month > 12 && day <= 12) {
          return `${parts[1].padStart(2, "0")}/${parts[0].padStart(2, "0")}/${
            parts[2]
          }`
        }
      }
    }

    // Format ISO dari database: YYYY-MM-DD -> DD/MM/YYYY
    if (typeof serial === "string" && /^\d{4}-\d{2}-\d{2}$/.test(serial)) {
      const [year, month, day] = serial.split("-")
      return `${day}/${month}/${year}`
    }

    // Jika tidak ada nilai atau bukan angka, kembalikan string kosong
    if (!serial || (typeof serial === "string" && serial.trim() === "")) {
      return ""
    }

    // Konversi ke number jika string
    if (typeof serial === "string") {
      serial = parseFloat(serial)
      if (isNaN(serial)) return serial // Kembalikan nilai asli jika bukan angka
    }

    if (serial > 1000) {
      // Pastikan ini benar-benar Excel serial date
      // Konversi Excel serial date ke JavaScript Date
      const milliseconds = (serial - 25569) * 86400 * 1000
      const jsDate = new Date(milliseconds)

      if (!isNaN(jsDate.getTime())) {
        // Format ke DD/MM/YYYY secara eksplisit
        const day = String(jsDate.getDate()).padStart(2, "0")
        const month = String(jsDate.getMonth() + 1).padStart(2, "0")
        const year = jsDate.getFullYear()
        return `${day}/${month}/${year}`
      }
    }

    return serial // Kembalikan nilai asli jika tidak berhasil dikonversi
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
          "internasional",
          "nasional",
          "lokal",
          "wilayah",
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

  // ✅ Override field type detection
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Boolean fields for tingkat
    if (
      fieldLower.includes("tingkat_") ||
      fieldLower.includes("internasional") ||
      fieldLower.includes("nasional") ||
      fieldLower.includes("lokal") ||
      fieldLower.includes("wilayah")
    ) {
      return "text"
    }

    // Date field
    if (fieldLower.includes("waktu") && fieldLower.includes("perolehan")) {
      return "date"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Proses field value berdasarkan tipe
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "boolean") {
      return this.processCheckboxValue(value)
    }

    if (fieldType === "date") {
      return this.excelSerialDateToFormat(value)
    }

    // Default text normalization untuk field non-boolean
    return PluginUtils.normalizeTextField(value)
  }

  // ✅ Dynamic field mapping
  mapPrestasiAkademikFields(sampleItem) {
    return {
      nama_kegiatan: this.findFieldByPattern(sampleItem, [
        "nama_kegiatan",
        "kegiatan",
        "nama",
      ]),
      waktu_perolehan: this.findFieldByPattern(sampleItem, [
        "waktu_perolehan",
        "waktu",
        "perolehan",
      ]),
      tingkat_internasional: this.findFieldByPattern(sampleItem, [
        "tingkat_internasional",
        "internasional",
      ]),
      tingkat_nasional: this.findFieldByPattern(sampleItem, [
        "tingkat_nasional",
        "nasional",
      ]),
      tingkat_lokal_wilayah: this.findFieldByPattern(sampleItem, [
        "tingkat_lokal",
        "lokal",
        "wilayah",
      ]),
      prestasi_yang_dicapai: this.findFieldByPattern(sampleItem, [
        "prestasi_yang_dicapai",
        "prestasi",
        "dicapai",
      ]),
    }
  }

  // ✅ Dynamic normalization dengan konversi tanggal dan boolean
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapPrestasiAkademikFields(result)

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

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      const fieldMap = this.mapPrestasiAkademikFields(item)

      if (
        fieldMap.nama_kegiatan &&
        (!item[fieldMap.nama_kegiatan] ||
          String(item[fieldMap.nama_kegiatan]).trim() === "")
      ) {
        errors.push(`Baris ${index + 1}: Nama Kegiatan harus diisi.`)
      }

      // Pastikan menggunakan processCheckboxValue untuk memeriksa nilai boolean
      const nasional =
        this.processCheckboxValue(item[fieldMap.tingkat_nasional]) === true
      const internasional =
        this.processCheckboxValue(item[fieldMap.tingkat_internasional]) === true
      const lokal =
        this.processCheckboxValue(item[fieldMap.tingkat_lokal_wilayah]) === true

      if (!nasional && !internasional && !lokal) {
        errors.push(
          `Baris ${
            index + 1
          }: Minimal satu tingkat harus dipilih untuk prestasi '${
            item[fieldMap.nama_kegiatan]
          }'.`
        )
      }

      const selectedLevels = [nasional, internasional, lokal].filter(
        Boolean
      ).length
      if (selectedLevels > 1) {
        errors.push(
          `Baris ${index + 1}: Prestasi '${
            item[fieldMap.nama_kegiatan]
          }' hanya boleh untuk satu tingkat.`
        )
      }

      // Validasi tanggal
      if (fieldMap.waktu_perolehan && !item[fieldMap.waktu_perolehan]) {
        errors.push(`Baris ${index + 1}: Waktu perolehan harus diisi.`)
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

export const prestasiAkademikMahasiswaPlugin =
  new PrestasiAkademikMahasiswaPlugin()
export default prestasiAkademikMahasiswaPlugin
