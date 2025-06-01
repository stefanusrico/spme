import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8f5-2",
      name: "Luaran Penelitian/PkM yang Dihasilkan Mahasiswa - HKI (Hak Cipta, Desain Produk Industri, dll.)",
      description: "Plugin for processing Luaran Penelitian/PkM yang Dihasilkan Mahasiswa - HKI (Hak Cipta, Desain Produk Industri, dll.)",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLuaranPenelitianMahasiswaHKIHakCipta: true,
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
        nomor_hki: "",
      }

      // Map based on column indices
      if (row[1] !== undefined) item.luaran_penelitian_dan_pkm = PluginUtils.normalizeTextField(row[1])
      if (row[2] !== undefined) item.tanggal_hh_bb_tttt = PluginUtils.normalizeTextField(row[2])
      if (row[3] !== undefined) item.nomor_hki = PluginUtils.normalizeTextField(row[3])

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    let NB = 0

    const isValidField = (value) => {
      if (typeof value === 'string') {
        return value.trim() !== ''
      }
      if (typeof value === 'number') {
        return !isNaN(value)
      }
      return false
    }

    data.forEach(item => {
      if (
        isValidField(item.luaran_penelitian_dan_pkm) &&
        isValidField(item.tanggal_hh_bb_tttt) &&
        isValidField(item.nomor_hki)
      ) {
        NB += 1
      }
    })

    return {
      scores: [
        {
          butir: 71,
          nilai: "Score ada di 8f5-4"
        }
      ],
      scoreDetail: {
        NB
      }
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }
      
      const textFields = [
        "luaran_penelitian_dan_pkm",
        "tanggal_hh_bb_tttt",
        "nomor_hki",
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
        errors.push(`Row ${index + 1}: Judul Luaran Penelitian dan PkM harus diisi`)
      }
      if (!item.tanggal_hh_bb_tttt) {
        errors.push(`Row ${index + 1}: Tanggal (HH/BB/TTTT) harus diisi`)
      }
      if (!item.nomor_hki) {
        errors.push(`Row ${index + 1}: Nomor HKI harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const luaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin = 
  new LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin()

export default luaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin