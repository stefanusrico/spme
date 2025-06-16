import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class PagelaranPameranPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8f2",
      name: "Pagelaran Pameran Plugin",
      description:
        "Plugin untuk mendata pagelaran/pameran/presentasi mahasiswa",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isPagelaranPameranSection: true,
    }
  }

  // Override to indicate this plugin has default data
  hasDefaultData() {
    return true
  }

  // Add method to get default values for jenis publikasi
  getJenisPublikasiOptions() {
    return [
      "Publikasi di jurnal nasional tidak terakreditasi",
      "Publikasi di jurnal nasional terakreditasi",
      "Publikasi di jurnal internasional",
      "Publikasi di jurnal internasional bereputasi",
      "Publikasi di seminar wilayah/lokal/perguruan tinggi",
      "Publikasi di seminar nasional",
      "Publikasi di seminar internasional",
      "Pagelaran/pameran/presentasi dalam forum di tingkat wilayah",
      "Pagelaran/pameran/presentasi dalam forum di tingkat nasional",
      "Pagelaran/pameran/presentasi dalam forum di tingkat internasional",
    ]
  }

  // Implementation similar to seleksiMahasiswaPlugin
  getDefaultData(tableCode, config = {}) {
    const jenisPublikasiList = this.getJenisPublikasiOptions()

    return jenisPublikasiList.map((jenis, index) => ({
      key: `default-${index + 1}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      no: index + 1,
      jenis_publikasi: jenis,
      ts_2_jumlah_judul: 0,
      ts_1_jumlah_judul: 0,
      ts_jumlah_judul: 0,
      jumlah: 0, // Will be auto-calculated
      selected: true,
    }))
  }

  // Merge with defaults implementation similar to seleksiMahasiswaPlugin
  mergeWithDefaults(existingData, tableCode, config = {}) {
    if (!this.hasDefaultData()) {
      return existingData
    }

    const defaultData = this.getDefaultData(tableCode, config)

    if (!existingData || existingData.length === 0) {
      return defaultData
    }

    const existingJenisPublikasi = existingData.map(
      (row) => row.jenis_publikasi
    )
    const requiredJenisPublikasi = this.getJenisPublikasiOptions()

    const missingJenisPublikasi = requiredJenisPublikasi.filter(
      (jenis) => !existingJenisPublikasi.includes(jenis)
    )

    if (missingJenisPublikasi.length === 0) {
      // All required jenis publikasi exist, just recalculate jumlah for existing data
      return existingData.map((row) => this.recalculateRow(row))
    }

    // Add missing jenis publikasi
    const missingDefaults = defaultData.filter((row) =>
      missingJenisPublikasi.includes(row.jenis_publikasi)
    )

    // Combine existing data with missing defaults
    const combined = [...existingData, ...missingDefaults]

    // Recalculate jumlah for all rows and update row numbers
    return combined.map((row, index) => ({
      ...this.recalculateRow(row),
      no: index + 1,
    }))
  }

  // Remove the old getDefaultRows method since we're using getDefaultData instead

  // Add calculated fields method
  getCalculatedFields() {
    return {
      jumlah: (row) => {
        const ts2 = parseFloat(row.ts_2_jumlah_judul) || 0
        const ts1 = parseFloat(row.ts_1_jumlah_judul) || 0
        const ts = parseFloat(row.ts_jumlah_judul) || 0

        return ts2 + ts1 + ts
      },
    }
  }

  // Add method to recalculate row
  recalculateRow(row) {
    const calculatedFields = this.getCalculatedFields()
    const updatedRow = { ...row }

    // Calculate jumlah automatically
    if (calculatedFields.jumlah) {
      updatedRow.jumlah = calculatedFields.jumlah(updatedRow)
    }

    return updatedRow
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
        key: `excel-pagelaran-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        jenis_publikasi: PluginUtils.normalizeTextField(row[1]),
        ts_2_jumlah_judul: PluginUtils.parseNumber(row[2], 0),
        ts_1_jumlah_judul: PluginUtils.parseNumber(row[3], 0),
        ts_jumlah_judul: PluginUtils.parseNumber(row[4], 0),
        jumlah: PluginUtils.parseNumber(row[5], 0),
      }

      // Auto-calculate jumlah using recalculateRow
      return this.recalculateRow(item)
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    const { projectId } = additionalData
    const allRows =
      data && data.allRows ? data.allRows : Array.isArray(data) ? data : []
    let NM = 0

    let NC1 = 0,
      NC2 = 0,
      NC3 = 0

    if (projectId) {
      try {
        const scoreDetail2a1 = await fetchScoreDetails("2a1", projectId)
        NM = scoreDetail2a1?.NM || 0
      } catch (error) {
        console.warn("Failed to fetch NDTT:", error)
      }
    }

    allRows.forEach((item) => {
      const jenis = String(item.jenis_publikasi).toLowerCase()
      const jumlah = item.jumlah || 0

      if (jenis.includes("wilayah")) {
        NC1 += jumlah
      } else if (
        jenis.includes("nasional") &&
        !jenis.includes("internasional")
      ) {
        NC2 += jumlah
      } else if (jenis.includes("internasional")) {
        NC3 += jumlah
      }
    })

    const RL = (NC1 / NM) * 100
    const RN = (NC2 / NM) * 100
    const RI = (NC3 / NM) * 100

    const a = 1 // 1%
    const b = 10 // 10%
    const c = 50 // 50%

    let skor = 0

    if (RI > a && RN > b) {
      skor = 4
    } else {
      const RI_calc = RI >= a && RN < b ? a : RI
      const RN_calc = RI < a && RN >= b ? b : RN
      const RL_calc = RL >= c ? c : RL

      const A_calc = RI_calc / a
      const B_calc = RN_calc / b
      const C_calc = RL_calc / c

      skor =
        3.75 *
        (A_calc +
          B_calc +
          C_calc / 2 -
          A_calc * B_calc -
          (A_calc * C_calc) / 2 -
          (B_calc * C_calc) / 2 +
          (A_calc * B_calc * C_calc) / 2)

      skor = Math.max(0, skor)
    }

    const skorFinal = parseFloat(Math.max(0, Math.min(4, skor)).toFixed(2))

    console.log("NC1:", NC1, "NC2:", NC2, "NC3:", NC3, "NM:", NM)
    console.log("RL:", RL, "RN:", RN, "RI:", RI)
    console.log("Score:", skorFinal)

    return {
      scores: [{ butir: 69, nilai: skorFinal }],
      scoreDetail: {
        RL: parseFloat(RL.toFixed(2)),
        RN: parseFloat(RN.toFixed(2)),
        RI: parseFloat(RI.toFixed(2)),
        NM,
        NC1,
        NC2,
        NC3,
      },
    }
  }

  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    // First apply base normalization similar to seleksiMahasiswaPlugin
    const normalizedData = data
      .filter((item) => {
        // Filter out any invalid rows
        if (!item.jenis_publikasi) return true
        const normalized = String(item.jenis_publikasi).toLowerCase().trim()
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

        result.jenis_publikasi = PluginUtils.normalizeTextField(
          result.jenis_publikasi
        )

        const numericFields = [
          "ts_2_jumlah_judul",
          "ts_1_jumlah_judul",
          "ts_jumlah_judul",
        ]

        numericFields.forEach((field) => {
          result[field] = PluginUtils.parseNumber(result[field], 0)
        })

        return result
      })

    // Then recalculate jumlah for each row
    return normalizedData.map((row) => this.recalculateRow(row))
  }

  // Add prepareDataForSaving method similar to seleksiMahasiswaPlugin
  prepareDataForSaving(data, config = {}) {
    return data
      .filter((item) => {
        if (!item.jenis_publikasi) return true
        const normalized = String(item.jenis_publikasi).toLowerCase().trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => {
        const { id, key, _editing, _selected, ...cleanRow } = item
        return {
          ...this.recalculateRow(cleanRow), // Ensure jumlah is calculated
          no: index + 1,
          selected: true,
        }
      })
  }

  validateData(data) {
    const errors = []
    const validJenisPublikasi = this.getJenisPublikasiOptions()

    data.forEach((item, index) => {
      if (!item.jenis_publikasi || String(item.jenis_publikasi).trim() === "") {
        errors.push(`Baris ${index + 1}: Jenis Publikasi harus diisi.`)
      } else if (!validJenisPublikasi.includes(item.jenis_publikasi)) {
        errors.push(
          `Baris ${
            index + 1
          }: Jenis Publikasi tidak valid. Pilih dari opsi yang tersedia.`
        )
      }

      // Validate that jumlah equals sum of TS columns
      const expectedJumlah =
        (item.ts_2_jumlah_judul || 0) +
        (item.ts_1_jumlah_judul || 0) +
        (item.ts_jumlah_judul || 0)
      if (Math.abs((item.jumlah || 0) - expectedJumlah) > 0.001) {
        errors.push(
          `Baris ${
            index + 1
          }: Kolom Jumlah harus sama dengan total TS-2 + TS-1 + TS.`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Add method to handle field value processing
  processFieldValue(field, value, sectionCode) {
    // For jenis_publikasi, ensure it's from valid options
    if (field === "jenis_publikasi") {
      const validOptions = this.getJenisPublikasiOptions()
      const normalizedValue = PluginUtils.normalizeTextField(value)

      // If empty, return first option as default
      if (!normalizedValue) {
        return validOptions[0]
      }

      // Check if value is valid
      if (validOptions.includes(normalizedValue)) {
        return normalizedValue
      }

      // Try to find closest match
      const lowerValue = normalizedValue.toLowerCase()
      const match = validOptions.find(
        (option) =>
          option.toLowerCase().includes(lowerValue) ||
          lowerValue.includes(option.toLowerCase())
      )

      return match || validOptions[0]
    }

    // For numeric fields
    if (
      ["ts_2_jumlah_judul", "ts_1_jumlah_judul", "ts_jumlah_judul"].includes(
        field
      )
    ) {
      return PluginUtils.parseNumber(value, 0)
    }

    // For jumlah field (calculated field, should not be directly edited)
    if (field === "jumlah") {
      return PluginUtils.parseNumber(value, 0)
    }

    return value
  }

  // Add method to get read-only fields
  getReadOnlyFields() {
    return ["jumlah"] // jumlah is calculated automatically
  }
}

export const pagelaranPameranPlugin = new PagelaranPameranPlugin()

export default pagelaranPameranPlugin
