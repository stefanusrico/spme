/**
 * Plugin khusus untuk section Evaluasi dan Pengendalian (Butir 9.a)
 */
import { processExcelDataBase } from "../utils/tableUtils"

const evaluasiDanPengendalianPlugin = {
  getInfo() {
    return {
      code: "9a",
      name: "Evaluasi dan Pengendalian Plugin",
      description: "Plugin for evaluating and controlling SPMI implementation",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isEvaluasiDanPengendalianSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    console.log("=== DEBUG: Detected Indices ===")
    console.table(detectedIndices)

    console.log("=== DEBUG: Raw Data ===")
    console.table(rawData)

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false
      const nonEmptyValues = row.filter((val) => val !== undefined && val !== null && val !== "")
      return nonEmptyValues.length > 1 // Minimal ada nama standar
    })

    const processedData = filteredData.map((row, index) => {
      return {
        key: `excel-<span class="math-inline">\{index \+ 1\}\-</span>{Date.now()}`,
        no: index + 1,
        selected: false,
        nama_standar_sn_dikti: row[1] || "",
        ketersediaan_standar_p: String(row[2]).trim().toUpperCase() === 'V',
        pelaksanaan_standar_p: String(row[3]).trim().toUpperCase() === 'V',
        monitoring_evaluasi_dan_audit_mutu_internal_e: String(row[4]).trim().toUpperCase() === 'V',
        umpan_balik_audit_mutu_internal_p: String(row[5]).trim().toUpperCase() === 'V',
        tindak_lanjut_audit_mutu_internal_p: String(row[6]).trim().toUpperCase() === 'V',
        tanggal_audit_mutu_internal_hh_bb_tttt: row[7] || "",
      }
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          initialTableData[tableCode] = existingData[tableCode]
        } else {
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  },

  calculateScore(data) {
    const allRows = data && data.allRows ? data.allRows : (Array.isArray(data) ? data : []);

    if (!allRows || allRows.length === 0) {
      return {
        scores: [{ butir: 74, nilai: 0 }],
        scoreDetail: { jumlah_standar: 0, standar_terimplementasi: 0, persentase_implementasi: 0 },
      };
    }

    const jumlahStandar = allRows.length;
    let standarTerimplementasi = 0;

    allRows.forEach(item => {
      let implementasiCount = 0;
      if (item.ketersediaan_standar_p) implementasiCount++;
      if (item.pelaksanaan_standar_p) implementasiCount++;
      if (item.monitoring_evaluasi_dan_audit_mutu_internal_e) implementasiCount++;
      if (item.umpan_balik_audit_mutu_internal_p) implementasiCount++;
      if (item.tindak_lanjut_audit_mutu_internal_p) implementasiCount++;

      if (implementasiCount >= 5) { // Asumsi semua aspek harus terpenuhi untuk dianggap terimplementasi penuh per standar
        standarTerimplementasi++;
      }
    });

    const persentaseImplementasi = jumlahStandar > 0 ? (standarTerimplementasi / jumlahStandar) * 100 : 0;
    let nilai = 0;

    if (persentaseImplementasi >= 80) nilai = 4;
    else if (persentaseImplementasi >= 60) nilai = 3;
    else if (persentaseImplementasi >= 40) nilai = 2;
    else if (persentaseImplementasi > 0) nilai = 1;

    return {
      scores: [
        { butir: 74, nilai }
      ],
      scoreDetail: {
        jumlah_standar: jumlahStandar,
        standar_terimplementasi: standarTerimplementasi,
        persentase_implementasi: parseFloat(persentaseImplementasi.toFixed(2)),
      },
    };
  },

  normalizeData(data) {
    return data.map((item) => ({
      ...item,
      ketersediaan_standar: Boolean(item.ketersediaan_standar_p),
      pelaksanaan_standar: Boolean(item.pelaksanaan_standar_p),
      monitoring_evaluasi_audit: Boolean(item.monitoring_evaluasi_dan_audit_mutu_internal_e),
      umpan_balik_audit: Boolean(item.umpan_balik_audit_mutu_internal_p),
      tindak_lanjut_audit: Boolean(item.tindak_lanjut_audit_mutu_internal_p),
    }))
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_standar_sn_dikti || item.nama_standar_sn_dikti.trim() === "") {
        errors.push(`Row ${index + 1}: Nama Standar harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: new Date().getTime(),
      selected: true,
    }))
  },
}

export default evaluasiDanPengendalianPlugin