import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils.js"

export class KurikulumCapaianRencanaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a1",
      name: "Kurikulum Capaian Rencana Plugin",
      description:
        "Plugin untuk mendata kurikulum, capaian pembelajaran dan rencana pembelajaran dari tabel 5.a.1 LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isKurikulumCapaianSection: true,
    }
  }

  hasDefaultData() {
    return false
  }

  // ✅ COMPLETE OVERRIDE - Don't call super first
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    console.log("🔍 KurikulumCapaianRencanaPlugin.processExcelData called")

    try {
      // Get raw data using base function
      const { rawData, detectedIndices } = await processExcelDataBase(
        workbook,
        tableCode,
        config,
        prodiName
      )

      console.log("📊 Raw data length:", rawData.length)
      console.log("🗂️ Detected indices:", detectedIndices)

      if (rawData.length === 0) {
        return { allRows: [], shouldReplaceExisting: true }
      }

      // ✅ LESS RESTRICTIVE FILTERING - just remove completely empty rows
      const filteredData = rawData.filter((row) => {
        if (!Array.isArray(row)) return false

        // Check if row has any meaningful data
        const hasData = row.some((cell) => {
          const value = String(cell || "").trim()
          return value !== "" && value !== "0" && value !== "-"
        })

        console.log("🔍 Row data check:", row.slice(0, 5), "hasData:", hasData)
        return hasData
      })

      console.log("🗃️ Filtered data length:", filteredData.length)

      if (filteredData.length === 0) {
        return { allRows: [], shouldReplaceExisting: true }
      }

      // Process each row
      const processedData = filteredData.map((row, index) => {
        const item = this.processRowData(row, detectedIndices, {
          no: index + 1,
        })
        console.log(`📝 Processed row ${index + 1}:`, {
          semester: item.semester,
          kode_mata_kuliah: item.kode_mata_kuliah,
          nama_mata_kuliah: item.nama_mata_kuliah,
        })
        return item
      })

      // ✅ LESS RESTRICTIVE VALIDATION
      const validData = processedData.filter((item) => {
        const isValid = this.isValidRowLoose(item)
        console.log("✅ Row validation:", {
          semester: item.semester,
          kode: item.kode_mata_kuliah,
          nama: item.nama_mata_kuliah,
          valid: isValid,
        })
        return isValid
      })

      console.log("✅ Valid data length:", validData.length)

      const normalizedData = this.normalizeData(validData)

      console.log("🏁 Final normalized data length:", normalizedData.length)

      return {
        allRows: normalizedData,
        shouldReplaceExisting: true,
      }
    } catch (error) {
      console.error("❌ Error in processExcelData:", error)
      return { allRows: [], shouldReplaceExisting: true }
    }
  }

  // ✅ LOOSE validation for initial processing
  isValidRowLoose(item) {
    if (!item) return false

    // Just check if any of the key fields has content
    const semester = String(item.semester || "").trim()
    const kodeMataKuliah = String(item.kode_mata_kuliah || "").trim()
    const namaMataKuliah = String(item.nama_mata_kuliah || "").trim()

    // At least one field should have content
    return semester !== "" || kodeMataKuliah !== "" || namaMataKuliah !== ""
  }

  // ✅ Override field type detection
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Numeric fields untuk SKS dan konversi
    if (
      fieldLower.includes("sks") ||
      fieldLower.includes("bobot") ||
      fieldLower.includes("kredit") ||
      fieldLower.includes("konversi") ||
      fieldLower.includes("jam") ||
      fieldLower.includes("jumlah")
    ) {
      return "number"
    }

    // Boolean fields untuk kompetensi
    if (
      fieldLower.includes("kompetensi") ||
      fieldLower.includes("kesesuaian")
    ) {
      return "boolean"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Helper method untuk validasi row (stricter version)
  isValidRow(item) {
    if (!item) return false

    const semester = PluginUtils.normalizeTextField(item.semester || "")
    const kodeMataKuliah = PluginUtils.normalizeTextField(
      item.kode_mata_kuliah || ""
    )
    const namaMataKuliah = PluginUtils.normalizeTextField(
      item.nama_mata_kuliah || ""
    )

    // All three fields must have content for strict validation
    return semester !== "" && kodeMataKuliah !== "" && namaMataKuliah !== ""
  }

  // ✅ Dynamic normalization
  normalizeData(data) {
    if (!Array.isArray(data)) return []

    return data.map((item, index) => {
      const result = {
        ...item,
        no: index + 1,
        key: item.key || `kurikulum-${Date.now()}-${index}`,
        selected: item.selected !== false,
      }

      // Normalize all text fields
      const textFields = [
        "semester",
        "kode_mata_kuliah",
        "nama_mata_kuliah",
        "mata_kuliah_kompetensi",
        "capaian_pembelajaran_sikap",
        "capaian_pembelajaran_pengetahuan",
        "capaian_pembelajaran_keterampilan_umum",
        "capaian_pembelajaran_keterampilan_khusus",
        "dokumen_rencana_pembelajaran",
        "unit_penyeleng_gara",
      ]

      textFields.forEach((field) => {
        if (result[field] !== undefined) {
          result[field] = PluginUtils.normalizeTextField(result[field] || "")
        }
      })

      // Normalize numeric fields
      const numericFields = [
        "bobot_kredit_sks_kuliah_responsi_tutorial",
        "bobot_kredit_sks_seminar",
        "bobot_kredit_sks_praktikum_praktik_praktik_lapangan",
        "konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi",
      ]

      numericFields.forEach((field) => {
        if (result[field] !== undefined) {
          result[field] = PluginUtils.parseNumber(result[field], 0)
        }
      })

      return result
    })
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    if (!Array.isArray(data)) {
      return { valid: false, errors: ["Data harus berupa array"] }
    }

    data.forEach((item, index) => {
      // Validate required fields
      if (
        !item.semester ||
        PluginUtils.normalizeTextField(item.semester) === ""
      ) {
        errors.push(`Baris ${index + 1}: Semester harus diisi`)
      }

      if (
        !item.kode_mata_kuliah ||
        PluginUtils.normalizeTextField(item.kode_mata_kuliah) === ""
      ) {
        errors.push(`Baris ${index + 1}: Kode Mata Kuliah harus diisi`)
      }

      if (
        !item.nama_mata_kuliah ||
        PluginUtils.normalizeTextField(item.nama_mata_kuliah) === ""
      ) {
        errors.push(`Baris ${index + 1}: Nama Mata Kuliah harus diisi`)
      }

      // Validate numeric fields if row is valid
      if (this.isValidRow(item)) {
        const totalBobot =
          PluginUtils.parseNumber(
            item.bobot_kredit_sks_kuliah_responsi_tutorial,
            0
          ) +
          PluginUtils.parseNumber(item.bobot_kredit_sks_seminar, 0) +
          PluginUtils.parseNumber(
            item.bobot_kredit_sks_praktikum_praktik_praktik_lapangan,
            0
          )

        if (totalBobot <= 0) {
          errors.push(
            `Baris ${index + 1}: Total bobot kredit harus lebih dari 0`
          )
        }

        const konversi = PluginUtils.parseNumber(
          item.konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi,
          0
        )
        if (konversi <= 0) {
          errors.push(
            `Baris ${index + 1}: Konversi kredit ke jam harus lebih dari 0`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ✅ Helper method
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
}

export const kurikulumCapaianRencanaPlugin = new KurikulumCapaianRencanaPlugin()
export default kurikulumCapaianRencanaPlugin
