import { processExcelDataBase } from "../utils/tableUtils"
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

const KepuasanPenggunaLulusanPlugin = {
  getInfo() {
    return {
      code: "8e2",
      name: "Tingkat Kepuasan Pengguna Lulusan Plugin",
      description:
        "Plugin for processing graduate user satisfaction level data",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isKepuasanPenggunaSection: true,
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
        jenis_kemampuan: "",
        tingkat_sangat_baik: "0",
        tingkat_baik: "0",
        tingkat_cukup: "0",
        tingkat_kurang: "0",
        rencana_tindak_lanjut_oleh_upps_ps: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        // Convert all values to string
        item[fieldName] =
          value !== undefined && value !== null ? String(value).trim() : ""

        // Remove % symbols from percentage fields if present
        if (
          fieldName === "tingkat_sangat_baik" ||
          fieldName === "tingkat_baik" ||
          fieldName === "tingkat_cukup" ||
          fieldName === "tingkat_kurang"
        ) {
          item[fieldName] = item[fieldName].replace(/%/g, "")
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
              key: `default-kepuasan-${Date.now()}`,
              no: "1",
              selected: true,
              jenis_kemampuan: "Etika",
              tingkat_sangat_baik: "0",
              tingkat_baik: "0",
              tingkat_cukup: "0",
              tingkat_kurang: "0",
              rencana_tindak_lanjut_oleh_upps_ps: "",
            },
            {
              key: `default-kepuasan-${Date.now() + 1}`,
              no: "2",
              selected: true,
              jenis_kemampuan: "Keahlian pada bidang ilmu (kompetensi utama)",
              tingkat_sangat_baik: "0",
              tingkat_baik: "0",
              tingkat_cukup: "0",
              tingkat_kurang: "0",
              rencana_tindak_lanjut_oleh_upps_ps: "",
            },
            {
              key: `default-kepuasan-${Date.now() + 2}`,
              no: "3",
              selected: true,
              jenis_kemampuan: "Kemampuan berbahasa asing",
              tingkat_sangat_baik: "0",
              tingkat_baik: "0",
              tingkat_cukup: "0",
              tingkat_kurang: "0",
              rencana_tindak_lanjut_oleh_upps_ps: "",
            },
            {
              key: `default-kepuasan-${Date.now() + 3}`,
              no: "4",
              selected: true,
              jenis_kemampuan: "Penggunaan teknologi informasi",
              tingkat_sangat_baik: "0",
              tingkat_baik: "0",
              tingkat_cukup: "0",
              tingkat_kurang: "0",
              rencana_tindak_lanjut_oleh_upps_ps: "",
            },
            {
              key: `default-kepuasan-${Date.now() + 4}`,
              no: "5",
              selected: true,
              jenis_kemampuan: "Kemampuan berkomunikasi",
              tingkat_sangat_baik: "0",
              tingkat_baik: "0",
              tingkat_cukup: "0",
              tingkat_kurang: "0",
              rencana_tindak_lanjut_oleh_upps_ps: "",
            },
            {
              key: `default-kepuasan-${Date.now() + 5}`,
              no: "6",
              selected: true,
              jenis_kemampuan: "Kerjasama tim",
              tingkat_sangat_baik: "0",
              tingkat_baik: "0",
              tingkat_cukup: "0",
              tingkat_kurang: "0",
              rencana_tindak_lanjut_oleh_upps_ps: "",
            },
            {
              key: `default-kepuasan-${Date.now() + 6}`,
              no: "7",
              selected: true,
              jenis_kemampuan: "Pengembangan diri",
              tingkat_sangat_baik: "0",
              tingkat_baik: "0",
              tingkat_cukup: "0",
              tingkat_kurang: "0",
              rencana_tindak_lanjut_oleh_upps_ps: "",
            },
          ]
        }
      })
    }

    return initialTableData
  },

  async calculateScore(data, config, additionalData = {}) {
    console.log("Calculating kepuasan pengguna score with data:", data)

    const prodiId = additionalData.userData.prodiId
    const scoreDetailsResponse = await fetchScoreDetails(prodiId, "8e1")
    console.log("Fetched score details from 8e1:", scoreDetailsResponse)

    // Extract the required values from the API response
    let NL = 0
    let NJ = 0
    let PJ = 0
    let Prmin = 0

    if (scoreDetailsResponse) {
      NL = parseFloat(scoreDetailsResponse.NL || "0")
      NJ = parseFloat(scoreDetailsResponse.NJ || "0")
      PJ = parseFloat(scoreDetailsResponse.PJ?.replace("%", "") || "0")
      Prmin = parseFloat(scoreDetailsResponse.Prmin?.replace("%", "") || "0")
    } else {
      // Fallback to additionalData if API fails or returns incomplete data
      NL = parseFloat(additionalData.jumlahLulusan || "0")
      NJ = parseFloat(additionalData.jumlahResponden || "0")

      // Calculate percentage of users who provided feedback (PJ)
      PJ = NJ > 0 ? (NJ / NL) * 100 : 0

      // Determine minimum percentage of respondents (Prmin)
      if (NL >= 300) {
        Prmin = 30
      } else {
        Prmin = 50 - (NL / 300) * 20
      }
    }

    console.log(`Using values: NL=${NL}, NJ=${NJ}, PJ=${PJ}%, Prmin=${Prmin}%`)

    // Calculate TKi for each capability type
    const tkiValues = data.map((item) => {
      // Parse string values to numbers for calculation
      const tingkat_sangat_baik = parseFloat(item.tingkat_sangat_baik || "0")
      const tingkat_baik = parseFloat(item.tingkat_baik || "0")
      const tingkat_cukup = parseFloat(item.tingkat_cukup || "0")
      const tingkat_kurang = parseFloat(item.tingkat_kurang || "0")

      // TKi = (4 × ai) + (3 × bi) + (2 × ci) + di
      return (
        4 * tingkat_sangat_baik +
        3 * tingkat_baik +
        2 * tingkat_cukup +
        tingkat_kurang
      )
    })

    console.log(
      "Raw percentage data:",
      data.map((item) => ({
        sb: parseFloat(item.tingkat_sangat_baik || "0"),
        b: parseFloat(item.tingkat_baik || "0"),
        c: parseFloat(item.tingkat_cukup || "0"),
        k: parseFloat(item.tingkat_kurang || "0"),
      }))
    )

    console.log("TKI values:", tkiValues)

    // Calculate average score
    const totalTKi = tkiValues.reduce((sum, tki) => sum + tki, 0)
    const avgScore = tkiValues.length > 0 ? totalTKi / tkiValues.length : 0

    // Apply adjustment if response percentage doesn't meet minimum requirement
    let finalScore = avgScore
    if (PJ < Prmin) {
      finalScore = (PJ / Prmin) * avgScore
    }

    // Calculate individual TKi scores for each capability
    const individualScores = data.map((item, index) => {
      return {
        jenis_kemampuan: item.jenis_kemampuan,
        tki: tkiValues[index],
        persentase: {
          tingkat_sangat_baik:
            parseFloat(item.tingkat_sangat_baik || "0") + "%",
          tingkat_baik: parseFloat(item.tingkat_baik || "0") + "%",
          tingkat_cukup: parseFloat(item.tingkat_cukup || "0") + "%",
          tingkat_kurang: parseFloat(item.tingkat_kurang || "0") + "%",
        },
      }
    })

    // Return score details
    return {
      scores: [
        {
          butir: 62,
          nilai: finalScore,
        },
      ],
      scoreDetail: {
        NL,
        NJ,
        PJ: PJ + "%",
        Prmin: Prmin + "%",
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      // Ensure all fields exist as strings at minimum
      const allFields = [
        "jenis_kemampuan",
        "tingkat_sangat_baik",
        "tingkat_baik",
        "tingkat_cukup",
        "tingkat_kurang",
        "rencana_tindak_lanjut_oleh_upps_ps",
      ]

      allFields.forEach((field) => {
        // Convert all values to strings, handling null/undefined/boolean values
        if (result[field] === undefined || result[field] === null) {
          result[field] = field.startsWith("tingkat_") ? "0" : ""
        } else if (typeof result[field] === "boolean") {
          // If somehow the field became a boolean, convert it to a string
          result[field] = result[field]
            ? field.startsWith("tingkat_")
              ? "100"
              : "Ya"
            : field.startsWith("tingkat_")
            ? "0"
            : ""
        } else {
          // Ensure it's a string
          result[field] = String(result[field])
        }

        // Clean percentage symbols if present in percentage fields
        if (field.startsWith("tingkat_") && result[field].includes("%")) {
          result[field] = result[field].replace(/%/g, "")
        }
      })

      return result
    })
  },

  validateData(data) {
    const errors = []

    // Check if all 7 required types of capabilities are present
    const requiredCapabilities = [
      "Etika",
      "Keahlian pada bidang ilmu",
      "Kemampuan berbahasa asing",
      "Penggunaan teknologi informasi",
      "Kemampuan berkomunikasi",
      "Kerjasama tim",
      "Pengembangan diri",
    ]

    const capabilities = data.map((item) =>
      String(item.jenis_kemampuan).toLowerCase()
    )

    requiredCapabilities.forEach((capability) => {
      const found = capabilities.some((cap) =>
        cap.toLowerCase().includes(capability.toLowerCase())
      )

      if (!found) {
        errors.push(`Jenis kemampuan "${capability}" wajib diisi`)
      }
    })

    // Check for data validity in each row
    data.forEach((item, index) => {
      if (!item.jenis_kemampuan) {
        errors.push(`Row ${index + 1}: Jenis kemampuan harus diisi`)
      }

      // Check that percentages add up to 100%
      const totalPercentage =
        parseFloat(item.tingkat_sangat_baik || "0") +
        parseFloat(item.tingkat_baik || "0") +
        parseFloat(item.tingkat_cukup || "0") +
        parseFloat(item.tingkat_kurang || "0")

      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(
          `Row ${
            index + 1
          }: Total persentase (${totalPercentage}%) harus sama dengan 100%`
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
        no: String(index + 1),
        _timestamp: new Date().getTime(),
        selected: true,
      }

      // Make sure all values are strings (except for special fields)
      Object.keys(preparedItem).forEach((key) => {
        if (key !== "_timestamp" && key !== "selected" && key !== "key") {
          preparedItem[key] = String(preparedItem[key] || "")
        }
      })

      return preparedItem
    })
  },
}

export default KepuasanPenggunaLulusanPlugin
