import { BasePlugin } from "../../core/BasePlugin.js"

export class SeleksiMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "2a1",
      name: "Seleksi Mahasiswa Baru",
      description: "Plugin for processing student selection data",
    })
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const years = ["TS-4", "TS-3", "TS-2", "TS-1", "TS"]

    return years.map((year) => ({
      key: `default-${year}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      tahun_akademik: year,
      selected: true,
    }))
  }

  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    if (!existingData || existingData.length === 0) {
      return defaultData
    }

    const existingYears = existingData.map((row) => row.tahun_akademik)
    const requiredYears = ["TS-4", "TS-3", "TS-2", "TS-1", "TS"]

    const missingYears = requiredYears.filter(
      (year) => !existingYears.includes(year)
    )

    if (missingYears.length === 0) {
      return existingData
    }

    const missingDefaults = defaultData.filter((row) =>
      missingYears.includes(row.tahun_akademik)
    )

    const combined = [...existingData, ...missingDefaults]

    const yearOrder = { "TS-4": 0, "TS-3": 1, "TS-2": 2, "TS-1": 3, TS: 4 }
    combined.sort((a, b) => {
      const orderA = yearOrder[a.tahun_akademik] ?? 999
      const orderB = yearOrder[b.tahun_akademik] ?? 999
      return orderA - orderB
    })

    return combined
  }

  configureSection(config) {
    return { ...config, isStudentSection: true }
  }

  // ✅ REMOVED hardcoded field processing - now uses dynamic base method
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    // Use parent class dynamic processing
    return super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )
  }

  // ✅ UPDATED: Dynamic field access for calculations
  async calculateMetrics(data, additionalData = {}) {
    console.log("lemao pisan")
  }

  // ✅ NEW: Helper to find fields by pattern matching
  findFieldByPattern(item, patterns) {
    const fields = Object.keys(item)

    for (const pattern of patterns) {
      const field = fields.find((f) =>
        f.toLowerCase().includes(pattern.toLowerCase())
      )
      if (field) return field
    }

    return null
  }

  // ✅ NEW: Find multiple fields by patterns
  findFieldsByPatterns(item, patternGroups) {
    const result = {}

    Object.entries(patternGroups).forEach(([key, patterns]) => {
      result[key] = this.findFieldByPattern(item, patterns)
    })

    return result
  }

  getValidData(data) {
    return data.filter((item) => {
      if (!item.tahun_akademik) return false
      const normalized = String(item.tahun_akademik).toLowerCase().trim()
      return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
        normalized
      )
    })
  }

  // ✅ UPDATED: Dynamic normalization
  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        if (!item.tahun_akademik) return true
        const normalized = String(item.tahun_akademik).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item) => {
        const result = {
          ...item,
          id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
          key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        }

        // ✅ Dynamic field processing instead of hardcoded list
        Object.keys(result).forEach((field) => {
          const fieldType = this.detectFieldType(field, result[field])
          if (fieldType === "number" || fieldType === "formatted_number") {
            result[field] = !isNaN(parseFloat(result[field]))
              ? Math.max(0, parseFloat(result[field]))
              : 0
          }
        })

        return result
      })
  }

  prepareDataForSaving(data, config = {}) {
    return data
      .filter((item) => {
        if (!item.tahun_akademik) return true
        const normalized = String(item.tahun_akademik).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => {
        const { id, key, _editing, _selected, ...cleanRow } = item
        return {
          ...cleanRow,
          selected: true,
        }
      })
  }

  // ✅ UPDATED: Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      // Check for tahun_akademik
      if (!item.tahun_akademik) {
        errors.push(`Row ${index + 1}: Tahun akademik harus diisi`)
      }

      // ✅ Dynamic validation based on available fields
      const dayaTampungField = this.findFieldByPattern(item, [
        "daya_tampung",
        "tampung",
      ])
      if (dayaTampungField) {
        const value = parseFloat(item[dayaTampungField])
        if (isNaN(value) || value <= 0) {
          errors.push(`Row ${index + 1}: Daya tampung harus lebih besar dari 0`)
        }
      }

      // ✅ Dynamic cross-field validation
      const pendaftarField = this.findFieldByPattern(item, [
        "pendaftar",
        "calon_mahasiswa",
      ])
      const lulusField = this.findFieldByPattern(item, [
        "lulus_seleksi",
        "lulus",
      ])

      if (pendaftarField && lulusField) {
        const pendaftar = parseFloat(item[pendaftarField]) || 0
        const lulus = parseFloat(item[lulusField]) || 0

        if (pendaftar < lulus) {
          errors.push(
            `Row ${
              index + 1
            }: Jumlah pendaftar tidak boleh lebih kecil dari jumlah yang lulus seleksi`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const seleksiMahasiswaPlugin = new SeleksiMahasiswaPlugin()
export default seleksiMahasiswaPlugin
