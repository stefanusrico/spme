import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

export class LuaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8f5-4",
      name: "Luaran Penelitian/PkM Lainnya - Buku Ber-ISBN, Book Chapter",
      description:
        "Plugin for processing Luaran Penelitian/PkM Lainnya - Buku Ber-ISBN, Book Chapter",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLuaranPenelitianMahasiswaBuku: true,
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
        nomor_isbn: "",
      }

      // Map based on column indices
      if (row[1] !== undefined)
        item.luaran_penelitian_dan_pkm = PluginUtils.normalizeTextField(row[1])
      if (row[2] !== undefined)
        item.tanggal_hh_bb_tttt = PluginUtils.normalizeTextField(row[2])
      if (row[3] !== undefined)
        item.nomor_isbn = PluginUtils.normalizeTextField(row[3])

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    let ND = 0

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
        isValidField(item.nomor_isbn)
      ) {
        ND += 1
      }
    })

    // Fetch score details from other tables
    const responseScoreDetail1 = await fetchScoreDetails(
      "8f5-1",
      additionalData.projectId
    )
    const responseScoreDetail2 = await fetchScoreDetails(
      "8f5-2",
      additionalData.projectId
    )
    const responseScoreDetail3 = await fetchScoreDetails(
      "8f5-3",
      additionalData.projectId
    )

    if (
      !responseScoreDetail1 ||
      !responseScoreDetail2 ||
      !responseScoreDetail3
    ) {
      console.warn("Masukan data dari tabel 8f5-1, 8f5-2, dan 8f5-3")
      return {
        scores: [
          {
            butir: 71,
            nilai: 0,
          },
        ],
        scoreDetail: {},
      }
    }

    const NA = Number(responseScoreDetail1?.NA || 0)
    const NB = Number(responseScoreDetail2?.NB || 0)
    const NC = Number(responseScoreDetail3?.NC || 0)

    // Menghitung NLP
    const NLP = 2 * (NA + NB + NC) + ND

    let score = 0
    if (NLP >= 1) {
      score = 4
    } else {
      score = 2 + 2 * NLP
    }

    // Ensure score doesn't exceed 4
    score = Math.min(4, score)

    console.log("NA:", NA)
    console.log("NB:", NB)
    console.log("NC:", NC)
    console.log("ND:", ND)
    console.log("NLP:", NLP)
    console.log("Score:", score)

    return {
      scores: [
        {
          butir: 71,
          nilai: score,
        },
      ],
      scoreDetail: {
        NA,
        NB,
        NC,
        ND,
        NLP: Math.round(NLP * 100) / 100,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "luaran_penelitian_dan_pkm",
        "tanggal_hh_bb_tttt",
        "nomor_isbn",
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
        errors.push(
          `Row ${index + 1}: Judul Luaran Penelitian dan PkM harus diisi`
        )
      }
      if (!item.tanggal_hh_bb_tttt) {
        errors.push(`Row ${index + 1}: Tanggal (HH/BB/TTTT) harus diisi`)
      }
      if (!item.nomor_isbn) {
        errors.push(`Row ${index + 1}: Keterangan (Nomor ISBN) harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const luaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin =
  new LuaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin()

export default luaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin
