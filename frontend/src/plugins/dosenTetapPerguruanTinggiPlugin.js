/**
 * Plugin khusus untuk section Dosen Tetap Perguruan Tinggi
 */
import { processExcelDataBase } from "../utils/tableUtils"

const DosenTetapPerguruanTinggiPlugin = {
  getInfo() {
    return {
      code: "3a1",
      name: "Dosen Tetap Perguruan Tinggi Plugin",
      description: "Plugin for processing permanent university lecturer data",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isDosenTetapSection: true,
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
        nama_dosen: "",
        jabatan_akademik: "",
        sertifikat_pendidik_profesional: "",
        sertifikat_kompetensi: "",
        mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6: "",
        kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7: "",
        mata_kuliah_yang_diampu_pada_ps_lain_8: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "no" || fieldName === "nidn") {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
        } else if (
          fieldName === "sertifikat_pendidik_profesional" ||
          fieldName === "sertifikat_kompetensi"
        ) {
          const strVal = String(value || "")
            .toLowerCase()
            .trim()
          item[fieldName] = [
            "yes",
            "ya",
            "ada",
            "v",
            "√",
            "✓",
            "1",
            "true",
          ].includes(strVal)
            ? "Ya"
            : ["no", "tidak", "0", "false"].includes(strVal)
            ? "Tidak"
            : strVal
        } else {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
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
              key: `default-dosen-${Date.now()}`,
              no: 1,
              selected: true,
              nama_dosen: "",
              jabatan_akademik: "",
              sertifikat_pendidik_profesional: "",
              sertifikat_kompetensi: "",
              mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6: "",
              kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7: "",
              mata_kuliah_yang_diampu_pada_ps_lain_8: "",
            },
          ]
        }
      })
    }

    return initialTableData
  },

  calculateScore(data) {
    let totalLecturers = data.length
    let doctorCount = 0
    let certifiedCount = 0
    let fieldMatchCount = 0

    data.forEach((lecturer) => {
      if (
        lecturer.pendidikan_pasca_sarjana_doktor &&
        lecturer.pendidikan_pasca_sarjana_doktor.trim() !== ""
      ) {
        doctorCount++
      }

      if (
        ["ya", "yes", "ada", "v", "√", "✓", "1", "true"].includes(
          String(lecturer.sertifikat_pendidik_profesional || "").toLowerCase()
        )
      ) {
        certifiedCount++
      }

      if (
        ["ya", "yes", "sesuai", "v", "√", "✓", "1", "true"].includes(
          String(
            lecturer.kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7 ||
              ""
          ).toLowerCase()
        )
      ) {
        fieldMatchCount++
      }
    })

    const doctorPercentage =
      totalLecturers > 0 ? (doctorCount / totalLecturers) * 100 : 0
    const certifiedPercentage =
      totalLecturers > 0 ? (certifiedCount / totalLecturers) * 100 : 0
    const fieldMatchPercentage =
      totalLecturers > 0 ? (fieldMatchCount / totalLecturers) * 100 : 0

    const compositeScore =
      doctorPercentage * 0.4 +
      certifiedPercentage * 0.3 +
      fieldMatchPercentage * 0.3

    const score = Math.min(4, compositeScore / 25)

    return {
      score: score,
      scoreDetail: {
        totalLecturers,
        doctorCount,
        certifiedCount,
        fieldMatchCount,
        doctorPercentage: doctorPercentage.toFixed(2) + "%",
        certifiedPercentage: certifiedPercentage.toFixed(2) + "%",
        fieldMatchPercentage: fieldMatchPercentage.toFixed(2) + "%",
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_dosen",
        "jabatan_akademik",
        "sertifikat_pendidik_profesional",
        "sertifikat_kompetensi",
        "mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6",
        "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7",
        "mata_kuliah_yang_diampu_pada_ps_lain_8",
      ]

      textFields.forEach((field) => {
        if (result[field] === undefined || result[field] === null) {
          result[field] = ""
        } else if (typeof result[field] === "object") {
          result[field] = String(result[field])
        } else if (typeof result[field] !== "string") {
          result[field] = String(result[field])
        }
      })

      return result
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_dosen) {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }

      if (item.nidn && !/^\d+$/.test(item.nidn)) {
        errors.push(`Row ${index + 1}: NIDN harus berupa angka`)
      }

      if (!item.mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6) {
        errors.push(
          `Row ${
            index + 1
          }: Mata kuliah yang diampu pada PS yang diakreditasi harus diisi`
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

export default DosenTetapPerguruanTinggiPlugin
