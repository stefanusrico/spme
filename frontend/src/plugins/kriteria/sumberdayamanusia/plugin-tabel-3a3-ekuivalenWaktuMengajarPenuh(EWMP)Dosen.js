import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class EkuivalenWaktuMengajarPenuhDosenPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a3",
      name: "Ekuivalen Waktu Mengajar Penuh (EWMP) Dosen",
      description:
        "Plugin for processing Lecturer Full Teaching Time Equivalent",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isEkuivalenWaktuMengajarPenuhDosen: true,
    }
  }

  hasDefaultData() {
    return false
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    // ✅ Recalculate setelah processing Excel data
    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => this.recalculateRow(item))
    }

    return result
  }

  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    if (fieldLower.includes("dtps")) {
      return "boolean"
    }

    if (
      fieldLower.includes("sks") ||
      fieldLower.includes("pendidikan") ||
      fieldLower.includes("pembelajaran") ||
      fieldLower.includes("penelitian") ||
      fieldLower.includes("pkm") ||
      fieldLower.includes("tugas") ||
      fieldLower.includes("jumlah") ||
      fieldLower.includes("ps_") ||
      fieldLower.includes("ewmp")
    ) {
      return "formatted_number"
    }

    return super.detectFieldType(fieldName, value)
  }

  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "boolean") {
      return PluginUtils.parseBoolean(value)
    }

    return super.processFieldValue(fieldName, value, fieldType)
  }

  // ✅ Dynamic field mapping tanpa hardcode
  getFieldNames(item) {
    const fields = Object.keys(item)
    console.log("Available fields:", fields)

    const fieldMapping = {
      nama_dosen: null,
      dtps: null,
      ps_diakreditasi: null,
      ps_dalam_pt: null,
      ps_luar_pt: null,
      penelitian: null,
      pkm: null,
      tugas_tambahan: null,
      jumlah_per_tahun: null,
      jumlah_per_semester: null,
    }

    // ✅ Pattern-based field detection
    const patterns = {
      nama_dosen: [/^.*nama.*dosen.*$/i, /^.*nama.*$/i, /^.*dosen.*$/i],
      dtps: [/^.*dtps.*$/i],
      ps_diakreditasi: [
        /^.*ps.*yang.*diakreditasi.*$/i,
        /^.*ps.*diakreditasi.*$/i,
        /^.*yang.*diakreditasi.*$/i,
        /^.*diakreditasi.*$/i,
        /^.*pendidikan.*ps.*$/i,
      ],
      ps_dalam_pt: [
        /^.*ps.*lain.*dalam.*pt.*$/i,
        /^.*ps.*dalam.*pt.*$/i,
        /^.*lain.*dalam.*pt.*$/i,
        /^.*dalam.*pt.*$/i,
      ],
      ps_luar_pt: [
        /^.*ps.*lain.*luar.*pt.*$/i,
        /^.*ps.*luar.*pt.*$/i,
        /^.*lain.*luar.*pt.*$/i,
        /^.*luar.*pt.*$/i,
      ],
      penelitian: [/^.*penelitian.*$/i, /^.*ewmp.*penelitian.*$/i],
      pkm: [/^.*pkm.*$/i, /^.*pengabdian.*$/i, /^.*ewmp.*pkm.*$/i],
      tugas_tambahan: [
        /^.*tugas.*tambahan.*$/i,
        /^.*tugas.*penunjang.*$/i,
        /^.*penunjang.*$/i,
        /^.*tambahan.*$/i,
      ],
      jumlah_per_tahun: [
        /^.*jumlah.*per.*tahun.*$/i,
        /^.*jumlah.*tahun.*$/i,
        /^.*total.*tahun.*$/i,
        /^.*tahun.*sks.*$/i,
      ],
      jumlah_per_semester: [
        /^.*jumlah.*per.*semester.*$/i,
        /^.*jumlah.*semester.*$/i,
        /^.*total.*semester.*$/i,
        /^.*semester.*sks.*$/i,
      ],
    }

    // ✅ Find fields using patterns dengan prioritas
    for (const [fieldType, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        const matchedField = fields.find((field) => regex.test(field))

        if (matchedField) {
          fieldMapping[fieldType] = matchedField
          break // Gunakan yang pertama ditemukan
        }
      }
    }

    // ✅ Fallback ke default names jika tidak ditemukan
    const result = {
      nama_dosen: fieldMapping.nama_dosen || "nama_dosen",
      dtps: fieldMapping.dtps || "dtps",
      ps_diakreditasi: fieldMapping.ps_diakreditasi || "ps_yang_diakreditasi",
      ps_dalam_pt: fieldMapping.ps_dalam_pt || "ps_lain_di_dalam_pt",
      ps_luar_pt: fieldMapping.ps_luar_pt || "ps_lain_di_luar_pt",
      penelitian: fieldMapping.penelitian || "penelitian",
      pkm: fieldMapping.pkm || "pkm",
      tugas_tambahan: fieldMapping.tugas_tambahan || "tugas_tambahan",
      jumlah_per_tahun: fieldMapping.jumlah_per_tahun || "jumlah_per_tahun",
      jumlah_per_semester:
        fieldMapping.jumlah_per_semester || "jumlah_per_semester",
    }

    console.log("Field mapping result:", result)
    console.log("Field existence check:", {
      nama_dosen: item.hasOwnProperty(result.nama_dosen),
      dtps: item.hasOwnProperty(result.dtps),
      ps_diakreditasi: item.hasOwnProperty(result.ps_diakreditasi),
      jumlah_per_tahun: item.hasOwnProperty(result.jumlah_per_tahun),
      jumlah_per_semester: item.hasOwnProperty(result.jumlah_per_semester),
    })

    return result
  }

  // ✅ Enhanced Dynamic row recalculation
  recalculateRow(row) {
    const fields = this.getFieldNames(row)
    const updatedRow = { ...row }

    // ✅ Only calculate if DTPS is true
    const isDTPS = PluginUtils.parseBoolean(row[fields.dtps])

    if (!isDTPS) {
      // If not DTPS, set calculated fields to 0
      updatedRow[fields.jumlah_per_tahun] = 0
      updatedRow[fields.jumlah_per_semester] = 0
      return updatedRow
    }

    // ✅ Calculate jumlah per tahun
    const ps_diakreditasi = parseFloat(row[fields.ps_diakreditasi]) || 0
    const ps_dalam_pt = parseFloat(row[fields.ps_dalam_pt]) || 0
    const ps_luar_pt = parseFloat(row[fields.ps_luar_pt]) || 0
    const penelitian = parseFloat(row[fields.penelitian]) || 0
    const pkm = parseFloat(row[fields.pkm]) || 0
    const tugas_tambahan = parseFloat(row[fields.tugas_tambahan]) || 0

    const totalPerTahun =
      ps_diakreditasi +
      ps_dalam_pt +
      ps_luar_pt +
      penelitian +
      pkm +
      tugas_tambahan
    const totalPerSemester = totalPerTahun / 2

    // Update calculated fields
    updatedRow[fields.jumlah_per_tahun] = parseFloat(totalPerTahun.toFixed(2))
    updatedRow[fields.jumlah_per_semester] = parseFloat(
      totalPerSemester.toFixed(2)
    )

    console.log(`Recalculating row:`, {
      fields,
      isDTPS,
      values: {
        ps_diakreditasi,
        ps_dalam_pt,
        ps_luar_pt,
        penelitian,
        pkm,
        tugas_tambahan,
        totalPerTahun,
        totalPerSemester,
      },
      before: {
        tahun: row[fields.jumlah_per_tahun],
        semester: row[fields.jumlah_per_semester],
      },
      after: {
        tahun: updatedRow[fields.jumlah_per_tahun],
        semester: updatedRow[fields.jumlah_per_semester],
      },
    })

    return updatedRow
  }

  // ✅ Dynamic normalization dengan recalculation
  normalizeData(data) {
    if (!Array.isArray(data)) return []

    const normalizedData = data.map((item, index) => {
      const result = {
        ...item,
        id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        no: index + 1,
      }

      const fields = this.getFieldNames(result)

      // Convert numeric fields
      const numericFields = [
        fields.ps_diakreditasi,
        fields.ps_dalam_pt,
        fields.ps_luar_pt,
        fields.penelitian,
        fields.pkm,
        fields.tugas_tambahan,
      ]

      numericFields.forEach((field) => {
        if (field && result[field] !== undefined) {
          result[field] = parseFloat(result[field]) || 0
        }
      })

      // Process boolean field
      if (fields.dtps && result[fields.dtps] !== undefined) {
        result[fields.dtps] = PluginUtils.parseBoolean(result[fields.dtps])
      }

      return result
    })

    // ✅ Recalculate semua rows setelah normalization
    return normalizedData.map((row) => this.recalculateRow(row))
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fields = this.getFieldNames(item)

      // Check required fields
      if (
        !item[fields.nama_dosen] ||
        String(item[fields.nama_dosen]).trim() === ""
      ) {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }

      if (item[fields.dtps] === undefined) {
        errors.push(`Row ${index + 1}: DTPS harus diisi`)
      }

      // Validate numeric fields for DTPS lecturers
      const isDTPS = PluginUtils.parseBoolean(item[fields.dtps])

      if (isDTPS) {
        const numericFields = [
          { field: fields.ps_diakreditasi, label: "PS yang diakreditasi" },
          { field: fields.ps_dalam_pt, label: "PS lain dalam PT" },
          { field: fields.ps_luar_pt, label: "PS lain luar PT" },
          { field: fields.penelitian, label: "Penelitian" },
          { field: fields.pkm, label: "PkM" },
          { field: fields.tugas_tambahan, label: "Tugas tambahan" },
        ]

        numericFields.forEach(({ field, label }) => {
          if (field && item[field] !== undefined) {
            const num = parseFloat(item[field])
            if (isNaN(num) || num < 0) {
              errors.push(`Row ${index + 1}: ${label} harus berupa angka >= 0`)
            }
          }
        })

        // ✅ Auto-recalculate if needed
        const ps_diakreditasi = parseFloat(item[fields.ps_diakreditasi]) || 0
        const ps_dalam_pt = parseFloat(item[fields.ps_dalam_pt]) || 0
        const ps_luar_pt = parseFloat(item[fields.ps_luar_pt]) || 0
        const penelitian = parseFloat(item[fields.penelitian]) || 0
        const pkm = parseFloat(item[fields.pkm]) || 0
        const tugas_tambahan = parseFloat(item[fields.tugas_tambahan]) || 0

        const expectedTahun =
          ps_diakreditasi +
          ps_dalam_pt +
          ps_luar_pt +
          penelitian +
          pkm +
          tugas_tambahan
        const expectedSemester = expectedTahun / 2

        const actualTahun = parseFloat(item[fields.jumlah_per_tahun]) || 0
        const actualSemester = parseFloat(item[fields.jumlah_per_semester]) || 0

        // Auto-correct if differences found
        if (Math.abs(expectedTahun - actualTahun) > 0.01) {
          console.log(
            `Row ${
              index + 1
            }: Auto-correcting jumlah per tahun from ${actualTahun} to ${expectedTahun.toFixed(
              2
            )}`
          )
          item[fields.jumlah_per_tahun] = parseFloat(expectedTahun.toFixed(2))
        }

        if (Math.abs(expectedSemester - actualSemester) > 0.01) {
          console.log(
            `Row ${
              index + 1
            }: Auto-correcting jumlah per semester from ${actualSemester} to ${expectedSemester.toFixed(
              2
            )}`
          )
          item[fields.jumlah_per_semester] = parseFloat(
            expectedSemester.toFixed(2)
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

export const ekuivalenWaktuMengajarPenuhDosenPlugin =
  new EkuivalenWaktuMengajarPenuhDosenPlugin()
export default ekuivalenWaktuMengajarPenuhDosenPlugin
