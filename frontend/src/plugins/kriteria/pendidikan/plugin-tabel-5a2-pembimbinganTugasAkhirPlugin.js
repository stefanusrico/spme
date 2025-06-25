import { BasePlugin } from "../../core/BasePlugin.js"

export class PembimbinganTugasAkhirPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a2",
      name: "Pembimbingan Tugas Akhir Plugin",
      description:
        "Plugin untuk mendata pembimbingan tugas akhir dari tabel 5.a.2 LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPembimbinganTugasAkhirSection: true,
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
      fieldLower.includes("ts_2") ||
      fieldLower.includes("ts_1") ||
      fieldLower.includes("ts") ||
      fieldLower.includes("jumlah") ||
      fieldLower.includes("pertemuan") ||
      fieldLower.includes("lama") ||
      fieldLower.includes("bulan")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapPembimbinganFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, [
        "nama_dosen",
        "nama",
        "pembimbing",
      ]),
      strata_pendidikan: this.findFieldByPattern(sampleItem, [
        "strata_pendidikan",
        "strata",
        "pendidikan",
        "status",
      ]),
      jabatan_akademik: this.findFieldByPattern(sampleItem, [
        "jabatan_akademik",
        "jabatan",
      ]),
      ts_2_mahasiswa:
        this.findFieldByPattern(sampleItem, ["ts_2", "ts-2"]) &&
        this.findFieldByPattern(sampleItem, ["mahasiswa"]),
      ts_1_mahasiswa:
        this.findFieldByPattern(sampleItem, ["ts_1", "ts-1"]) &&
        this.findFieldByPattern(sampleItem, ["mahasiswa"]),
      ts_mahasiswa:
        this.findFieldByPattern(sampleItem, ["ts"]) &&
        this.findFieldByPattern(sampleItem, ["mahasiswa"]) &&
        !this.findFieldByPattern(sampleItem, ["ts_1", "ts_2"]),
      ts_2_pertemuan:
        this.findFieldByPattern(sampleItem, ["ts_2", "ts-2"]) &&
        this.findFieldByPattern(sampleItem, ["pertemuan"]),
      ts_1_pertemuan:
        this.findFieldByPattern(sampleItem, ["ts_1", "ts-1"]) &&
        this.findFieldByPattern(sampleItem, ["pertemuan"]),
      ts_pertemuan:
        this.findFieldByPattern(sampleItem, ["ts"]) &&
        this.findFieldByPattern(sampleItem, ["pertemuan"]) &&
        !this.findFieldByPattern(sampleItem, ["ts_1", "ts_2"]),
      ts_2_lama_bulan:
        this.findFieldByPattern(sampleItem, ["ts_2", "ts-2"]) &&
        this.findFieldByPattern(sampleItem, ["lama", "bulan"]),
      ts_1_lama_bulan:
        this.findFieldByPattern(sampleItem, ["ts_1", "ts-1"]) &&
        this.findFieldByPattern(sampleItem, ["lama", "bulan"]),
      ts_lama_bulan:
        this.findFieldByPattern(sampleItem, ["ts"]) &&
        this.findFieldByPattern(sampleItem, ["lama", "bulan"]) &&
        !this.findFieldByPattern(sampleItem, ["ts_1", "ts_2"]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {e
      const result = { ...item }
      const fieldMap = this.mapPembimbinganFields(result)

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
      const fieldMap = this.mapPembimbinganFields(item)

      if (fieldMap.nama_dosen && !item[fieldMap.nama_dosen]) {
        errors.push(`Baris ${index + 1}: Nama Dosen Pembimbing harus diisi`)
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

export const pembimbinganTugasAkhirPlugin = new PembimbinganTugasAkhirPlugin()
export default pembimbinganTugasAkhirPlugin
