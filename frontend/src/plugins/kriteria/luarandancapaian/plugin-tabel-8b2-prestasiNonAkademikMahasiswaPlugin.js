import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class PrestasiNonAkademikMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8b2",
      name: "Prestasi Non-Akademik Mahasiswa Plugin",
      description:
        "Plugin for student non-academic achievements data processing",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPrestasiNonAkademikMahasiswaSection: true,
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
        key: `excel-nonakademik-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        nama_kegiatan: "",
        tingkat_lokal_wilayah: false,
        tingkat_nasional: false,
        tingkat_internasional: false,
        prestasi_yang_dicapai: "",
        waktu_perolehan_hh_bb_tttt: null,
      }

      const defaultColMapping = {
        nama_kegiatan: 1,
        waktu_perolehan_hh_bb_tttt: 2,
        tingkat_internasional: 3,
        tingkat_nasional: 4,
        tingkat_lokal_wilayah: 5,
      }

      Object.keys(item).forEach((fieldName) => {
        if (["key", "selected", "no"].includes(fieldName)) return

        const colIndex =
          detectedIndices && detectedIndices[fieldName] !== undefined
            ? detectedIndices[fieldName]
            : defaultColMapping[fieldName]

        if (colIndex === undefined || colIndex < 0 || colIndex >= row.length)
          return

        const value = row[colIndex]

        if (
          fieldName === "prestasi_yang_dicapai" ||
          fieldName === "nama_kegiatan"
        ) {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else if (fieldName.startsWith("tingkat_")) {
          item[fieldName] = this.parseBooleanField(value)
        } else if (fieldName === "waktu_perolehan_hh_bb_tttt") {
          item[fieldName] = this.parseDateField(value)
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  parseBooleanField(value) {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      const normalized = value.toLowerCase().trim()
      return ["ya", "yes", "v", "1", "true", "√", "✓", "x"].includes(normalized)
    }
    if (typeof value === "number") return value > 0
    return false
  }

  parseDateField(value) {
    if (typeof value === "number" && value > 20000 && value < 60000) {
      return value
    }

    if (value instanceof Date) {
      const excelDate = Math.floor(
        (value.getTime() - new Date(1899, 11, 30).getTime()) /
          (24 * 60 * 60 * 1000)
      )
      return excelDate > 0 ? excelDate : null
    }

    if (typeof value === "string" && value.trim() !== "") {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        const excelDate = Math.floor(
          (date.getTime() - new Date(1899, 11, 30).getTime()) /
            (24 * 60 * 60 * 1000)
        )
        return excelDate > 0 ? excelDate : null
      }
    }

    return null
  }

  async calculateScore(data, config, additionalData = {}) {
    const allRows =
      data && data.allRows ? data.allRows : Array.isArray(data) ? data : []
    const NM = additionalData.jumlahMahasiswaTS || 50 // Default value, should be provided

    let NI = 0,
      NN = 0,
      NW = 0

    if (!allRows || allRows.length === 0) {
      console.warn(
        "Prestasi Non-Akademik: Tidak ada data prestasi untuk diproses."
      )
    } else {
      allRows.forEach((item) => {
        if (item.tingkat_internasional === true) NI++
        else if (item.tingkat_nasional === true) NN++
        else if (item.tingkat_lokal_wilayah === true) NW++
      })
    }

    if (typeof NM !== "number" || NM <= 0) {
      console.warn(
        `Prestasi Non-Akademik: Jumlah Mahasiswa TS (NM) tidak valid: ${NM}`
      )
      return {
        scores: [{ butir: 60, nilai: 0 }],
        scoreDetail: { NI, NN, NW, NM: NM || 0 },
      }
    }

    const RI = NI / NM
    const RN = NN / NM
    const RW = NW / NM

    // Factors for NON-ACADEMIC
    const a = 0.002 // 0.2%
    const b = 0.02 // 2%
    const c = 0.04 // 4%

    let skor = 0
    if (RI > a && RN > b) {
      skor = 4
    } else {
      const nilaiKompleks =
        3.75 *
        (RI / a +
          RN / b +
          RW / c / 2 -
          (RI / a) * (RN / b) -
          ((RI / a) * (RW / c)) / 2 -
          ((RN / b) * (RW / c)) / 2 +
          ((RI / a) * (RN / b) * (RW / c)) / 2)
      skor = Math.max(0, nilaiKompleks)
    }

    const skorFinal = parseFloat(Math.max(0, Math.min(4, skor)).toFixed(2))

    console.log("NI:", NI, "NN:", NN, "NW:", NW, "NM:", NM)
    console.log("RI:", RI, "RN:", RN, "RW:", RW)
    console.log("Score:", skorFinal)

    return {
      scores: [{ butir: 60, nilai: skorFinal }],
      scoreDetail: {
        NI,
        NN,
        NW,
        NM,
        RI: parseFloat(RI.toFixed(5)),
        RN: parseFloat(RN.toFixed(5)),
        RW: parseFloat(RW.toFixed(5)),
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = ["nama_kegiatan", "prestasi_yang_dicapai"]
      const booleanFields = [
        "tingkat_nasional",
        "tingkat_internasional",
        "tingkat_lokal_wilayah",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      booleanFields.forEach((field) => {
        result[field] = this.parseBooleanField(result[field])
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.")
      return { valid: false, errors }
    }

    data.forEach((item, index) => {
      if (!item.nama_kegiatan || String(item.nama_kegiatan).trim() === "") {
        errors.push(`Baris ${index + 1}: Nama Kegiatan harus diisi.`)
      }

      const nasional = item.tingkat_nasional === true
      const internasional = item.tingkat_internasional === true
      const lokal = item.tingkat_lokal_wilayah === true

      if (!nasional && !internasional && !lokal) {
        errors.push(
          `Baris ${
            index + 1
          }: Minimal satu tingkat harus dipilih untuk prestasi '${
            item.nama_kegiatan
          }'.`
        )
      }

      let countSelectedLevels = 0
      if (nasional) countSelectedLevels++
      if (internasional) countSelectedLevels++
      if (lokal) countSelectedLevels++

      if (countSelectedLevels > 1) {
        errors.push(
          `Baris ${index + 1}: Prestasi '${
            item.nama_kegiatan
          }' hanya boleh untuk satu tingkat. Terpilih ${countSelectedLevels} tingkat.`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const prestasiNonAkademikMahasiswaPlugin =
  new PrestasiNonAkademikMahasiswaPlugin()

export default prestasiNonAkademikMahasiswaPlugin