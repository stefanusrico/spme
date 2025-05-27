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

      // Skip jika semua nilai adalah angka
      const allNumbers = nonEmptyValues.every(
        (val) =>
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(val) && val.trim() !== "")
      )
      if (allNumbers && nonEmptyValues.length > 0) return false

      // Skip baris summary
      const summaryLabels = ["jumlah", "total", "sum", "rata-rata", "average"]
      const hasSummaryLabel = row.some((cell) => {
        const normalized = String(cell || "")
          .toLowerCase()
          .trim()
        return summaryLabels.includes(normalized)
      })

      return !hasSummaryLabel
    })
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

    // Check if string is numeric
    return !isNaN(value) && !isNaN(parseFloat(value)) && value.trim() !== ""
  },

  parseDateValue(value, defaultValue = "") {
    if (value === null || value === undefined || value === "") {
      return defaultValue
    }

    // If it's already a string, return as is (assuming it's a valid date string)
    if (typeof value === "string") {
      return value.trim()
    }

    // If it's a Date object, convert to ISO string or readable format
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return defaultValue
      }
      // Return in YYYY-MM-DD format
      return value.toISOString().split("T")[0]
    }

    // If it's a number (timestamp), convert to date
    if (typeof value === "number") {
      try {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          return defaultValue
        }
        return date.toISOString().split("T")[0]
      } catch (e) {
        return defaultValue
      }
    }

    // For Excel date serial numbers (common in Excel files)
    if (typeof value === "number" && value > 25569) {
      try {
        // Excel date serial number conversion
        const excelDate = new Date((value - 25569) * 86400 * 1000)
        if (isNaN(excelDate.getTime())) {
          return defaultValue
        }
        return excelDate.toISOString().split("T")[0]
      } catch (e) {
        return defaultValue
      }
    }

    // Try to parse as string
    try {
      const parsed = new Date(String(value))
      if (isNaN(parsed.getTime())) {
        return defaultValue
      }
      return parsed.toISOString().split("T")[0]
    } catch (e) {
      return defaultValue
    }
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
}
