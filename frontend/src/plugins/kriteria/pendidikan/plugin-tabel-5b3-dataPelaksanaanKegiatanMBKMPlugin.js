import { BasePlugin } from "../../core/BasePlugin.js"

export class DataPelaksanaanKegiatanMBKMPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5b3",
      name: "Data Pelaksanaan Kegiatan MBKM Plugin",
      description: "Plugin for MBKM activities data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDataPelaksanaanMBKMSection: true,
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

    // Numeric fields
    if (
      fieldLower.includes("periode") ||
      fieldLower.includes("durasi") ||
      fieldLower.includes("jenis_kegiatan") ||
      fieldLower.includes("sks") ||
      fieldLower.includes("jumlah_mahasiswa")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapMBKMFields(sampleItem) {
    return {
      nama_kegiatan: this.findFieldByPattern(sampleItem, [
        "nama_kegiatan",
        "kegiatan",
      ]),
      periode_pelaksanaan: this.findFieldByPattern(sampleItem, [
        "periode_pelaksanaan",
        "periode",
        "durasi",
      ]),
      jenis_kegiatan_mbkm: this.findFieldByPattern(sampleItem, [
        "jenis_kegiatan",
        "jenis",
        "mbkm",
      ]),
      mata_kuliah_setara: this.findFieldByPattern(sampleItem, [
        "mata_kuliah_setara",
        "mata_kuliah",
        "setara",
        "kode_nama",
      ]),
      sks_setara: this.findFieldByPattern(sampleItem, ["sks_setara", "sks"]),
      jumlah_mahasiswa: this.findFieldByPattern(sampleItem, [
        "jumlah_mahasiswa",
        "mahasiswa",
        "mengikuti",
      ]),
      lembaga_mitra: this.findFieldByPattern(sampleItem, [
        "lembaga_mitra",
        "lembaga",
        "mitra",
      ]),
      dtps_pembimbing: this.findFieldByPattern(sampleItem, [
        "dtps_pembimbing",
        "dtps",
        "pembimbing",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapMBKMFields(result)

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

    data.forEach((item, index) => {
      const fieldMap = this.mapMBKMFields(item)

      if (fieldMap.nama_kegiatan && !item[fieldMap.nama_kegiatan]) {
        errors.push(`Row ${index + 1}: Nama kegiatan harus diisi`)
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

export const dataPelaksanaanKegiatanMBKMPlugin =
  new DataPelaksanaanKegiatanMBKMPlugin()
export default dataPelaksanaanKegiatanMBKMPlugin
