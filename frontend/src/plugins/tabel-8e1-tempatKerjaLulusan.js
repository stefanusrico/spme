/**
 * Plugin khusus untuk section Lulusan Terlacak yang Bekerja
 */
import { processExcelDataBase } from "../utils/tableUtils"

const LulusanTerlacakPlugin = {
  getInfo() {
    return {
      code: "8e1",
      name: "Lulusan Terlacak Plugin",
      description: "Plugin for processing tracked graduate employment data",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isLulusanTerlacakSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices, jsonData, headerRowIndex } =
      await processExcelDataBase(workbook, tableCode, config, prodiName)

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      const allNumbers = nonEmptyValues.every((val) => {
        return (
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(val) && val.trim() !== "")
        )
      })
      if (allNumbers && nonEmptyValues.length > 0) return false

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
        selected: true,
        tahun_lulus: "",
        jumlah_lulusan: 0,
        jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
        jumlah_lulusan_yang_terlacak: 0,
        tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
        tingkat_nasional_berwirausaha_berizin: 0,
        tingkat_multinasional_internasional: 0,
      }

      // Extract tahun_lulus value - check first or second column for TS-n format
      const firstCol = String(row[0] || "").trim()
      const secondCol = String(row[1] || "").trim()
      if (/^TS-\d+$/i.test(firstCol)) {
        item.tahun_lulus = firstCol
      } else if (/^TS-\d+$/i.test(secondCol)) {
        item.tahun_lulus = secondCol
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "tahun_lulus") {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
        } else {
          // Numeric fields
          const numValue =
            typeof value === "number"
              ? value
              : value !== undefined && value !== null && value !== ""
              ? parseFloat(String(value).replace(/[^\d.-]/g, ""))
              : 0

          item[fieldName] = isNaN(numValue) ? 0 : numValue
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

        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          initialTableData[tableCode] = existingData[tableCode]
        } else {
          initialTableData[tableCode] = [
            {
              key: `default-lulusan-${Date.now()}`,
              no: 1,
              selected: true,
              tahun_lulus: "TS-4",
              jumlah_lulusan: 0,
              jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
              jumlah_lulusan_yang_terlacak: 0,
              tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
              tingkat_nasional_berwirausaha_berizin: 0,
              tingkat_multinasional_internasional: 0,
            },
            {
              key: `default-lulusan-${Date.now() + 1}`,
              no: 2,
              selected: true,
              tahun_lulus: "TS-3",
              jumlah_lulusan: 0,
              jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
              jumlah_lulusan_yang_terlacak: 0,
              tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
              tingkat_nasional_berwirausaha_berizin: 0,
              tingkat_multinasional_internasional: 0,
            },
            {
              key: `default-lulusan-${Date.now() + 2}`,
              no: 3,
              selected: true,
              tahun_lulus: "TS-2",
              jumlah_lulusan: 0,
              jumlah_pengguna_lulusan_yang_memberi_tanggapan: 0,
              jumlah_lulusan_yang_terlacak: 0,
              tingkat_lokal_wilayah_berwirausaha_tidak_berizin: 0,
              tingkat_nasional_berwirausaha_berizin: 0,
              tingkat_multinasional_internasional: 0,
            },
          ]
        }
      })
    }

    return initialTableData
  },

  calculateScore(data, config, additionalData = {}) {
    console.log("Calculating lulusan terlacak score with data:", data)

    // Hanya mempertimbangkan data 3 tahun terakhir (TS-4 s.d. TS-2)
    const validData = data.filter((item) => {
      const tahun = String(item.tahun_lulus).trim().toUpperCase()
      return tahun === "TS-4" || tahun === "TS-3" || tahun === "TS-2"
    })

    // Perhitungan total dari semua lulusan dalam 3 tahun terakhir
    let NL = 0 // Jumlah lulusan total
    let NJ = 0 // Jumlah lulusan yang terlacak
    let NI = 0 // Jumlah lulusan di tingkat internasional
    let NN = 0 // Jumlah lulusan di tingkat nasional
    let NW = 0 // Jumlah lulusan di tingkat wilayah/lokal
    let PR = 0 // Jumlah pengguna lulusan yang memberi tanggapan

    validData.forEach((item) => {
      NL += item.jumlah_lulusan || 0
      NJ += item.jumlah_lulusan_yang_terlacak || 0
      NI += item.tingkat_multinasional_internasional || 0
      NN += item.tingkat_nasional_berwirausaha_berizin || 0
      NW += item.tingkat_lokal_wilayah_berwirausaha_tidak_berizin || 0
      PR += item.jumlah_pengguna_lulusan_yang_memberi_tanggapan || 0
    })

    // Perhitungan persentase sesuai matriks penilaian
    const PJ = NJ > 0 ? (NL / NJ) * 100 : 0
    const RI = NL > 0 ? (NI / NL) * 100 : 0
    const RN = NL > 0 ? (NN / NL) * 100 : 0
    const RW = NL > 0 ? (NW / NL) * 100 : 0
    const persentaseResponden = NL > 0 ? (PR / NL) * 100 : 0

    // Faktor untuk perhitungan skor
    const a = 5 // 5%
    const b = 20 // 20%
    const c = 90 // 90%

    // Menentukan Persentase minimum responden (Prmin)
    let Prmin
    if (NL >= 300) {
      Prmin = 30 // 30%
    } else {
      Prmin = 50 - (NL / 300) * 20 // 50% - ((NL/300) x 20%)
    }

    // Menghitung skor berdasarkan matriks penilaian
    let skor = 0

    if (RI >= a && RN >= b) {
      skor = 4
    } else if (
      (0 < RI && RI < a) ||
      (0 < RN && RN < b) ||
      (0 < RW && RW <= c)
    ) {
      const A = RI / a
      const B = RN / b
      const C = RW / c

      skor =
        4 *
        (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2)
    } else {
      skor = 0
    }

    // Pastikan skor maksimum 4
    skor = Math.min(skor, 4)

    // Penyesuaian skor jika persentase responden tidak memenuhi ketentuan
    let skorAkhir = skor
    if (persentaseResponden < Prmin) {
      skorAkhir = (PJ / Prmin) * skor
    }

    // Skor akhir juga harus dibatasi maksimal 4
    skorAkhir = Math.min(skorAkhir, 4)

    return {
      scores: [
        {
          butir: 61,
          nilai: skorAkhir.toFixed(2),
        },
      ],
      scoreDetail: {
        NL,
        NJ,
        NI,
        NN,
        NW,
        PR,
        RI: RI + "%",
        RN: RN + "%",
        RW: RW + "%",
        PJ: PJ + "%",
        Prmin: Prmin + "%",
        persentaseResponden: persentaseResponden + "%",
        skor: skor,
        skorAkhir: skorAkhir,
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      // Normalize text fields
      if (typeof result.tahun_lulus !== "string") {
        result.tahun_lulus = String(result.tahun_lulus || "")
      }

      // Normalize numeric fields
      const numericFields = [
        "jumlah_lulusan",
        "jumlah_pengguna_lulusan_yang_memberi_tanggapan",
        "jumlah_lulusan_yang_terlacak",
        "tingkat_lokal_wilayah_berwirausaha_tidak_berizin",
        "tingkat_nasional_berwirausaha_berizin",
        "tingkat_multinasional_internasional",
      ]

      numericFields.forEach((field) => {
        if (
          result[field] === undefined ||
          result[field] === null ||
          result[field] === ""
        ) {
          result[field] = 0
        } else if (typeof result[field] !== "number") {
          const numValue = parseFloat(
            String(result[field]).replace(/[^\d.-]/g, "")
          )
          result[field] = isNaN(numValue) ? 0 : numValue
        }
      })

      return result
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.tahun_lulus) {
        errors.push(`Row ${index + 1}: Tahun lulus harus diisi`)
      }

      if (item.jumlah_lulusan < 0) {
        errors.push(`Row ${index + 1}: Jumlah lulusan tidak boleh negatif`)
      }

      if (item.jumlah_lulusan_yang_terlacak > item.jumlah_lulusan) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah lulusan yang terlacak tidak boleh lebih besar dari jumlah lulusan`
        )
      }

      const totalPenempatan =
        (item.tingkat_lokal_wilayah_berwirausaha_tidak_berizin || 0) +
        (item.tingkat_nasional_berwirausaha_berizin || 0) +
        (item.tingkat_multinasional_internasional || 0)

      if (totalPenempatan > item.jumlah_lulusan_yang_terlacak) {
        errors.push(
          `Row ${
            index + 1
          }: Total lulusan berdasarkan tempat kerja tidak boleh lebih besar dari jumlah lulusan yang terlacak`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => {
      const preparedItem = {
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }

      // Convert any object values to string
      Object.keys(preparedItem).forEach((key) => {
        if (
          typeof preparedItem[key] === "object" &&
          preparedItem[key] !== null
        ) {
          preparedItem[key] = String(preparedItem[key])
        }
      })

      return preparedItem
    })
  },
}

export default LulusanTerlacakPlugin
