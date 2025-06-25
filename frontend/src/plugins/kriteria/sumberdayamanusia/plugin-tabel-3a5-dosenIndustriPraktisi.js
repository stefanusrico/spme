import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class DosenIndustriPraktisiPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a5",
      name: "Dosen Industri/Praktisi",
      description: "Plugin for processing Practitioner/Industry Lecturer",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDosenIndustriPraktisi: true,
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
      fieldLower.includes("bobot") ||
      fieldLower.includes("sks") ||
      fieldLower.includes("kredit")
    ) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapDosenIndustriFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, ["nama_dosen", "nama"]),
      nidk: this.findFieldByPattern(sampleItem, ["nidk", "nip"]),
      perusahaan: this.findFieldByPattern(sampleItem, [
        "perusahaan",
        "industri",
      ]),
      pendidikan: this.findFieldByPattern(sampleItem, [
        "pendidikan_tertinggi",
        "pendidikan",
      ]),
      bidang_keahlian: this.findFieldByPattern(sampleItem, [
        "bidang_keahlian",
        "keahlian",
      ]),
      sertifikasi: this.findFieldByPattern(sampleItem, [
        "sertifikasi",
        "sertifikat",
      ]),
      lembaga_penerbit: this.findFieldByPattern(sampleItem, [
        "lembaga_penerbit",
        "lembaga",
      ]),
      mata_kuliah: this.findFieldByPattern(sampleItem, [
        "mata_kuliah",
        "matkul",
      ]),
      bobot_sks: this.findFieldByPattern(sampleItem, [
        "bobot",
        "sks",
        "kredit",
      ]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapDosenIndustriFields(result)

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
      const fieldMap = this.mapDosenIndustriFields(item)

      const requiredFields = [
        { field: fieldMap.nama_dosen, name: "Nama dosen" },
        { field: fieldMap.nidk, name: "NIDK" },
        { field: fieldMap.perusahaan, name: "Perusahaan industri" },
        { field: fieldMap.pendidikan, name: "Pendidikan tertinggi" },
        { field: fieldMap.bidang_keahlian, name: "Bidang keahlian" },
        { field: fieldMap.sertifikasi, name: "Bidang sertifikasi" },
        {
          field: fieldMap.lembaga_penerbit,
          name: "Lembaga penerbit sertifikat",
        },
        { field: fieldMap.mata_kuliah, name: "Mata kuliah" },
      ]

      requiredFields.forEach(({ field, name }) => {
        if (field && (!item[field] || item[field].trim() === "")) {
          errors.push(`Row ${index + 1}: ${name} harus diisi`)
        }
      })

      // Validate SKS field
      if (fieldMap.bobot_sks) {
        const sks = item[fieldMap.bobot_sks]
        if (sks === undefined || sks === null || sks === 0) {
          errors.push(
            `Row ${index + 1}: Bobot kredit SKS harus diisi dan tidak boleh 0`
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

export const dosenIndustriPraktisiPlugin = new DosenIndustriPraktisiPlugin()
export default dosenIndustriPraktisiPlugin
