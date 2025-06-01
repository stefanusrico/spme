import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class LuaranPenelitianPkmLainnyaBukuBerIsbnPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b8-4",
      name: "Luaran Penelitian/PkM Lainnya - Buku ber-ISBN, Book Chapter",
      description:
        "Plugin for processing Luaran Penelitian/PkM Lainnya - Buku ber-ISBN, Book Chapter",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isLuaranPenelitianBuku: true,
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
        keterangan_nomor_isbn: "",
      }

      // Map based on column indices
      if (row[1] !== undefined)
        item.luaran_penelitian_dan_pkm = PluginUtils.normalizeTextField(row[1])
      if (row[2] !== undefined)
        item.tanggal_hh_bb_tttt = PluginUtils.normalizeTextField(row[2])
      if (row[3] !== undefined)
        item.keterangan_nomor_isbn = PluginUtils.normalizeTextField(row[3])

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
        isValidField(item.keterangan_nomor_isbn)
      ) {
        ND += 1
      }
    })

    // Fetch score details from other tables
    const responseScoreDetail = await fetchScoreDetails(
      "3a1",
      additionalData.projectId
    )
    const responseScoreDetail1 = await fetchScoreDetails(
      "3b8-1",
      additionalData.projectId
    )
    const responseScoreDetail2 = await fetchScoreDetails(
      "3b8-2",
      additionalData.projectId
    )
    const responseScoreDetail3 = await fetchScoreDetails(
      "3b8-3",
      additionalData.projectId
    )

    if (
      !responseScoreDetail ||
      !responseScoreDetail1 ||
      !responseScoreDetail2 ||
      !responseScoreDetail3
    ) {
      console.warn("Masukan data dari tabel 3a1, 3b8-1, 3b8-2, dan 3b8-3")
      return {
        scores: [
          {
            butir: 31,
            nilai: 0,
          },
        ],
        scoreDetail: {},
      }
    }

    const NDTPS = Number(responseScoreDetail?.NDTPS || 0)
    const NA = Number(responseScoreDetail1?.NA || 0)
    const NB = Number(responseScoreDetail2?.NB || 0)
    const NC = Number(responseScoreDetail3?.NC || 0)

    // Calculate RLP
    const RLP =
      NDTPS > 0
        ? Math.round(((2 * (NA + NB + NC) + ND) / NDTPS) * 100) / 100
        : 0

    let score = 0
    if (RLP >= 1) {
      score = 4
    } else {
      score = 2 + 2 * RLP
    }

    console.log("Hasil RLP:", RLP)
    console.log("Score:", score)

    return {
      scores: [
        {
          butir: 31,
          nilai: score,
        },
      ],
      scoreDetail: {
        NA,
        NB,
        NC,
        ND,
        RLP,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "luaran_penelitian_dan_pkm",
        "tanggal_hh_bb_tttt",
        "keterangan_nomor_isbn",
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
          `Row ${index + 1}: Luaran Penelitian dan PkM harus diisi`
        )
      }
      if (!item.tanggal_hh_bb_tttt) {
        errors.push(`Row ${index + 1}: Tanggal (HH/BB/TTTT) harus diisi`)
      }
      if (!item.keterangan_nomor_isbn) {
        errors.push(`Row ${index + 1}: Keterangan (Nomor ISBN) harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const luaranPenelitianPkmLainnyaBukuBerIsbnPlugin =
  new LuaranPenelitianPkmLainnyaBukuBerIsbnPlugin()

export default luaranPenelitianPkmLainnyaBukuBerIsbnPlugin
