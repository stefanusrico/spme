import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class LuaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b8-3",
      name: "Luaran Penelitian/PkM Lainnya - Teknologi Tepat Guna, Produk",
      description:
        "Plugin for processing Luaran Penelitian/PkM Lainnya - Teknologi Tepat Guna, Produk",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLuaranPenelitianTeknologi: true,
    }
  }

  hasDefaultData() {
    return false
  }

  // ✅ Use dynamic base processing dengan konversi tanggal awal
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    // Segera konversi tanggal ke format yang benar setelah data diproses
    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => {
        const fieldMap = this.mapLuaranTeknologiFields(item)
        if (
          fieldMap.tanggal &&
          item[fieldMap.tanggal] &&
          typeof item[fieldMap.tanggal] === "number"
        ) {
          item[fieldMap.tanggal] = PluginUtils.excelSerialDateToFormat(
            item[fieldMap.tanggal]
          )
        }
        return item
      })
    }

    return result
  }

  // ✅ Dynamic field mapping - pastikan bisa mengenali field dari DB
  mapLuaranTeknologiFields(sampleItem) {
    return {
      luaran_penelitian: this.findFieldByPattern(sampleItem, [
        "luaran_penelitian_dan_pkm",
        "luaran_penelitian",
        "luaran",
        "penelitian",
        "pkm",
      ]),
      tanggal: this.findFieldByPattern(sampleItem, [
        "tanggal_hh_bb_tttt",
        "tanggal",
        "hh_bb_tttt",
        "date",
      ]),
      status_tkt: this.findFieldByPattern(sampleItem, [
        "status_tkt",
        "status",
        "tingkat",
        "kesiapan",
        "teknologi",
        "tkt",
      ]),
      nomor_sertifikat: this.findFieldByPattern(sampleItem, [
        "nomor_sertifikat_tkt",
        "nomor",
        "sertifikat",
        "tkt",
      ]),
    }
  }

  // ✅ Dynamic normalization dengan konversi tanggal
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapLuaranTeknologiFields(result)

      Object.entries(fieldMap).forEach(([key, fieldName]) => {
        if (fieldName && result[fieldName] !== undefined) {
          if (key === "tanggal") {
            const dateValue = result[fieldName]

            // Format ISO dari database: "2021-07-27" -> "27/07/2021"
            if (
              typeof dateValue === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
            ) {
              const [year, month, day] = dateValue.split("-")
              result[fieldName] = `${day}/${month}/${year}`
            }
            // Nilai Excel serial number
            else if (typeof dateValue === "number") {
              const jsDate = new Date((dateValue - 25569) * 86400 * 1000)
              if (!isNaN(jsDate.getTime())) {
                const day = String(jsDate.getDate()).padStart(2, "0")
                const month = String(jsDate.getMonth() + 1).padStart(2, "0")
                const year = jsDate.getFullYear()
                result[fieldName] = `${day}/${month}/${year}`
              }
            }
          } else {
            result[fieldName] = PluginUtils.normalizeTextField(
              result[fieldName]
            )
          }
        }
      })
      return result
    })
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fieldMap = this.mapLuaranTeknologiFields(item)

      const requiredFields = [
        {
          field: fieldMap.luaran_penelitian,
          name: "Luaran Penelitian dan PkM",
        },
        { field: fieldMap.tanggal, name: "Tanggal (HH/BB/TTTT)" },
        {
          field: fieldMap.status_tkt,
          name: "Status Tingkat Kesiapan Teknologi",
        },
        { field: fieldMap.nomor_sertifikat, name: "Nomor Sertifikat TKT" },
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

export const luaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin =
  new LuaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin()
export default luaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin
