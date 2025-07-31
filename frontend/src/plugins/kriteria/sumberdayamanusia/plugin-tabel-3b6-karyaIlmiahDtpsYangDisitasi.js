import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class KaryaIlmiahDtpsYangDisitasiPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b6",
      name: "Karya Ilimiah DTPS yang Disitasi",
      description: "Plugin for processing Karya Ilimiah DTPS yang Disitasi",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKaryaIlmiahDisitasi: true,
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

    // Numeric field for jumlah sitasi
    if (fieldLower.includes("jumlah") && fieldLower.includes("sitasi")) {
      return "number"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Dynamic field mapping
  mapKaryaIlmiahFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, [
        "nama_dosen",
        "nama",
        "dosen",
      ]),
      judul_artikel: this.findFieldByPattern(sampleItem, [
        "judul",
        "artikel",
        "disitasi",
        "jurnal",
      ]),
      jumlah_sitasi: this.findFieldByPattern(sampleItem, ["jumlah", "sitasi"]),
    }
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fieldMap = this.mapKaryaIlmiahFields(item)

      const requiredFields = [
        { field: fieldMap.nama_dosen, name: "Nama Dosen" },
        { field: fieldMap.judul_artikel, name: "Judul Artikel yang Disitasi" },
        { field: fieldMap.jumlah_sitasi, name: "Jumlah sitasi" },
      ]

      requiredFields.forEach(({ field, name }) => {
        if (
          field &&
          (item[field] === undefined ||
            item[field] === null ||
            (typeof item[field] === "string" && !item[field].trim()))
        ) {
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

export const karyaIlmiahDtpsYangDisitasiPlugin =
  new KaryaIlmiahDtpsYangDisitasiPlugin()
export default karyaIlmiahDtpsYangDisitasiPlugin
