import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class LuaranPenelitianPkmLainnyaHKIHakCiptaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b8-2",
      name: "Luaran Penelitian/PkM Lainnya - HKI (Hak Cipta, Desain Produk Industri, dll.)",
      description:
        "Plugin for processing Luaran Penelitian/PkM Lainnya - HKI (Hak Cipta, Desain Produk Industri, dll.)",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLuaranPenelitianHKIHakCipta: true,
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

    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => {
        const fieldMap = this.mapLuaranHKIFields(item)
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
  mapLuaranHKIFields(sampleItem) {
    return {
      judul_luaran: this.findFieldByPattern(sampleItem, [
        "judul_luaran_penelitian_dan_pkm",
        "judul",
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
      nomor_sertifikat: this.findFieldByPattern(sampleItem, [
        "nomor_sertifikat",
        "nomor",
        "sertifikat",
        "keterangan",
      ]),
    }
  }

  // ✅ Dynamic normalization dengan konversi tanggal
  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      const fieldMap = this.mapLuaranHKIFields(result)

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
      const fieldMap = this.mapLuaranHKIFields(item)

      const requiredFields = [
        {
          field: fieldMap.judul_luaran,
          name: "Judul Luaran Penelitian dan PkM",
        },
        { field: fieldMap.tanggal, name: "Tanggal (HH/BB/TTTT)" },
        {
          field: fieldMap.nomor_sertifikat,
          name: "Keterangan Nomor Sertifikat",
        },
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

export const luaranPenelitianPkmLainnyaHKIHakCiptaPlugin =
  new LuaranPenelitianPkmLainnyaHKIHakCiptaPlugin()
export default luaranPenelitianPkmLainnyaHKIHakCiptaPlugin
