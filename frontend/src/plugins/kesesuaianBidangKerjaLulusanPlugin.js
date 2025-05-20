/**
 * Plugin khusus untuk section Kesesuaian Bidang Kerja
 */
import { processExcelDataBase } from "../utils/tableUtils"

const kesesuaianBidangKerjaPlugin = {
  getInfo() {
    return {
      code: "8b",
      name: "Kesesuaian Bidang Kerja Plugin",
      description: "Plugin for employment field conformity data processing",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isKesesuaianBidangKerjaSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    console.log("=== DEBUG: Detected Indices ===")
    console.table(detectedIndices)

    console.log("=== DEBUG: Raw Data ===")
    console.table(rawData)

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      const isSequentialNumbersRow = nonEmptyValues.every((val, idx) => {
        const num = parseInt(val)
        return !isNaN(num) && num === idx + 1
      })
      if (isSequentialNumbersRow) return false

      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false
        const normalized = String(cell).toLowerCase().trim()
        return (
          normalized === "jumlah" ||
          normalized === "total" ||
          normalized === "sum" ||
          normalized === "rata-rata" ||
          normalized === "average"
        )
      })
      if (hasSummaryLabel) return false

      return true
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        tahun_lulus: "",
        jumlah_lulusan: 0,
        jumlah_lulusan_yang_terlacak: 0,
        jumlah_bekerja_sesuai_bidang: 0,
        tingkat_rendah: 0,
        tingkat_sedang: 0,
        tingkat_tinggi: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (["program_studi", "tahun_lulus", "no"].includes(fieldName)) {
          item[fieldName] = value ? String(value).trim() : ""
        } else {
          const num = parseFloat(value)
          item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table
        initialTableData[tableCode] = existingData?.[tableCode] ?? []
      })
    }

    return initialTableData
  },

  // Pada bagian calculateScore(), tambahkan pembulatan dengan Math.round() pada nilai yang perlu dibulatkan:

  calculateScore(data) {
    if (!data || data.length === 0) {
      return {
        scores: [{ butir: 60, nilai: Math.round(skorAkhir) }], // Pembulatan skor akhir
        scoreDetail: { NL: 0, NJ: 0, PJ: 0, PBS: 0, Prmin: 0 },
      }
    }

    let totalLulusan = 0
    let totalTerlacak = 0
    let totalTingkatTinggi = 0

    data.forEach((row) => {
      totalLulusan += Number(row.jumlah_lulusan || 0)
      totalTerlacak += Number(row.jumlah_lulusan_yang_terlacak || 0)
      totalTingkatTinggi += Number(row.tingkat_tinggi || 0)
    })

    // PJ = Persentase lulusan yang terlacak = (NJ / NL) x 100%
    const PJ =
      totalLulusan > 0 ? Math.round((totalTerlacak / totalLulusan) * 100) : 0

    // PBS = Kesesuaian bidang kerja lulusan = (Jumlah tinggi / Jumlah terlacak) x 100%
    const PBS =
      totalTerlacak > 0
        ? Math.round((totalTingkatTinggi / totalTerlacak) * 100)
        : 0

    // Skor awal
    let skor = 0
    if (PBS >= 80) {
      skor = 4
    } else {
      // Jika PBS < 80%, maka Skor = 5 x PBS (dalam desimal)
      skor = 5 * (PBS / 100)
    }

    // Hitung Prmin
    let Prmin = 0
    if (totalLulusan >= 300) {
      Prmin = 30
    } else {
      Prmin = 50 - (totalLulusan / 300) * 20
    }

    // Skor akhir dengan penyesuaian
    let skorAkhir = skor
    if (PJ < Prmin) {
      skorAkhir = (PJ / Prmin) * skor
    }

    // Pastikan skor tidak melebihi 4
    skorAkhir = Math.min(4, Math.round(skorAkhir))

    return {
      scores: [{ butir: 60, nilai: skorAkhir }],
      scoreDetail: {
        NL: totalLulusan,
        NJ: totalTerlacak,
        PJ: PJ,
        PBS: PBS,
        Prmin: Math.round(Prmin),
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const fields = [
        "jumlah_lulusan",
        "jumlah_lulusan_yang_terlacak",
        "jumlah_bekerja_sesuai_bidang",
        "tingkat_rendah",
        "tingkat_sedang",
        "tingkat_tinggi",
      ]
      const normalized = { ...item }
      fields.forEach((field) => {
        normalized[field] = !isNaN(parseFloat(normalized[field]))
          ? Math.max(0, parseFloat(normalized[field]))
          : 0
      })
      return normalized
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, idx) => {
      if (!item.tahun_lulus) {
        errors.push(`Row ${idx + 1}: Tahun Lulus harus diisi`)
      }

      const lulusan = parseFloat(item.jumlah_lulusan || 0)
      const terlacak = parseFloat(item.jumlah_lulusan_yang_terlacak || 0)
      const tingkatRendah = parseFloat(item.tingkat_rendah || 0)
      const tingkatSedang = parseFloat(item.tingkat_sedang || 0)
      const tingkatTinggi = parseFloat(item.tingkat_tinggi || 0)
      const totalTingkat = tingkatRendah + tingkatSedang + tingkatTinggi

      if (terlacak > lulusan) {
        errors.push(
          `Row ${
            idx + 1
          }: Jumlah lulusan yang terlacak tidak boleh melebihi jumlah lulusan`
        )
      }

      if (totalTingkat > terlacak) {
        errors.push(
          `Row ${
            idx + 1
          }: Total tingkat kesesuaian (rendah + sedang + tinggi) tidak boleh melebihi jumlah lulusan yang terlacak`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: Date.now(),
      selected: true,
    }))
  },
}

export default kesesuaianBidangKerjaPlugin
