import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class SeleksiMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "2a1",
      name: "Seleksi Mahasiswa Baru",
      description: "Plugin for processing student selection data",
    })
  }

  // Override to indicate this plugin has default data
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

    // Add missing years
    const missingDefaults = defaultData.filter((row) =>
      missingYears.includes(row.tahun_akademik)
    )

    // Combine and sort
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
        tahun_akademik: 0,
        daya_tampung: 0,
        pendaftar_jumlah_calon_mahasiswa: 0,
        lulus_seleksi_jumlah_calon_mahasiswa: 0,
        reguler_jumlah_mahasiswa_baru: 0,
        transfer_jumlah_mahasiswa_baru: 0,
        reguler_jumlah_mahasiswa_aktif: 0,
        transfer_jumlah_mahasiswa_aktif: 0,
        selected: true,
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "no" || fieldName === "daya_tampung") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
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
          item[fieldName] = PluginUtils.parseNumber(value, 0)
        } else {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    const metrics = await this.calculateMetrics(data, additionalData)
    const scores = this.calculateDetailedScores(metrics)

    return {
      scores: scores.map((s) => ({ butir: s.butir, nilai: s.nilai })),
      scoreDetail: this.formatScoreDetail(metrics),
    }
  }

  truncateToTwoDecimals(num) {
    const parts = String(num).split(".")
    if (parts.length === 1) return num
    const decimal = parts[1].substring(0, 2)
    return Number(`${parts[0]}.${decimal}`)
  }

  async calculateMetrics(data, additionalData = {}) {
    const validData = this.getValidData(data)

    let totalPendaftar = 0
    let totalLulusSeleksi = 0

    validData.forEach((item) => {
      totalPendaftar += parseFloat(item.pendaftar_jumlah_calon_mahasiswa) || 0
      totalLulusSeleksi +=
        parseFloat(item.lulus_seleksi_jumlah_calon_mahasiswa) || 0
    })

    const rasioSeleksi =
      totalLulusSeleksi > 0 ? totalPendaftar / totalLulusSeleksi : 0

    const componentA =
      additionalData.componentA !== undefined
        ? parseFloat(additionalData.componentA)
        : 0

    let componentB = 0
    if (rasioSeleksi >= 3) {
      componentB = 4
    } else {
      componentB = (4 * rasioSeleksi) / 3
    }

    let totalMahasiswaAktif = 0
    if (validData.length > 0) {
      const latestEntry = validData[validData.length - 1]

      const regulerAktif =
        parseFloat(latestEntry.reguler_jumlah_mahasiswa_aktif) || 0
      const transferAktif =
        parseFloat(latestEntry.transfer_jumlah_mahasiswa_aktif) || 0

      totalMahasiswaAktif = regulerAktif + transferAktif
    }

    return {
      totalPendaftar,
      totalLulusSeleksi,
      rasioSeleksi,
      componentA,
      componentB,
      totalMahasiswaAktif,
    }
  }

  calculateDetailedScores(metrics) {
    const finalScore = (metrics.componentA + metrics.componentB) / 2

    return [{ butir: 13, nilai: parseFloat(finalScore) }]
  }

  formatScoreDetail(metrics) {
    return {
      rasio: this.truncateToTwoDecimals(metrics.rasioSeleksi),
      A: metrics.componentA,
      B: this.truncateToTwoDecimals(metrics.componentB),
      NM: metrics.totalMahasiswaAktif,
    }
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
        const numericFields = [
          "daya_tampung",
          "pendaftar_jumlah_calon_mahasiswa",
          "lulus_seleksi_jumlah_calon_mahasiswa",
          "reguler_jumlah_mahasiswa_baru",
          "transfer_jumlah_mahasiswa_baru",
          "reguler_jumlah_mahasiswa_aktif",
          "transfer_jumlah_mahasiswa_aktif",
        ]

        const result = {
          ...item,
          id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
          key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        }

        numericFields.forEach((field) => {
          result[field] = !isNaN(parseFloat(result[field]))
            ? Math.max(0, parseFloat(result[field]))
            : 0
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
          no: index + 1,
          selected: true,
        }
      })
  }

  validateData = PluginUtils.createValidator([
    { fieldName: "tahun_akademik", required: true },
    {
      fieldName: "daya_tampung",
      required: true,
      validator: (value) => parseFloat(value) > 0,
      message: "Daya tampung harus lebih besar dari 0",
    },
    {
      fieldName: "pendaftar_jumlah_calon_mahasiswa",
      required: true,
      validator: (value, row) => {
        return (
          parseFloat(value) >=
          parseFloat(row.lulus_seleksi_jumlah_calon_mahasiswa)
        )
      },
      message:
        "Jumlah pendaftar tidak boleh lebih kecil dari jumlah yang lulus seleksi",
    },
  ])
}

// Export as named export
export const seleksiMahasiswaPlugin = new SeleksiMahasiswaPlugin()

// Export as default for legacy imports
export default seleksiMahasiswaPlugin
