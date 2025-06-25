export const PluginUtils = {
  /**
   * Filter baris data yang valid (bukan summary, bukan header)
   */
  filterDataRows(rawData) {
    return rawData.filter((row) => {
      if (!row?.length) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )

      if (nonEmptyValues.length <= 1) return false

      // Deteksi pola baris informasi/metadata yang tidak valid sebagai data
      const isInfoRow = this.detectInfoRow(row, nonEmptyValues)
      if (isInfoRow) return false

      // Skip baris jika semua nilai non-empty adalah angka (lebih ketat)
      const allNumbers = nonEmptyValues.every((val) => {
        const str = String(val).trim()
        // Pastikan bukan string kosong dan benar-benar angka
        return str !== "" && !isNaN(str) && !isNaN(parseFloat(str))
      })

      if (allNumbers && nonEmptyValues.length > 0) {
        // Double check: pastikan tidak ada teks sama sekali
        const hasAnyText = nonEmptyValues.some((val) => {
          const str = String(val).trim()
          return isNaN(str) || isNaN(parseFloat(str))
        })

        if (!hasAnyText) return false
      }

      // Skip baris summary
      const summaryLabels = ["jumlah", "total", "sum", "rata-rata", "average"]
      const hasSummaryLabel = row.some((cell) => {
        const normalized = String(cell || "")
          .toLowerCase()
          .trim()
        return summaryLabels.includes(normalized)
      })
      if (hasSummaryLabel) return false

      // Tambahan: Skip baris yang sel pertamanya adalah angka murni
      const firstCell = String(row[0] || "").trim()
      if (firstCell && !isNaN(firstCell) && !isNaN(parseFloat(firstCell))) {
        // Jika sel pertama adalah angka, periksa apakah ada teks deskriptif di sel kedua
        const secondCell = String(row[1] || "").trim()
        if (
          !secondCell ||
          (!isNaN(secondCell) && !isNaN(parseFloat(secondCell)))
        ) {
          return false // Skip jika sel kedua juga angka atau kosong
        }
      }

      return true
    })
  },

  /**
   * Deteksi apakah baris merupakan baris informasi/metadata
   */
  detectInfoRow(row, nonEmptyValues) {
    // Pattern 1: Baris dengan hanya 1-2 kolom berisi data dan salah satunya adalah label info
    if (nonEmptyValues.length <= 2) {
      const firstNonEmpty = nonEmptyValues[0]
      const firstStr = String(firstNonEmpty || "")
        .toLowerCase()
        .trim()

      // Jika hanya ada 1-2 data dan yang pertama adalah label info
      const infoLabels = [
        "info",
        "info:",
        "catatan",
        "note",
        "link data",
        "daftar tabel",
        "sumber",
        "diisi oleh",
      ]

      const isInfoLabel = infoLabels.some(
        (label) => firstStr === label || firstStr.startsWith(label)
      )

      if (isInfoLabel) return true
    }

    // Pattern 2: Baris yang mengandung "Info:" di kolom pertama/kedua DAN tidak memiliki data numerik yang cukup
    const firstTwoCells = row.slice(0, 2)
    const hasInfoInFirstTwo = firstTwoCells.some((cell) => {
      const str = String(cell || "")
        .toLowerCase()
        .trim()
      return str === "info:" || str.startsWith("info:")
    })

    if (hasInfoInFirstTwo) {
      // Hitung berapa banyak data numerik/valid yang ada
      const numericData = row.filter((cell) => {
        const val = String(cell || "").trim()
        return val !== "" && !isNaN(val) && val !== "0"
      })

      // Jika ada "Info:" di awal dan data numerik sedikit, maka ini baris info
      if (numericData.length < 3) {
        return true
      }
    }

    // Pattern 3: Baris yang pattern-nya seperti header/info berdasarkan konten
    const firstCell = String(row[0] || "")
      .toLowerCase()
      .trim()

    // Skip jika sel pertama mengandung pattern header
    const headerPatterns = [
      "program studi",
      "no.",
      "jumlah mahasiswa",
      "tabel",
      "daftar",
    ]

    const isHeaderPattern = headerPatterns.some((pattern) =>
      firstCell.includes(pattern)
    )

    if (isHeaderPattern) return true

    return false
  },

  /**
   * Parse nilai boolean dari berbagai format
   */
  parseBoolean(value) {
    const strVal = String(value || "")
      .toLowerCase()
      .trim()
    const trueValues = ["yes", "ya", "ada", "v", "√", "✓", "1", "true"]
    const falseValues = ["no", "tidak", "0", "false", "x"]

    if (trueValues.includes(strVal)) return "V"
    if (falseValues.includes(strVal)) return "Tidak"
    return strVal
  },

  /**
   * Normalisasi field teks
   */
  normalizeTextField(value) {
    if (value === undefined || value === null) return ""
    if (typeof value === "object") return JSON.stringify(value)
    return String(value).trim()
  },

  /**
   * Parse nilai numerik dengan fallback
   * @param {any} value - Nilai yang akan diparse
   * @param {number} defaultValue - Nilai default jika parsing gagal
   * @param {boolean} preserveDecimals - Apakah akan mempertahankan desimal
   * @param {number} decimalPlaces - Jumlah angka desimal yang dipertahankan
   * @returns {number} Hasil parsing
   */
  parseNumber(
    value,
    defaultValue = 0,
    preserveDecimals = true,
    decimalPlaces = 2
  ) {
    if (value === null || value === undefined || value === "") {
      return defaultValue
    }

    try {
      // Handle string values with commas as decimal separator
      if (typeof value === "string") {
        // Replace commas with periods for proper parsing
        value = value.replace(/,/g, ".")
      }

      const num = Number(value)
      if (isNaN(num)) {
        return defaultValue
      }

      // Return as is if preserving all decimals
      if (preserveDecimals) {
        return num
      }

      // Round to specified decimal places
      return Number(num.toFixed(decimalPlaces))
    } catch (e) {
      console.error("Error parsing number:", value, e)
      return defaultValue
    }
  },

  /**
   * Parse angka desimal (float) dengan mempertahankan digit desimal
   */
  parseFloat(value, defaultValue = 0) {
    return this.parseNumber(value, defaultValue, true)
  },

  /**
   * Parse angka bulat (integer)
   */
  parseInt(value, defaultValue = 0) {
    const num = this.parseNumber(value, defaultValue, false, 0)
    return Math.round(num)
  },

  /**
   * Format angka dengan jumlah desimal tertentu
   */
  formatNumber(value, decimalPlaces = 2) {
    const num = this.parseNumber(value, 0, true)
    return num.toFixed(decimalPlaces)
  },

  /**
   * Parse tahun dengan validasi
   */
  parseYear(value, minYear = 2000) {
    const year = parseInt(value)
    const currentYear = new Date().getFullYear()

    if (isNaN(year) || year < minYear || year > currentYear + 1) {
      return currentYear
    }
    return year
  },

  roundToDecimal(num, decimals = 2) {
    if (typeof num !== "number" || isNaN(num)) return 0
    const multiplier = Math.pow(10, decimals)
    return Math.round((num + Number.EPSILON) * multiplier) / multiplier
  },

  /**
   * Create validator function dari rules
   */
  createValidator(rules) {
    return (data) => {
      const errors = []

      data.forEach((item, index) => {
        rules.forEach((rule) => {
          const value = rule.field ? rule.field : item[rule.fieldName]

          // Check required
          if (rule.required !== false && !value && value !== 0) {
            errors.push(
              rule.message ||
                `Row ${index + 1}: ${rule.fieldName || "Field"} harus diisi`
            )
          }

          // Check validator function
          if (
            (value || value === 0) &&
            rule.validator &&
            !rule.validator(value, item)
          ) {
            errors.push(
              rule.message ||
                `Row ${index + 1}: ${rule.fieldName || "Field"} tidak valid`
            )
          }

          // Check regex pattern
          if (
            (value || value === 0) &&
            rule.pattern &&
            !rule.pattern.test(String(value))
          ) {
            errors.push(
              rule.message ||
                `Row ${index + 1}: ${
                  rule.fieldName || "Field"
                } format tidak sesuai`
            )
          }
        })
      })

      return { valid: errors.length === 0, errors }
    }
  },

  /**
   * Group data by field value
   */
  groupBy(data, field) {
    return data.reduce((groups, item) => {
      const key = item[field] || "undefined"
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
      return groups
    }, {})
  },

  /**
   * Sum field values across all items
   */
  sumField(data, field) {
    return data.reduce((sum, item) => {
      const value = this.parseNumber(item[field], 0, true)
      return sum + value
    }, 0)
  },

  /**
   * Calculate average of field values
   */
  averageField(data, field) {
    const validData = data.filter((item) => !isNaN(Number(item[field])))
    if (validData.length === 0) return 0

    const sum = this.sumField(validData, field)
    return sum / validData.length
  },

  /**
   * Round a number to specific decimal places
   */
  roundNumber(value, decimalPlaces = 2) {
    const multiplier = Math.pow(10, decimalPlaces)
    return Math.round(value * multiplier) / multiplier
  },

  /**
   * Check if a value is numeric (including string representations)
   */
  isNumeric(value) {
    if (value === null || value === undefined || value === "") return false
    if (typeof value === "number") return true
    if (typeof value !== "string") return false

    return !isNaN(value) && !isNaN(parseFloat(value)) && value.trim() !== ""
  },

  excelSerialDateToFormat(serial) {
    if (!serial || (typeof serial === "string" && serial.trim() === "")) {
      return ""
    }

    if (typeof serial === "string") {
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(serial)) {
        const parts = serial.split("/")
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(
          2,
          "0"
        )}`
      }

      serial = parseFloat(serial)
      if (isNaN(serial)) return serial
    }

    if (serial > 1000) {
      const milliseconds = (serial - 25569) * 86400 * 1000
      const jsDate = new Date(milliseconds)

      if (!isNaN(jsDate.getTime())) {
        const year = jsDate.getFullYear()
        const month = String(jsDate.getMonth() + 1).padStart(2, "0")
        const day = String(jsDate.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }
    }

    return serial
  },

  parseDateValue(value, defaultValue = "") {
    if (value === null || value === undefined || value === "") {
      return defaultValue
    }

    if (typeof value === "number") {
      try {
        if (value > 1 && value < 2958466) {
          const adjustedValue = value > 59 ? value - 1 : value
          // Excel epoch starts from 1899-12-30 (not 1900-01-01)
          const excelDate = new Date(1899, 11, 30)
          excelDate.setDate(excelDate.getDate() + adjustedValue)

          if (!isNaN(excelDate.getTime())) {
            return excelDate.toISOString().split("T")[0]
          }
        }

        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0]
        }
      } catch (e) {
        return defaultValue
      }
    }

    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed) return defaultValue

      const indonesianDateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
      const match = trimmed.match(indonesianDateRegex)

      if (match) {
        const [, day, month, year] = match
        const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
          2,
          "0"
        )}`

        // Validate the constructed date
        const testDate = new Date(isoDate)
        if (!isNaN(testDate.getTime())) {
          return isoDate
        }
      }

      try {
        const parsed = new Date(trimmed)
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split("T")[0]
        }
      } catch (e) {}

      return trimmed
    }

    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return defaultValue
      }
      return value.toISOString().split("T")[0]
    }

    try {
      const parsed = new Date(String(value))
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0]
      }
    } catch (e) {
      return defaultValue
    }

    return defaultValue
  },

  /**
   * Parse tahun dari nilai tanggal
   * @param {any} value - Nilai tanggal
   * @param {number} defaultYear - Tahun default
   * @returns {number} Tahun sebagai angka
   */
  parseYearFromDate(value, defaultYear = new Date().getFullYear()) {
    const dateString = this.parseDateValue(value)
    if (!dateString) return defaultYear

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return defaultYear
      return date.getFullYear()
    } catch (e) {
      return defaultYear
    }
  },

  /**
   * Format tanggal untuk tampilan
   * @param {any} value - Nilai tanggal
   * @param {string} format - Format output ('YYYY-MM-DD', 'DD/MM/YYYY', etc.)
   * @returns {string} Tanggal terformat
   */
  formatDate(value, format = "YYYY-MM-DD") {
    const dateString = this.parseDateValue(value)
    if (!dateString) return ""

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ""

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")

      switch (format) {
        case "DD/MM/YYYY":
          return `${day}/${month}/${year}`
        case "MM/DD/YYYY":
          return `${month}/${day}/${year}`
        case "YYYY-MM-DD":
        default:
          return `${year}-${month}-${day}`
      }
    } catch (e) {
      return ""
    }
  },

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
  },
}
