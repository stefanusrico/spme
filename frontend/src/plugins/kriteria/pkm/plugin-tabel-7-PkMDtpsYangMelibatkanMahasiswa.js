import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class PkmDtpsYangMelibatkanMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "7",
      name: "PkM DTPS yang Melibatkan Mahasiswa",
      description: "Plugin for processing PkM DTPS yang Melibatkan Mahasiswa",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPkmDtpsMahasiswaSection: true,
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

  // ✅ Dynamic field mapping
  mapPkmMahasiswaFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, [
        "nama_dosen",
        "dosen",
        "nama",
      ]),
      tema_pkm_sesuai_roadmap: this.findFieldByPattern(sampleItem, [
        "tema_pkm",
        "tema",
        "roadmap",
      ]),
      nama_mahasiswa: this.findFieldByPattern(sampleItem, [
        "nama_mahasiswa",
        "mahasiswa",
      ]),
      judul_kegiatan_pkm_selain_kkn: this.findFieldByPattern(sampleItem, [
        "judul_kegiatan",
        "judul",
        "kegiatan",
      ]),
      tahun_yyyy: this.findFieldByPattern(sampleItem, ["tahun", "yyyy"]),
    }
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapPkmMahasiswaFields(result)

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

    data.forEach((item, index) => {
      const fieldMap = this.mapPkmMahasiswaFields(item)

      const requiredFields = [
        { field: fieldMap.nama_dosen, name: "Nama Dosen" },
        { field: fieldMap.tema_pkm_sesuai_roadmap, name: "Tema Penelitian" },
        { field: fieldMap.nama_mahasiswa, name: "Nama mahasiswa" },
        {
          field: fieldMap.judul_kegiatan_pkm_selain_kkn,
          name: "Judul kegiatan",
        },
        { field: fieldMap.tahun_yyyy, name: "Tahun" },
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

export const pkmDtpsYangMelibatkanMahasiswaPlugin =
  new PkmDtpsYangMelibatkanMahasiswaPlugin()
export default pkmDtpsYangMelibatkanMahasiswaPlugin
