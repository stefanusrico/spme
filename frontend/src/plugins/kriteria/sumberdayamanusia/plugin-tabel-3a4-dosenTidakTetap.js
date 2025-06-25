import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class DosenTidakTetapPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a4",
      name: "Dosen Tidak Tetap",
      description: "Plugin for processing Non-Permanent Lecturers",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDosenTidakTetap: true,
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

    // Boolean field for kesesuaian
    if (fieldLower.includes("kesesuaian")) {
      return "boolean"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapDosenTidakTetapFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, ["nama_dosen", "nama"]),
      nidn_nidk: this.findFieldByPattern(sampleItem, ["nidn", "nidk", "nip"]),
      magister: this.findFieldByPattern(sampleItem, ["magister", "s2"]),
      doktor: this.findFieldByPattern(sampleItem, ["doktor", "s3"]),
      bidang_keahlian: this.findFieldByPattern(sampleItem, [
        "bidang_keahlian",
        "keahlian",
      ]),
      jabatan_akademik: this.findFieldByPattern(sampleItem, [
        "jabatan_akademik",
        "jabatan",
      ]),
      sertifikat_pendidik: this.findFieldByPattern(sampleItem, [
        "sertifikat_pendidik",
        "sertifikat",
      ]),
      sertifikasi: this.findFieldByPattern(sampleItem, [
        "sertifikasi",
        "kompetensi",
      ]),
      lembaga_penerbit: this.findFieldByPattern(sampleItem, [
        "lembaga_penerbit",
        "lembaga",
      ]),
      mata_kuliah: this.findFieldByPattern(sampleItem, [
        "mata_kuliah",
        "matkul",
      ]),
      kesesuaian: this.findFieldByPattern(sampleItem, ["kesesuaian"]),
    }
  }
  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapDosenTidakTetapFields(result)

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
      const fieldMap = this.mapDosenTidakTetapFields(item)

      const requiredFields = [
        { field: fieldMap.nama_dosen, name: "Nama dosen" },
        { field: fieldMap.nidn_nidk, name: "NIDN/NIDK" },
        { field: fieldMap.magister, name: "Magister" },
        { field: fieldMap.doktor, name: "Doktor" },
        { field: fieldMap.bidang_keahlian, name: "Bidang keahlian" },
        { field: fieldMap.jabatan_akademik, name: "Jabatan akademik" },
        {
          field: fieldMap.sertifikat_pendidik,
          name: "Nomor sertifikat pendidik",
        },
        { field: fieldMap.sertifikasi, name: "Bidang sertifikasi" },
        {
          field: fieldMap.lembaga_penerbit,
          name: "Lembaga penerbit sertifikat",
        },
        { field: fieldMap.mata_kuliah, name: "Mata kuliah yang diampu" },
        { field: fieldMap.kesesuaian, name: "Kesesuaian bidang keahlian" },
      ]

      requiredFields.forEach(({ field, name }) => {
        if (field && !item[field]) {
          errors.push(`Row ${index + 1}: ${name} harus diisi`)
        }
      })
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

export const dosenTidakTetapPlugin = new DosenTidakTetapPlugin()
export default dosenTidakTetapPlugin
