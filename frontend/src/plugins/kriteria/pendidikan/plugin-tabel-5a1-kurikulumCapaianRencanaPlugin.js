import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class KurikulumCapaianRencanaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a1",
      name: "Kurikulum Capaian Rencana Plugin",
      description:
        "Plugin untuk mendata kurikulum, capaian pembelajaran dan rencana pembelajaran dari tabel 5.a.1 LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKurikulumCapaianSection: true,
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

    // Numeric fields untuk SKS dan konversi
    if (
      fieldLower.includes("sks") ||
      fieldLower.includes("bobot") ||
      fieldLower.includes("kredit") ||
      fieldLower.includes("konversi") ||
      fieldLower.includes("jam") ||
      fieldLower.includes("jumlah")
    ) {
      return "number"
    }

    // Boolean fields untuk kompetensi
    if (
      fieldLower.includes("kompetensi") ||
      fieldLower.includes("kesesuaian")
    ) {
      return "boolean"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping berdasarkan field structure yang diberikan
  mapKurikulumFields(sampleItem) {
    return {
      // Core curriculum fields
      semester: this.findFieldByPattern(sampleItem, ["semester"]),
      kode_mata_kuliah: this.findFieldByPattern(sampleItem, [
        "kode_mata_kuliah",
        "kode",
      ]),
      nama_mata_kuliah: this.findFieldByPattern(sampleItem, [
        "nama_mata_kuliah",
        "nama",
      ]),
      mata_kuliah_kompetensi: this.findFieldByPattern(sampleItem, [
        "mata_kuliah_kompetensi",
        "kompetensi",
      ]),

      // SKS/Bobot fields
      bobot_kuliah: this.findFieldByPattern(sampleItem, [
        "bobot_kredit_sks_kuliah_responsi_tutorial",
        "kuliah",
        "responsi",
        "tutorial",
      ]),
      bobot_seminar: this.findFieldByPattern(sampleItem, [
        "bobot_kredit_sks_seminar",
        "seminar",
      ]),
      bobot_praktikum: this.findFieldByPattern(sampleItem, [
        "bobot_kredit_sks_praktikum_praktik_praktik_lapangan",
        "praktikum",
        "praktik",
      ]),

      // Konversi field
      konversi_kredit: this.findFieldByPattern(sampleItem, [
        "konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi",
        "konversi",
      ]),

      // ✅ Capaian pembelajaran fields berdasarkan data yang diberikan
      cp_sikap: this.findFieldByPattern(sampleItem, [
        "capaian_pembelajaran_sikap",
        "sikap",
      ]),
      cp_penguasaan_pengetahuan: this.findFieldByPattern(sampleItem, [
        "capaian_pembelajaran_penguasaan_pengetahuan",
        "penguasaan",
        "pengetahuan",
      ]),
      cp_keterampilan_umum: this.findFieldByPattern(sampleItem, [
        "capaian_pembelajaran_keterampilan_umum",
        "keterampilan_umum",
      ]),
      cp_keterampilan_khusus: this.findFieldByPattern(sampleItem, [
        "capaian_pembelajaran_keterampilan_khusus",
        "keterampilan_khusus",
      ]),

      // ✅ Additional fields berdasarkan data yang diberikan
      dokumen_rencana_pembelajaran: this.findFieldByPattern(sampleItem, [
        "dokumen_rencana_pembelajaran",
        "dokumen",
        "rencana",
      ]),
      unit_penyelenggara: this.findFieldByPattern(sampleItem, [
        "unit_penyeleng_gara",
        "unit_penyelenggara",
        "penyelenggara",
      ]),
    }
  }

  // ✅ Helper method untuk validasi row
  isValidRow(item) {
    const fieldMap = this.mapKurikulumFields(item)

    const semester = PluginUtils.normalizeTextField(
      item[fieldMap.semester] || ""
    )
    const kodeMataKuliah = PluginUtils.normalizeTextField(
      item[fieldMap.kode_mata_kuliah] || ""
    )
    const namaMataKuliah = PluginUtils.normalizeTextField(
      item[fieldMap.nama_mata_kuliah] || ""
    )

    return semester !== "" && kodeMataKuliah !== "" && namaMataKuliah !== ""
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapKurikulumFields(result)

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
      const fieldMap = this.mapKurikulumFields(item)

      // Validate required fields
      if (fieldMap.semester && !item[fieldMap.semester]) {
        errors.push(`Baris ${index + 1}: Semester harus diisi`)
      }

      if (fieldMap.kode_mata_kuliah && !item[fieldMap.kode_mata_kuliah]) {
        errors.push(`Baris ${index + 1}: Kode Mata Kuliah harus diisi`)
      }

      if (fieldMap.nama_mata_kuliah && !item[fieldMap.nama_mata_kuliah]) {
        errors.push(`Baris ${index + 1}: Nama Mata Kuliah harus diisi`)
      }

      // Validate numeric fields
      if (this.isValidRow(item)) {
        const totalBobot =
          PluginUtils.parseNumber(item[fieldMap.bobot_kuliah], 0) +
          PluginUtils.parseNumber(item[fieldMap.bobot_seminar], 0) +
          PluginUtils.parseNumber(item[fieldMap.bobot_praktikum], 0)

        if (totalBobot <= 0) {
          errors.push(
            `Baris ${index + 1}: Total bobot kredit harus lebih dari 0`
          )
        }

        const konversi = PluginUtils.parseNumber(
          item[fieldMap.konversi_kredit],
          0
        )
        if (konversi <= 0) {
          errors.push(
            `Baris ${index + 1}: Konversi kredit ke jam harus lebih dari 0`
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

export const kurikulumCapaianRencanaPlugin = new KurikulumCapaianRencanaPlugin()
export default kurikulumCapaianRencanaPlugin
