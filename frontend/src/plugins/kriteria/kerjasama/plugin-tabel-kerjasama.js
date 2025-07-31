import { fetchScoreDetails } from "../../../utils/fetchScoreDetail"
import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class TridharmaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "1-*",
      name: "Tridharma Section Plugin",
      description: "Implementation for Tridharma sections (1-1, 1-2, 1-3)",
    })
  }

  configureSection(config) {
    return { ...config, isTridharma: true }
  }

  hasDefaultData() {
    return false
  }

  // ✅ Override field type detection dengan explicit text patterns
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // ✅ PRIORITY 1: Explicit text fields - TAMBAH pattern untuk manfaat
    if (
      fieldLower.includes("manfaat") ||
      fieldLower.includes("judul") ||
      fieldLower.includes("lembaga") ||
      fieldLower.includes("mitra") ||
      fieldLower.includes("kegiatan") ||
      fieldLower.includes("kerjasama") ||
      fieldLower.includes("bukti") ||
      fieldLower.includes("dokumen") ||
      fieldLower.includes("status") ||
      fieldLower.includes("deskripsi") ||
      fieldLower.includes("keterangan") ||
      fieldLower.includes("nama") ||
      fieldLower.includes("title") ||
      fieldLower.includes("description") ||
      fieldLower.includes("ps_yang_diakreditasi") // ✅ TAMBAH PATTERN SPESIFIK
    ) {
      console.log(`🔤 Field ${fieldName} detected as TEXT (explicit rule)`)
      return "text"
    }

    // ✅ HAPUS BOOLEAN FIELDS UNTUK TINGKAT - biarkan jadi text
    // Boolean fields - HANYA untuk field yang benar-benar boolean
    if (
      fieldLower.includes("pendidikan") ||
      fieldLower.includes("penelitian") ||
      fieldLower.includes("pkm") ||
      fieldLower.includes("pengabdian") ||
      fieldLower.includes("selected")
      // ✅ HAPUS: tingkat_internasional, tingkat_nasional, tingkat_lokal_wilayah
    ) {
      return "boolean"
    }

    // Date fields
    if (
      fieldLower.includes("tanggal") ||
      fieldLower.includes("hh_bb_tttt") ||
      fieldLower.includes("date") ||
      fieldLower.includes("awal") ||
      fieldLower.includes("akhir")
    ) {
      return "date"
    }

    // Number fields
    if (
      fieldLower.includes("durasi") ||
      fieldLower.includes("tahun") ||
      fieldLower.includes("no") ||
      fieldLower.includes("nomor")
    ) {
      return "number"
    }

    // ✅ Call parent for fallback
    return super.detectFieldType(fieldName, value)
  }

  // ✅ Process field value berdasarkan type dengan enhanced logging
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    console.log(`🔄 Processing ${fieldName}: "${value}" as ${fieldType}`)

    if (fieldType === "boolean") {
      const result = this.parseBooleanField(value)
      console.log(`✅ Boolean result: ${result}`)
      return result
    }

    if (fieldType === "date") {
      // ✅ USE PluginUtils for date parsing
      const result = this.parseDateValue(value)
      console.log(`📅 Date result: ${result}`)
      return result
    }

    if (fieldType === "text") {
      // ✅ Explicit text processing
      const result = PluginUtils.normalizeTextField(value)
      console.log(`🔤 Text result: "${result}"`)
      return result
    }

    if (fieldType === "number") {
      const result = PluginUtils.parseNumber(value, 0)
      console.log(`🔢 Number result: ${result}`)
      return result
    }

    // Fallback to parent method
    const result = super.processFieldValue(fieldName, value, fieldType)
    console.log(`📝 Parent result: "${result}"`)
    return result
  }

  // ✅ Helper untuk parsing boolean field
  parseBooleanField(value) {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      const normalized = value.trim().toUpperCase()
      return (
        normalized === "V" ||
        normalized === "YA" ||
        normalized === "YES" ||
        normalized === "✓" ||
        normalized === "X" ||
        normalized === "TRUE" ||
        normalized === "1"
      )
    }
    if (typeof value === "number") {
      return value === 1
    }
    return false
  }

  // ✅ USE PluginUtils.excelSerialDateToFormat and convert to DD/MM/YYYY
  parseDateValue(value, defaultValue = "") {
    console.log(`📅 Parsing date value: "${value}" (type: ${typeof value})`)

    if (value === null || value === undefined || value === "") {
      console.log(`📅 Empty value, returning default: "${defaultValue}"`)
      return defaultValue
    }

    // ✅ USE PluginUtils.excelSerialDateToFormat for consistent date handling
    const isoDate = PluginUtils.excelSerialDateToFormat(value)
    console.log(`🔄 PluginUtils conversion: "${value}" -> "${isoDate}"`)

    if (!isoDate || isoDate === value) {
      // If no conversion happened or empty result, return as-is
      console.log(
        `❌ No conversion possible, returning: "${isoDate || defaultValue}"`
      )
      return isoDate || defaultValue
    }

    // ✅ Convert ISO format (YYYY-MM-DD) to DD/MM/YYYY format like 3b8-1
    if (typeof isoDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [year, month, day] = isoDate.split("-")
      const ddmmyyyy = `${day}/${month}/${year}`
      console.log(`✅ ISO to DD/MM/YYYY: ${isoDate} -> ${ddmmyyyy}`)
      return ddmmyyyy
    }

    // ✅ If already in DD/MM/YYYY format, return as-is
    if (
      typeof isoDate === "string" &&
      /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(isoDate)
    ) {
      console.log(`✅ Already in DD/MM/YYYY format: ${isoDate}`)
      return isoDate
    }

    console.log(`✅ Final date result: ${isoDate}`)
    return isoDate
  }

  // ✅ Use dynamic base processing dengan PluginUtils date conversion
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    console.log(
      "🔧 TridharmaPlugin.processExcelData called for table:",
      tableCode
    )

    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    console.log("📊 Base processing result:", {
      allRowsLength: result?.allRows?.length || 0,
      sampleRow: result?.allRows?.[0],
    })

    // ✅ USE PluginUtils for consistent date processing
    if (result && result.allRows) {
      result.allRows = result.allRows.map((item, index) => {
        console.log(`🔄 Processing row ${index + 1}:`, item)

        // ✅ Set default values first
        const processedItem = {
          ...item,
          key: item.key || `excel-${index + 1}-${Date.now()}`,
          no: index + 1,
          selected: false,
          // ✅ HAPUS: default boolean values untuk tingkat
          // tingkat_internasional: false,
          // tingkat_nasional: false,
          // tingkat_lokal_wilayah: false,
          pendidikan: sectionCode === "1-1",
          penelitian: sectionCode === "1-2",
          pkm: sectionCode === "1-3",
        }

        // ✅ Process fields langsung dengan explicit field assignment
        console.log("🔍 Available fields in item:", Object.keys(item))

        // Manual field assignment berdasarkan known mapping pattern untuk Tridharma
        if (item.no !== undefined) {
          processedItem.no = this.processFieldValue("no", item.no, "number")
        }

        if (item.lembaga_mitra !== undefined) {
          processedItem.lembaga_mitra = this.processFieldValue(
            "lembaga_mitra",
            item.lembaga_mitra,
            "text"
          )
        }

        // ✅ HAPUS: Proses tingkat sebagai boolean, biarkan sebagai text
        if (item.tingkat_internasional !== undefined) {
          processedItem.tingkat_internasional = this.processFieldValue(
            "tingkat_internasional",
            item.tingkat_internasional,
            "text" // ✅ UBAH dari "boolean" ke "text"
          )
        }

        if (item.tingkat_nasional !== undefined) {
          processedItem.tingkat_nasional = this.processFieldValue(
            "tingkat_nasional",
            item.tingkat_nasional,
            "text" // ✅ UBAH dari "boolean" ke "text"
          )
        }

        if (item.tingkat_lokal_wilayah !== undefined) {
          processedItem.tingkat_lokal_wilayah = this.processFieldValue(
            "tingkat_lokal_wilayah",
            item.tingkat_lokal_wilayah,
            "text" // ✅ UBAH dari "boolean" ke "text"
          )
        }

        if (item.judul_kegiatan_kerjasama !== undefined) {
          processedItem.judul_kegiatan_kerjasama = this.processFieldValue(
            "judul_kegiatan_kerjasama",
            item.judul_kegiatan_kerjasama,
            "text"
          )
        }

        // ✅ CRITICAL: Process manfaat field dengan explicit text type
        if (item.manfaat_bagi_ps_yang_diakreditasi !== undefined) {
          console.log(
            `🎯 Processing manfaat field: "${item.manfaat_bagi_ps_yang_diakreditasi}"`
          )
          processedItem.manfaat_bagi_ps_yang_diakreditasi =
            this.processFieldValue(
              "manfaat_bagi_ps_yang_diakreditasi",
              item.manfaat_bagi_ps_yang_diakreditasi,
              "text" // ✅ FORCE TEXT TYPE
            )
          console.log(
            `✅ Manfaat result: "${processedItem.manfaat_bagi_ps_yang_diakreditasi}"`
          )
        }

        // ✅ USE PluginUtils: Enhanced date field processing
        if (item.tanggal_awal_kerjasama_hh_bb_tttt !== undefined) {
          console.log(
            `📅 Processing tanggal awal: "${
              item.tanggal_awal_kerjasama_hh_bb_tttt
            }" (type: ${typeof item.tanggal_awal_kerjasama_hh_bb_tttt})`
          )

          // ✅ USE PluginUtils for immediate conversion
          if (typeof item.tanggal_awal_kerjasama_hh_bb_tttt === "number") {
            const isoDate = PluginUtils.excelSerialDateToFormat(
              item.tanggal_awal_kerjasama_hh_bb_tttt
            )
            if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
              const [year, month, day] = isoDate.split("-")
              processedItem.tanggal_awal_kerjasama_hh_bb_tttt = `${day}/${month}/${year}`
            } else {
              processedItem.tanggal_awal_kerjasama_hh_bb_tttt = isoDate || ""
            }
          } else {
            processedItem.tanggal_awal_kerjasama_hh_bb_tttt =
              this.processFieldValue(
                "tanggal_awal_kerjasama_hh_bb_tttt",
                item.tanggal_awal_kerjasama_hh_bb_tttt,
                "date"
              )
          }

          console.log(
            `✅ Tanggal awal result: "${processedItem.tanggal_awal_kerjasama_hh_bb_tttt}"`
          )
        }

        if (item.tanggal_akhir_kerjasama_hh_bb_tttt !== undefined) {
          console.log(
            `📅 Processing tanggal akhir: "${
              item.tanggal_akhir_kerjasama_hh_bb_tttt
            }" (type: ${typeof item.tanggal_akhir_kerjasama_hh_bb_tttt})`
          )

          // ✅ USE PluginUtils for immediate conversion
          if (typeof item.tanggal_akhir_kerjasama_hh_bb_tttt === "number") {
            const isoDate = PluginUtils.excelSerialDateToFormat(
              item.tanggal_akhir_kerjasama_hh_bb_tttt
            )
            if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
              const [year, month, day] = isoDate.split("-")
              processedItem.tanggal_akhir_kerjasama_hh_bb_tttt = `${day}/${month}/${year}`
            } else {
              processedItem.tanggal_akhir_kerjasama_hh_bb_tttt = isoDate || ""
            }
          } else {
            processedItem.tanggal_akhir_kerjasama_hh_bb_tttt =
              this.processFieldValue(
                "tanggal_akhir_kerjasama_hh_bb_tttt",
                item.tanggal_akhir_kerjasama_hh_bb_tttt,
                "date"
              )
          }

          console.log(
            `✅ Tanggal akhir result: "${processedItem.tanggal_akhir_kerjasama_hh_bb_tttt}"`
          )
        }

        if (item.durasi_dalam_tahun !== undefined) {
          processedItem.durasi_dalam_tahun = this.processFieldValue(
            "durasi_dalam_tahun",
            item.durasi_dalam_tahun,
            "number"
          )
        }

        if (item.status_kerjasama !== undefined) {
          processedItem.status_kerjasama = this.processFieldValue(
            "status_kerjasama",
            item.status_kerjasama,
            "text"
          )
        }

        if (item.bukti_kerjasama !== undefined) {
          processedItem.bukti_kerjasama = this.processFieldValue(
            "bukti_kerjasama",
            item.bukti_kerjasama,
            "text"
          )
        }

        // ✅ HAPUS: Ensure at least one tingkat is selected
        // Karena sekarang tingkat bukan boolean, tidak perlu default selection

        console.log(`✅ Final processed item ${index + 1}:`, processedItem)
        return processedItem
      })

      // Maintain existing structure
      result.shouldReplaceExisting = false
      result.selectionRows = result.allRows
    }

    console.log("🎯 TridharmaPlugin final result:", {
      allRowsLength: result?.allRows?.length || 0,
      shouldReplaceExisting: result?.shouldReplaceExisting,
      sampleProcessedRow: result?.allRows?.[0],
    })

    return result
  }

  // ✅ USE PluginUtils: Dynamic normalization with enhanced date handling
  normalizeData(data) {
    console.log(
      "🔧 TridharmaPlugin.normalizeData called with:",
      data.length,
      "rows"
    )

    if (!data || !Array.isArray(data)) return data

    return data.map((row, index) => {
      const result = {
        ...row,
        id: row.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: row.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        no: index + 1,
      }

      // ✅ Ensure manfaat field is processed as text
      if (result.manfaat_bagi_ps_yang_diakreditasi !== undefined) {
        console.log(
          `🔧 Normalizing manfaat: "${result.manfaat_bagi_ps_yang_diakreditasi}"`
        )
        result.manfaat_bagi_ps_yang_diakreditasi = this.processFieldValue(
          "manfaat_bagi_ps_yang_diakreditasi",
          result.manfaat_bagi_ps_yang_diakreditasi,
          "text"
        )
        console.log(
          `✅ Normalized manfaat: "${result.manfaat_bagi_ps_yang_diakreditasi}"`
        )
      }

      // ✅ USE PluginUtils: Enhanced date field normalization
      if (result.tanggal_awal_kerjasama_hh_bb_tttt !== undefined) {
        const dateValue = result.tanggal_awal_kerjasama_hh_bb_tttt

        // ✅ USE PluginUtils for conversion
        if (
          typeof dateValue === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ) {
          console.log(`🔄 Converting tanggal awal ISO: ${dateValue}`)
          const [year, month, day] = dateValue.split("-")
          result.tanggal_awal_kerjasama_hh_bb_tttt = `${day}/${month}/${year}`
          console.log(
            `✅ Tanggal awal converted: ${result.tanggal_awal_kerjasama_hh_bb_tttt}`
          )
        } else if (typeof dateValue === "number") {
          // ✅ USE PluginUtils: Handle Excel serial numbers
          const isoDate = PluginUtils.excelSerialDateToFormat(dateValue)
          if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
            const [year, month, day] = isoDate.split("-")
            result.tanggal_awal_kerjasama_hh_bb_tttt = `${day}/${month}/${year}`
          }
        } else {
          result.tanggal_awal_kerjasama_hh_bb_tttt = this.processFieldValue(
            "tanggal_awal_kerjasama_hh_bb_tttt",
            result.tanggal_awal_kerjasama_hh_bb_tttt,
            "date"
          )
        }
      }

      if (result.tanggal_akhir_kerjasama_hh_bb_tttt !== undefined) {
        const dateValue = result.tanggal_akhir_kerjasama_hh_bb_tttt

        // ✅ USE PluginUtils for conversion
        if (
          typeof dateValue === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ) {
          console.log(`🔄 Converting tanggal akhir ISO: ${dateValue}`)
          const [year, month, day] = dateValue.split("-")
          result.tanggal_akhir_kerjasama_hh_bb_tttt = `${day}/${month}/${year}`
          console.log(
            `✅ Tanggal akhir converted: ${result.tanggal_akhir_kerjasama_hh_bb_tttt}`
          )
        } else if (typeof dateValue === "number") {
          // ✅ USE PluginUtils: Handle Excel serial numbers
          const isoDate = PluginUtils.excelSerialDateToFormat(dateValue)
          if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
            const [year, month, day] = isoDate.split("-")
            result.tanggal_akhir_kerjasama_hh_bb_tttt = `${day}/${month}/${year}`
          }
        } else {
          result.tanggal_akhir_kerjasama_hh_bb_tttt = this.processFieldValue(
            "tanggal_akhir_kerjasama_hh_bb_tttt",
            result.tanggal_akhir_kerjasama_hh_bb_tttt,
            "date"
          )
        }
      }

      // ✅ HAPUS: Ensure at least one tingkat is selected
      // Karena sekarang tingkat bukan boolean, tidak perlu logic ini

      return result
    })
  }

  // ✅ REST OF THE METHODS REMAIN THE SAME...
  // (Keeping all other methods unchanged for brevity)

  // ✅ Dynamic field mapping for backward compatibility
  mapKerjasamaFields(sampleItem) {
    console.log("🗺️ Mapping kerjasama fields from:", Object.keys(sampleItem))

    const mapping = {
      lembaga_mitra: this.findFieldByPattern(sampleItem, [
        "lembaga_mitra",
        "mitra",
        "lembaga",
        "partner",
        "institusi",
      ]),
      judul_kegiatan_kerjasama: this.findFieldByPattern(sampleItem, [
        "judul_kegiatan_kerjasama",
        "judul_kegiatan",
        "kegiatan_kerjasama",
        "judul",
        "kegiatan",
        "kerjasama",
        "title",
        "activity",
      ]),
      manfaat_bagi_ps_yang_diakreditasi: this.findFieldByPattern(sampleItem, [
        "manfaat_bagi_ps_yang_diakreditasi",
        "manfaat_bagi_ps",
        "manfaat",
      ]),
      tanggal_awal_kerjasama_hh_bb_tttt: this.findFieldByPattern(sampleItem, [
        "tanggal_awal_kerjasama_hh_bb_tttt",
        "tanggal_awal_kerjasama",
        "tanggal_awal",
        "awal_kerjasama",
        "start_date",
        "mulai",
      ]),
      tanggal_akhir_kerjasama_hh_bb_tttt: this.findFieldByPattern(sampleItem, [
        "tanggal_akhir_kerjasama_hh_bb_tttt",
        "tanggal_akhir_kerjasama",
        "tanggal_akhir",
        "akhir_kerjasama",
        "end_date",
        "selesai",
      ]),
      durasi_dalam_tahun: this.findFieldByPattern(sampleItem, [
        "durasi_dalam_tahun",
        "durasi",
        "lama",
        "tahun",
        "duration",
      ]),
      status_kerjasama: this.findFieldByPattern(sampleItem, [
        "status_kerjasama",
        "status",
        "kondisi",
        "state",
      ]),
      bukti_kerjasama: this.findFieldByPattern(sampleItem, [
        "bukti_kerjasama",
        "bukti",
        "dokumen",
        "evidence",
        "proof",
      ]),
      tingkat_internasional: this.findFieldByPattern(sampleItem, [
        "tingkat_internasional",
        "internasional",
        "international",
      ]),
      tingkat_nasional: this.findFieldByPattern(sampleItem, [
        "tingkat_nasional",
        "nasional",
        "national",
      ]),
      tingkat_lokal_wilayah: this.findFieldByPattern(sampleItem, [
        "tingkat_lokal_wilayah",
        "lokal_wilayah",
        "lokal",
        "wilayah",
        "regional",
        "local",
      ]),
      pendidikan: this.findFieldByPattern(sampleItem, [
        "pendidikan",
        "education",
        "teaching",
      ]),
      penelitian: this.findFieldByPattern(sampleItem, [
        "penelitian",
        "research",
        "riset",
      ]),
      pkm: this.findFieldByPattern(sampleItem, [
        "pkm",
        "pengabdian",
        "masyarakat",
        "community_service",
        "service",
      ]),
    }

    console.log("✅ Field mapping result:", mapping)
    return mapping
  }

  // ✅ REST OF THE METHODS REMAIN THE SAME...
  filterSelectedDataBySection(data, sectionCode) {
    const selectedData = data.filter((item) => item.selected === true)

    switch (sectionCode) {
      case "1-1":
        return selectedData.filter((item) => item.pendidikan === true)
      case "1-2":
        return selectedData.filter((item) => item.penelitian === true)
      case "1-3":
        return selectedData.filter((item) => item.pkm === true)
      default:
        return selectedData
    }
  }

  async getPreviousSectionsDetails(currentSectionCode, projectId) {
    const previousSections = []
    const sectionsToFetch = []

    if (currentSectionCode === "1-2") {
      sectionsToFetch.push("1-1")
    } else if (currentSectionCode === "1-3") {
      sectionsToFetch.push("1-1", "1-2")
    }

    for (const sectionCode of sectionsToFetch) {
      try {
        const scoreDetail = await this.fetchScoreDetails(sectionCode, projectId)
        if (scoreDetail) {
          previousSections.push({
            sectionCode,
            ...scoreDetail,
          })
        }
      } catch (error) {
        console.warn(
          `Failed to fetch score details for section ${sectionCode}:`,
          error
        )
      }
    }

    return previousSections
  }

  determineSectionCode(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null
    }

    const pendidikanCount = data.filter(
      (item) => item.pendidikan === true
    ).length
    const penelitianCount = data.filter(
      (item) => item.penelitian === true
    ).length
    const pkmCount = data.filter((item) => item.pkm === true).length

    if (
      pendidikanCount > 0 &&
      pendidikanCount >= penelitianCount &&
      pendidikanCount >= pkmCount
    ) {
      return "1-1"
    } else if (penelitianCount > 0 && penelitianCount >= pkmCount) {
      return "1-2"
    } else if (pkmCount > 0) {
      return "1-3"
    }

    return null
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (item.selected) {
        if (!item.lembaga_mitra) {
          errors.push(`Row ${index + 1}: Lembaga mitra harus diisi`)
        }

        if (!item.judul_kegiatan_kerjasama) {
          errors.push(`Row ${index + 1}: Judul kegiatan kerjasama harus diisi`)
        }

        // ✅ UPDATE: Validate tingkat selection sebagai text (bukan boolean)
        const hasTingkat =
          (item.tingkat_internasional &&
            item.tingkat_internasional.trim() !== "") ||
          (item.tingkat_nasional && item.tingkat_nasional.trim() !== "") ||
          (item.tingkat_lokal_wilayah &&
            item.tingkat_lokal_wilayah.trim() !== "")

        if (!hasTingkat) {
          errors.push(
            `Row ${
              index + 1
            }: Harus mengisi minimal satu tingkat (Internasional/Nasional/Lokal)`
          )
        }

        // Validate activity type
        const hasActivity = item.pendidikan || item.penelitian || item.pkm

        if (!hasActivity) {
          errors.push(
            `Row ${
              index + 1
            }: Harus memilih minimal satu jenis kegiatan (Pendidikan/Penelitian/PkM)`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async fetchScoreDetails(tableCode, projectId) {
    try {
      return await fetchScoreDetails(tableCode, projectId)
    } catch (error) {
      console.error(`Error fetching score details for ${tableCode}:`, error)
      return null
    }
  }

  // ✅ Helper method dengan logging
  findFieldByPattern(item, patterns) {
    const fields = Object.keys(item)

    for (const pattern of patterns) {
      const field = fields.find((f) =>
        f.toLowerCase().includes(pattern.toLowerCase())
      )
      if (field) {
        console.log(`✅ Pattern match: "${pattern}" -> "${field}"`)
        return field
      }
    }

    console.log(`❌ No match for patterns:`, patterns)
    return null
  }
}

export const tridharmaPlugin = new TridharmaPlugin()
export default tridharmaPlugin
