import { processExcelDataBase } from "../utils/tableUtils"

function truncateToTwoDecimals(num) {
  const parts = String(num).split(".")
  if (parts.length === 1) return num
  const decimal = parts[1].substring(0, 2)
  return Number(`${parts[0]}.${decimal}`)
}

const seleksiMahasiswaD3Plugin = {
  getInfo() {
    return {
      code: "2a2",
      name: "Student Selection Plugin",
      description: "Plugin for student selection section 2a2",
    }
  },

  configureSection(config) {
    return { ...config, isStudentSection: true }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      const allNumbers = nonEmptyValues.every(
        (val) =>
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(val) && val.trim() !== "")
      )

      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false
        const normalized = String(cell).toLowerCase().trim()
        return ["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })

      if (hasSummaryLabel) return false

      return !allNumbers || nonEmptyValues.length === 0
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        tahun_akademik: "",
        daya_tampung: 0,
        pendaftar_jumlah_calon_mahasiswa: 0,
        lulus_seleksi_jumlah_calon_mahasiswa: 0,
        reguler_jumlah_mahasiswa_baru: 0,
        transfer_jumlah_mahasiswa_baru: 0,
        reguler_jumlah_mahasiswa_aktif: 0,
        transfer_jumlah_mahasiswa_aktif: 0,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "tahun_akademik") {
          const normalizedValue = String(value || "")
            .toLowerCase()
            .trim()
          if (
            ["jumlah", "total", "sum", "rata-rata", "average"].includes(
              normalizedValue
            )
          ) {
            return
          }
          item[fieldName] = value ? String(value).trim() : ""
        } else if (
          [
            "daya_tampung",
            "pendaftar_jumlah_calon_mahasiswa",
            "lulus_seleksi_jumlah_calon_mahasiswa",
            "reguler_jumlah_mahasiswa_baru",
            "transfer_jumlah_mahasiswa_baru",
            "reguler_jumlah_mahasiswa_aktif",
            "transfer_jumlah_mahasiswa_aktif",
          ].includes(fieldName)
        ) {
          const num = parseFloat(value)
          item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
        } else {
          item[fieldName] = value ? String(value).trim() : ""
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
          const years = ["TS-3", "TS-2", "TS-1", "TS"]

          initialTableData[tableCode] = years.map((year) => ({
            key: `default-${year}-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 5)}`,
            tahun_akademik: year,
            daya_tampung: 0,
            pendaftar_jumlah_calon_mahasiswa: 0,
            lulus_seleksi_jumlah_calon_mahasiswa: 0,
            reguler_jumlah_mahasiswa_baru: 0,
            transfer_jumlah_mahasiswa_baru: 0,
            reguler_jumlah_mahasiswa_aktif: 0,
            transfer_jumlah_mahasiswa_aktif: 0,
            selected: true,
          }))
        }
      })
    }

    return initialTableData
  },

  async calculateScore(data, config, additionalData = {}) {
    const forceCalculation = additionalData.forcedCalculation === true

    if (!forceCalculation) {
      return {
        scores: null,
        scoreDetail: null,
        message: "Calculations only performed on save",
      }
    }

    try {
      const componentA =
        additionalData.componentA !== undefined
          ? parseFloat(additionalData.componentA)
          : 0

      const componentASource =
        additionalData.componentASource || "Default value"

      const validData = data.filter((item) => {
        if (!item.tahun_akademik) return false
        const normalized = String(item.tahun_akademik).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })

      let totalPendaftar = 0
      let totalLulusSeleksi = 0

      validData.forEach((item) => {
        totalPendaftar += parseFloat(item.pendaftar_jumlah_calon_mahasiswa) || 0
        totalLulusSeleksi +=
          parseFloat(item.lulus_seleksi_jumlah_calon_mahasiswa) || 0
      })

      console.log("Total pendaftar dari semua tahun:", totalPendaftar)
      console.log("Total lulus seleksi dari semua tahun:", totalLulusSeleksi)

      const rasioSeleksi =
        totalLulusSeleksi > 0 ? totalPendaftar / totalLulusSeleksi : 0

      let componentB = 0
      if (rasioSeleksi >= 3) {
        componentB = 4
      } else {
        componentB = (4 * rasioSeleksi) / 3
      }

      const finalScore = (componentA + componentB) / 2

      return {
        scores: [
          {
            butir: 13,
            nilai: parseFloat(finalScore),
          },
        ],
        scoreDetail: {
          rasio: truncateToTwoDecimals(rasioSeleksi),
          A: componentA,
          B: parseFloat(componentB),
        },
        log: {
          message: "Calculation completed successfully",
          dataUsed: validData.length,
          calculationMethod: "Using combined data from all rows",
        },
      }
    } catch (error) {
      console.error("Error calculating student selection score:", error)
      return {
        scores: [{ butir: 13, nilai: 0 }],
        scoreDetail: null,
        error: error.message,
      }
    }
  },

  normalizeData(data) {
    return data
      .filter((item) => {
        if (!item.tahun_akademik) return true
        const normalized = String(item.tahun_akademik).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item) => {
        const numericFields = [
          "daya_tampung",
          "pendaftar_jumlah_calon_mahasiswa",
          "lulus_seleksi_jumlah_calon_mahasiswa",
          "reguler_jumlah_mahasiswa_baru",
          "transfer_jumlah_mahasiswa_baru",
          "reguler_jumlah_mahasiswa_aktif",
          "transfer_jumlah_mahasiswa_aktif",
        ]

        const result = { ...item }

        numericFields.forEach((field) => {
          result[field] = !isNaN(parseFloat(result[field]))
            ? Math.max(0, parseFloat(result[field]))
            : 0
        })

        return result
      })
  },

  validateData(data) {
    const errors = []

    const filteredData = data.filter((item) => {
      if (!item.tahun_akademik) return true
      const normalized = String(item.tahun_akademik).toLowerCase().trim()
      return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
        normalized
      )
    })

    filteredData.forEach((item, index) => {
      if (!item.tahun_akademik) {
        errors.push(`Row ${index + 1}: Tahun akademik harus diisi`)
      }

      if (
        item.pendaftar_jumlah_calon_mahasiswa <
        item.lulus_seleksi_jumlah_calon_mahasiswa
      ) {
        errors.push(
          `Row ${
            index + 1
          }: Jumlah pendaftar tidak boleh lebih kecil dari jumlah yang lulus seleksi`
        )
      }

      if (item.daya_tampung <= 0) {
        errors.push(`Row ${index + 1}: Daya tampung harus lebih besar dari 0`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data
      .filter((item) => {
        if (!item.tahun_akademik) return true
        const normalized = String(item.tahun_akademik).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => ({
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }))
  },
}

export default seleksiMahasiswaD3Plugin
