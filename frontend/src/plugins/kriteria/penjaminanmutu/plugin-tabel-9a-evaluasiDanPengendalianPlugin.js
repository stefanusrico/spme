import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class EvaluasiDanPengendalianPlugin extends BasePlugin {
  constructor() {
    super({
      code: "9a",
      name: "Evaluasi dan Pengendalian Plugin",
      description: "Plugin for evaluating and controlling SPMI implementation",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isEvaluasiDanPengendalianSection: true,
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
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        nama_standar_sn_dikti: PluginUtils.normalizeTextField(row[1]),
        ketersediaan_standar_p: this.parseBooleanField(row[2]),
        pelaksanaan_standar_p: this.parseBooleanField(row[3]),
        monitoring_evaluasi_dan_audit_mutu_internal_e: this.parseBooleanField(
          row[4]
        ),
        umpan_balik_audit_mutu_internal_p: this.parseBooleanField(row[5]),
        tindak_lanjut_audit_mutu_internal_p: this.parseBooleanField(row[6]),
        tanggal_audit_mutu_internal_hh_bb_tttt: PluginUtils.normalizeTextField(
          row[7]
        ),
      }
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  parseBooleanField(value) {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      const normalized = value.trim().toUpperCase()
      return (
        normalized === "V" ||
        normalized === "YA" ||
        normalized === "YES" ||
        normalized === "✓"
      )
    }
    return false
  }

  async calculateScore(data, config, additionalData = {}) {
    const allRows =
      data && data.allRows ? data.allRows : Array.isArray(data) ? data : []

    if (!allRows || allRows.length === 0) {
      return {
        scores: [{ butir: 74, nilai: 0 }],
        scoreDetail: {
          jumlah_standar: 0,
          standar_terimplementasi: 0,
          persentase_implementasi: 0,
        },
      }
    }

    const jumlahStandar = allRows.length
    let standarTerimplementasi = 0

    allRows.forEach((item) => {
      let implementasiCount = 0
      if (item.ketersediaan_standar_p) implementasiCount++
      if (item.pelaksanaan_standar_p) implementasiCount++
      if (item.monitoring_evaluasi_dan_audit_mutu_internal_e)
        implementasiCount++
      if (item.umpan_balik_audit_mutu_internal_p) implementasiCount++
      if (item.tindak_lanjut_audit_mutu_internal_p) implementasiCount++

      if (implementasiCount >= 5) {
        standarTerimplementasi++
      }
    })

    const persentaseImplementasi =
      jumlahStandar > 0 ? (standarTerimplementasi / jumlahStandar) * 100 : 0
    let nilai = 0

    if (persentaseImplementasi >= 80) nilai = 4
    else if (persentaseImplementasi >= 60) nilai = 3
    else if (persentaseImplementasi >= 40) nilai = 2
    else if (persentaseImplementasi > 0) nilai = 1

    console.log("Jumlah Standar:", jumlahStandar)
    console.log("Standar Terimplementasi:", standarTerimplementasi)
    console.log("Persentase Implementasi:", persentaseImplementasi)
    console.log("Score:", nilai)

    return {
      scores: [{ butir: 74, nilai }],
      scoreDetail: {
        jumlah_standar: jumlahStandar,
        standar_terimplementasi: standarTerimplementasi,
        persentase_implementasi: parseFloat(persentaseImplementasi.toFixed(2)),
      },
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      result.nama_standar_sn_dikti = PluginUtils.normalizeTextField(
        result.nama_standar_sn_dikti
      )
      result.tanggal_audit_mutu_internal_hh_bb_tttt =
        PluginUtils.normalizeTextField(
          result.tanggal_audit_mutu_internal_hh_bb_tttt
        )

      const booleanFields = [
        "ketersediaan_standar_p",
        "pelaksanaan_standar_p",
        "monitoring_evaluasi_dan_audit_mutu_internal_e",
        "umpan_balik_audit_mutu_internal_p",
        "tindak_lanjut_audit_mutu_internal_p",
      ]

      booleanFields.forEach((field) => {
        result[field] = this.parseBooleanField(result[field])
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (
        !item.nama_standar_sn_dikti ||
        item.nama_standar_sn_dikti.trim() === ""
      ) {
        errors.push(`Row ${index + 1}: Nama Standar harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const evaluasiDanPengendalianPlugin = new EvaluasiDanPengendalianPlugin()

export default evaluasiDanPengendalianPlugin
