import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class KurikulumCapaianRencanaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a1",
      name: "Kurikulum Capaian Rencana Plugin",
      description:
        "Plugin untuk mentrackt capaian pembelajaran dari tabel 5.a.1 LKPS",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isCapaianPembelajaranSection: true,
    }
  }

  hasDefaultData() {
    return false
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
        selected: true,
        semester: "",
        kode_mata_kuliah: "",
        nama_mata_kuliah: "",
        mata_kuliah_kompetensi: "",
        kuliah_responsi_tutorial_bobot_kredit_sks: 0,
        seminar_bobot_kredit_sks: 0,
        praktikum_praktik_praktik_lapangan_bobot_kredit_sks: 0,
        konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi: 0,
        sikap_capaian_pembelajaran: "",
        pengetahuan_capaian_pembelajaran: "",
        keterampilan_umum_capaian_pembelajaran: "",
        keterampilan_khusus_capaian_pembelajaran: "",
        dokumen_rencana_pembelajaran: "",
        unit_penyeleng_gara: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (
          [
            "semester",
            "kode_mata_kuliah",
            "nama_mata_kuliah",
            "mata_kuliah_kompetensi",
            "sikap_capaian_pembelajaran",
            "pengetahuan_capaian_pembelajaran",
            "keterampilan_umum_capaian_pembelajaran",
            "keterampilan_khusus_capaian_pembelajaran",
            "dokumen_rencana_pembelajaran",
            "unit_penyeleng_gara",
          ].includes(fieldName)
        ) {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else {
          item[fieldName] = PluginUtils.parseNumber(value, 0)
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  /**
   * Helper method to check if row has valid data (equivalent to Excel COUNTIFS condition)
   * Checks if semester, kode_mata_kuliah, and nama_mata_kuliah are not empty
   */
  isValidRow(item) {
    const semester = PluginUtils.normalizeTextField(item.semester)
    const kodeMataKuliah = PluginUtils.normalizeTextField(item.kode_mata_kuliah)
    const namaMataKuliah = PluginUtils.normalizeTextField(item.nama_mata_kuliah)

    return semester !== "" && kodeMataKuliah !== "" && namaMataKuliah !== ""
  }

  /**
   * Calculate additional metrics based on Excel formulas
   */
  calculateAdditionalMetrics(data) {
    const validData = data.filter((item) => this.isValidRow(item))

    // Jumlah Mata Kuliah
    const jumlahMataKuliah = validData.length

    // Jumlah Mata Kuliah Kompetensi (where mata_kuliah_kompetensi = "V")
    const jumlahMataKuliahKompetensi = validData.filter((item) => {
      const kompetensi = PluginUtils.normalizeTextField(
        item.mata_kuliah_kompetensi
      )
      return (
        kompetensi.toLowerCase() === "v" || kompetensi.toLowerCase() === "ya"
      )
    }).length

    // Jumlah SKS Kuliah/Responsi/Tutorial
    const jumlahSksKuliah = validData.reduce((sum, item) => {
      return (
        sum + parseFloat(item.kuliah_responsi_tutorial_bobot_kredit_sks || 0)
      )
    }, 0)

    // Jumlah SKS Seminar
    const jumlahSksSeminar = validData.reduce((sum, item) => {
      return sum + parseFloat(item.seminar_bobot_kredit_sks || 0)
    }, 0)

    // Jumlah SKS Praktikum/Praktik/Praktik Lapangan
    const jumlahSksPraktikum = validData.reduce((sum, item) => {
      return (
        sum +
        parseFloat(
          item.praktikum_praktik_praktik_lapangan_bobot_kredit_sks || 0
        )
      )
    }, 0)

    // Jumlah Konversi Kredit ke Jam
    const jumlahKonversiKredit = validData.reduce((sum, item) => {
      return (
        sum +
        parseFloat(item.konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi || 0)
      )
    }, 0)

    return {
      jumlahMataKuliah,
      jumlahMataKuliahKompetensi,
      jumlahSksKuliah,
      jumlahSksSeminar,
      jumlahSksPraktikum,
      jumlahKonversiKredit,
      validDataCount: validData.length,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    if (!data || data.length === 0) {
      return {
        scores: [
          {
            butir: 43,
            nilai: 0,
          },
        ],
        scoreDetail: {
          JP: 0,
          JB: 0,
          PJP: 0,
          // Additional metrics
          jumlahMataKuliah: 0,
          jumlahMataKuliahKompetensi: 0,
          jumlahSksKuliah: 0,
          jumlahSksSeminar: 0,
          jumlahSksPraktikum: 0,
          jumlahKonversiKredit: 0,
        },
      }
    }

    // Calculate additional metrics
    const additionalMetrics = this.calculateAdditionalMetrics(data)

    // Filter valid data for main calculation
    const validData = data.filter((item) => this.isValidRow(item))

    
    const JP = (additionalMetrics.jumlahSksPraktikum * 170) / 60

    // JB = ((jumlahSksKuliah + jumlahSksSeminar) * 50) + (jumlahSksPraktikum * 170) / 60
    const JB =
      ((additionalMetrics.jumlahSksKuliah +
        additionalMetrics.jumlahSksSeminar) *
        50 +
        additionalMetrics.jumlahSksPraktikum * 170) /
      60

    const PJP = JB > 0 ? (JP / JB) * 100 : 0
    const nilai = PJP >= 50 ? 4 : Math.round(8 * PJP) / 100

    console.log("=== Kurikulum Capaian Rencana Calculation ===")
    console.log("Valid Data Count:", validData.length)
    console.log("Jumlah SKS Kuliah:", additionalMetrics.jumlahSksKuliah)
    console.log("Jumlah SKS Seminar:", additionalMetrics.jumlahSksSeminar)
    console.log("Jumlah SKS Praktikum:", additionalMetrics.jumlahSksPraktikum)
    console.log("JP Formula: jumlahSksPraktikum * 170 / 60 =", JP)
    console.log(
      "JB Formula: ((jumlahSksKuliah + jumlahSksSeminar) * 50) + (jumlahSksPraktikum * 170) / 60 =",
      JB
    )
    console.log("PJP (%):", PJP)
    console.log("Score:", nilai)
    console.log("Additional Metrics:", additionalMetrics)

    return {
      scores: [
        {
          butir: 43,
          nilai: PluginUtils.roundToDecimal(nilai),
        },
      ],
      scoreDetail: {
        JP: Math.round(JP * 100) / 100,
        JB: Math.round(JB * 100) / 100,
        PJP: Math.round(PJP * 100) / 100,
        jumlahMataKuliah: additionalMetrics.jumlahMataKuliah,
        jumlahMataKuliahKompetensi:
          additionalMetrics.jumlahMataKuliahKompetensi,
        jumlahSksKuliah:
          Math.round(additionalMetrics.jumlahSksKuliah * 100) / 100,
        jumlahSksSeminar:
          Math.round(additionalMetrics.jumlahSksSeminar * 100) / 100,
        jumlahSksPraktikum:
          Math.round(additionalMetrics.jumlahSksPraktikum * 100) / 100,
        jumlahKonversiKredit:
          Math.round(additionalMetrics.jumlahKonversiKredit * 100) / 100,
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const numericFields = [
        "kuliah_responsi_tutorial_bobot_kredit_sks",
        "seminar_bobot_kredit_sks",
        "praktikum_praktik_praktik_lapangan_bobot_kredit_sks",
        "konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi",
      ]

      const textFields = [
        "semester",
        "kode_mata_kuliah",
        "nama_mata_kuliah",
        "mata_kuliah_kompetensi",
        "sikap_capaian_pembelajaran",
        "pengetahuan_capaian_pembelajaran",
        "keterampilan_umum_capaian_pembelajaran",
        "keterampilan_khusus_capaian_pembelajaran",
        "dokumen_rencana_pembelajaran",
        "unit_penyeleng_gara",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      numericFields.forEach((field) => {
        result[field] = PluginUtils.parseNumber(result[field], 0)
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, idx) => {
      // Check if row has valid data
      if (!this.isValidRow(item)) {
        errors.push(
          `Row ${
            idx + 1
          }: Semester, kode mata kuliah, dan nama mata kuliah wajib diisi`
        )
      }

      // Only validate total bobot for valid rows
      if (this.isValidRow(item)) {
        const totalBobot =
          parseFloat(item.kuliah_responsi_tutorial_bobot_kredit_sks || 0) +
          parseFloat(item.seminar_bobot_kredit_sks || 0) +
          parseFloat(
            item.praktikum_praktik_praktik_lapangan_bobot_kredit_sks || 0
          )

        if (totalBobot <= 0) {
          errors.push(`Row ${idx + 1}: Bobot kredit total harus lebih dari 0`)
        }

        // Validate konversi kredit
        const konversi = parseFloat(
          item.konversi_kredit_ke_jam_diisi_oleh_pengusul_vokasi || 0
        )
        if (konversi <= 0) {
          errors.push(
            `Row ${idx + 1}: Konversi kredit ke jam harus lebih dari 0`
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

export const kurikulumCapaianRencanaPlugin = new KurikulumCapaianRencanaPlugin()

export default kurikulumCapaianRencanaPlugin
