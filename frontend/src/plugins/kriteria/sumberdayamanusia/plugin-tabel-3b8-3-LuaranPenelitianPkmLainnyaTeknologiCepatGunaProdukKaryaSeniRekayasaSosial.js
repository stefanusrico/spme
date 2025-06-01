import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

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

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = PluginUtils.filterDataRows(rawData)

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        luaran_penelitian_dan_pkm: "",
        tanggal_hh_bb_tttt: "",
        status_tingkat_kesiapan_teknologi: "",
        nomor_sertifikat_tkt: "",
      }

      // Map based on column indices
      if (row[1] !== undefined)
        item.luaran_penelitian_dan_pkm = PluginUtils.normalizeTextField(row[1])
      if (row[2] !== undefined)
        item.tanggal_hh_bb_tttt = PluginUtils.normalizeTextField(row[2])
      if (row[3] !== undefined)
        item.status_tingkat_kesiapan_teknologi = PluginUtils.normalizeTextField(
          row[3]
        )
      if (row[4] !== undefined)
        item.nomor_sertifikat_tkt = PluginUtils.normalizeTextField(row[4])

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    let NC = 0

    const isValidField = (value) => {
      if (typeof value === "string") {
        return value.trim() !== ""
      }
      if (typeof value === "number") {
        return !isNaN(value)
      }
      return false
    }

    data.forEach((item) => {
      if (
        isValidField(item.luaran_penelitian_dan_pkm) &&
        isValidField(item.tanggal_hh_bb_tttt) &&
        isValidField(item.status_tingkat_kesiapan_teknologi) &&
        isValidField(item.nomor_sertifikat_tkt)
      ) {
        NC += 1
      }
    })

    return {
      scores: [],
      scoreDetail: {
        NC,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "luaran_penelitian_dan_pkm",
        "tanggal_hh_bb_tttt",
        "status_tingkat_kesiapan_teknologi",
        "nomor_sertifikat_tkt",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.luaran_penelitian_dan_pkm) {
        errors.push(`Row ${index + 1}: Luaran Penelitian dan PkM harus diisi`)
      }
      if (!item.tanggal_hh_bb_tttt) {
        errors.push(`Row ${index + 1}: Tanggal (HH/BB/TTTT) harus diisi`)
      }
      if (!item.status_tingkat_kesiapan_teknologi) {
        errors.push(
          `Row ${index + 1}: Status Tingkat Kesiapan Teknologi harus diisi`
        )
      }
      if (!item.nomor_sertifikat_tkt) {
        errors.push(`Row ${index + 1}: Nomor Sertifikat TKT harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const luaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin =
  new LuaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin()

export default luaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin
