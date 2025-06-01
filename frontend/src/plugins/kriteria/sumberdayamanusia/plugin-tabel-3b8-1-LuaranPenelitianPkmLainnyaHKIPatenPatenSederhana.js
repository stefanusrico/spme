import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class LuaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b8-1",
      name: "Luaran Penelitian/PkM Lainnya - HKI (Paten, Paten Sederhana)",
      description:
        "Plugin for processing Luaran Penelitian/PkM Lainnya - HKI (Paten, Paten Sederhana)",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLuaranPenelitianHKIPaten: true,
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
        judul_luaran_penelitian_dan_pkm: "",
        tanggal_hh_bb_tttt: "",
        nomor_paten_granted: "",
      }

      // Map based on column indices
      if (row[1] !== undefined)
        item.judul_luaran_penelitian_dan_pkm = PluginUtils.normalizeTextField(
          row[1]
        )
      if (row[2] !== undefined)
        item.tanggal_hh_bb_tttt = PluginUtils.normalizeTextField(row[2])
      if (row[3] !== undefined)
        item.nomor_paten_granted = PluginUtils.normalizeTextField(row[3])

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    let NA = 0

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
        isValidField(item.judul_luaran_penelitian_dan_pkm) &&
        isValidField(item.tanggal_hh_bb_tttt) &&
        isValidField(item.nomor_paten_granted)
      ) {
        NA += 1
      }
    })

    return {
      scores: [],
      scoreDetail: {
        NA,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "judul_luaran_penelitian_dan_pkm",
        "tanggal_hh_bb_tttt",
        "nomor_paten_granted",
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
      if (!item.judul_luaran_penelitian_dan_pkm) {
        errors.push(
          `Row ${index + 1}: Judul Luaran Penelitian dan PkM harus diisi`
        )
      }
      if (!item.tanggal_hh_bb_tttt) {
        errors.push(`Row ${index + 1}: Tanggal (HH/BB/TTTT) harus diisi`)
      }
      if (!item.nomor_paten_granted) {
        errors.push(`Row ${index + 1}: Nomor Paten (Granted) harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const luaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin =
  new LuaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin()

export default luaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin
